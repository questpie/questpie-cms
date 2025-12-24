// builder/types.ts
import type {
	PgColumn,
	PgTableWithColumns,
	PgColumnBuilder,
} from "drizzle-orm/pg-core";
import type { BuildColumns, GetColumnData, SQL } from "drizzle-orm";
import type { Collection } from "#questpie/core/server/collection/builder/collection";

/**
 * Versioning configuration
 */
export interface CollectionVersioningOptions {
	enabled: boolean;
	maxVersions?: number; // default: 50
}

/**
 * Options for collection configuration
 */
export interface CollectionOptions {
	/**
	 * Whether to automatically add `createdAt` and `updatedAt` timestamp fields.
	 * @default true
	 */
	timestamps?: boolean;
	/**
	 * Whether to enable soft deletion with a `deletedAt` timestamp field.
	 * @default false
	 */
	softDelete?: boolean;
	/**
	 * Optional override for the database table name.
	 * If not specified, the collection name is used.
	 */
	tableName?: string;
	/**
	 * Versioning configuration
	 */
	versioning?: boolean | CollectionVersioningOptions;
}

/**
 * Relation configuration
 */
export type RelationType = "one" | "many" | "manyToMany" | "polymorphic";

export interface RelationConfig {
	type: RelationType;
	collection: string;
	fields?: PgColumn[];
	references?: string[];
	relationName?: string; // For linking corresponding relations
	onDelete?: "cascade" | "set null" | "restrict" | "no action";
	onUpdate?: "cascade" | "set null" | "restrict" | "no action";
	// Many-to-Many specific fields
	through?: string; // Junction table collection name
	sourceKey?: string; // Primary key on source table (default: "id")
	sourceField?: string; // Foreign key column in junction table pointing to source
	targetKey?: string; // Primary key on target table (default: "id")
	targetField?: string; // Foreign key column in junction table pointing to target
	// Polymorphic specific fields
	typeField?: PgColumn; // Column storing the type/collection name
	idField?: PgColumn; // Column storing the ID
	collections?: Record<string, string>; // Map of type values to collection names
}

export type CollectionBuilderRelationFn<
	TState extends CollectionBuilderState,
	TNewRelations extends Record<string, RelationConfig>,
> = (
	ctx: {
		table: InferTableWithColumns<
			TState["name"],
			NonLocalizedFields<TState["fields"], TState["localized"]>,
			undefined,
			TState["options"]
		>;
		i18n: I18nFieldAccessor<TState["fields"], TState["localized"]>;
	} & RelationVariant,
) => TNewRelations;

/**
 * Helper types for relation definition callback
 */
export interface RelationVariant {
	one: (
		collection: string,
		config: { fields: PgColumn[]; references: string[]; relationName?: string },
	) => RelationConfig;
	many: (
		collection: string,
		config?: { relationName?: string },
	) => RelationConfig;
	manyToMany: (
		collection: string,
		config: {
			through: string; // Junction table collection name
			sourceKey?: string; // Default: "id"
			sourceField: string; // FK in junction pointing to source
			targetKey?: string; // Default: "id"
			targetField: string; // FK in junction pointing to target
		},
	) => RelationConfig;
	polymorphic: (config: {
		typeField: PgColumn; // Column storing the collection name
		idField: PgColumn; // Column storing the ID
		collections: Record<string, string>; // Map of type values to collection names (e.g., { posts: "posts", products: "products" })
	}) => RelationConfig;
}

/**
 * Context for hooks and access control
 */
export interface HookContext<TRow = any> {
	db: any;
	row?: TRow;
	input?: any;
	locale?: string;
	user?: any; // Current authenticated user
}

/**
 * Access control context
 */
export interface AccessContext<TRow = any> {
	user?: any;
	row?: TRow;
	input?: any;
	db: any;
}

/**
 * Hook function type
 */
export type HookFunction<TRow = any> = (
	ctx: HookContext<TRow>,
) => Promise<void> | void;

/**
 * Collection lifecycle hooks
 * Each hook type can have multiple functions (executed in order)
 */
export interface CollectionHooks<TRow = any> {
	beforeCreate?: HookFunction[] | HookFunction;
	afterCreate?: HookFunction<TRow>[] | HookFunction<TRow>;
	beforeUpdate?: HookFunction<TRow>[] | HookFunction<TRow>;
	afterUpdate?: HookFunction<TRow>[] | HookFunction<TRow>;
	beforeDelete?: HookFunction<TRow>[] | HookFunction<TRow>;
	afterDelete?: HookFunction<TRow>[] | HookFunction<TRow>;
	beforeRead?: HookFunction[] | HookFunction;
	afterRead?: HookFunction<TRow>[] | HookFunction<TRow>;
	// Shorthand: runs on both create AND update
	beforeChange?: HookFunction<TRow>[] | HookFunction<TRow>;
	afterChange?: HookFunction<TRow>[] | HookFunction<TRow>;
}

/**
 * WHERE clause for filtering results based on access
 * Generic version - will be typed based on collection fields
 */
export type AccessWhere<TFields = any> =
	TFields extends Record<string, any>
		? {
				[K in keyof TFields]?: any; // Will be properly typed in implementation
			} & {
				AND?: AccessWhere<TFields>[];
				OR?: AccessWhere<TFields>[];
				NOT?: AccessWhere<TFields>;
			}
		: Record<string, any>;

/**
 * Access control function can return:
 * - boolean: true (allow all) or false (deny all)
 * - string: role name to check
 * - AccessWhere: query conditions to filter results (TYPE-SAFE!)
 */
export type AccessRule<TRow = any, TFields = any> =
	| boolean
	| string // Role name
	| ((
			ctx: AccessContext<TRow>,
	  ) =>
			| boolean
			| AccessWhere<TFields>
			| Promise<boolean | AccessWhere<TFields>>);

/**
 * Field-level access control
 */
export interface FieldAccess<TRow = any> {
	read?: AccessRule<TRow>;
	write?: AccessRule<TRow>;
}

/**
 * Collection access control configuration
 */
export interface CollectionAccess<TRow = any> {
	// Operation-level access
	// Can return boolean OR where conditions to filter results
	read?: AccessRule<TRow>;
	create?: AccessRule<TRow>;
	update?: AccessRule<TRow>;
	delete?: AccessRule<TRow>;

	// Optional: field-level access
	fields?: Record<string, FieldAccess<TRow>>;
}

/**
 * Main builder state that accumulates configuration through the chain
 * Using Drizzle-style single generic pattern for better type performance
 */
export type CollectionBuilderState<
	TName extends string = string,
	TFields extends Record<string, any> = Record<string, any>,
	TLocalized extends readonly any[] = readonly any[],
	TVirtuals extends Record<string, SQL> = Record<string, SQL>,
	TRelations extends Record<string, RelationConfig> = Record<
		string,
		RelationConfig
	>,
	TIndexes extends Record<string, any> = Record<string, any>,
	TTitle extends SQL | undefined = SQL | undefined,
	TOptions extends CollectionOptions = CollectionOptions,
	THooks extends CollectionHooks = CollectionHooks,
	TAccess extends CollectionAccess = CollectionAccess,
> = {
	name: TName;
	fields: TFields;
	localized: TLocalized;
	virtuals: TVirtuals;
	relations: TRelations;
	indexes: TIndexes;
	title: TTitle;
	options: TOptions;
	hooks: THooks;
	access: TAccess;
};

/**
 * Type helpers for extracting parts of the state
 */
export type ExtractName<TState extends CollectionBuilderState> = TState["name"];
export type ExtractFields<TState extends CollectionBuilderState> =
	TState["fields"];
export type ExtractLocalized<TState extends CollectionBuilderState> =
	TState["localized"];
export type ExtractVirtuals<TState extends CollectionBuilderState> =
	TState["virtuals"];
export type ExtractRelations<TState extends CollectionBuilderState> =
	TState["relations"];
export type ExtractIndexes<TState extends CollectionBuilderState> =
	TState["indexes"];
export type ExtractTitle<TState extends CollectionBuilderState> =
	TState["title"];
export type ExtractOptions<TState extends CollectionBuilderState> =
	TState["options"];
export type ExtractHooks<TState extends CollectionBuilderState> =
	TState["hooks"];
export type ExtractAccess<TState extends CollectionBuilderState> =
	TState["access"];

/**
 * Default empty state for a new collection
 */
export type EmptyCollectionState<TName extends string> = CollectionBuilderState<
	TName,
	{},
	[],
	{},
	{},
	{},
	undefined,
	{},
	{},
	{}
>;

/**
 * Any collection builder state (for type constraints)
 */
export type AnyCollectionState = CollectionBuilderState<
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

/**
 * Extract non-localized fields from field definitions
 */
export type NonLocalizedFields<
	TFields extends Record<string, any>,
	TLocalized extends ReadonlyArray<keyof TFields>,
> = Omit<TFields, TLocalized[number]>;

/**
 * Extract localized fields from field definitions
 */
export type LocalizedFields<
	TFields extends Record<string, any>,
	TLocalized extends ReadonlyArray<keyof TFields>,
> = Pick<TFields, TLocalized[number]>;

/**
 * Helper type to create i18n access object with SQL expressions
 * Maps each localized field to a SQL expression
 */
export type I18nFieldAccessor<
	TFields extends Record<string, any>,
	TLocalized extends ReadonlyArray<keyof TFields>,
> = {
	[K in TLocalized[number]]: SQL<GetColumnData<TFields[K]>>;
};

/**
 * Infer SQL result type from SQL<T>
 */
export type InferSQLType<T extends SQL> = T extends SQL<infer R> ? R : unknown;

export type BuildColumnType<T> =
	T extends PgColumnBuilder<infer C>
		? PgColumn<
				C & {
					tableName: string;
					name: string;
					isPrimaryKey: boolean;
					isAutoincrement: boolean;
					hasDefault: boolean;
					hasRuntimeDefault: boolean;
					enumValues: any;
					notNull: boolean;
				}
			>
		: T;

export type InferColumnsFromFields<
	TFields extends Record<string, any>,
	TOptions extends CollectionOptions,
	TTitle extends SQL | undefined,
> = ReturnType<typeof Collection.pkCols> & {
	[K in keyof TFields]: BuildColumnType<TFields[K]>;
} & (TOptions["timestamps"] extends false
		? {}
		: ReturnType<typeof Collection.timestampsCols>) &
	(TOptions["softDelete"] extends true
		? ReturnType<typeof Collection.softDeleteCols>
		: {}) &
	(TTitle extends SQL ? ReturnType<typeof Collection._titleCols> : {});

/**
 * Infer table type from fields (excluding localized fields)
 * This builds the Drizzle PgTable type progressively
 */
export type InferTableWithColumns<
	TName extends string,
	TFields extends Record<string, any>,
	TTitle extends SQL | undefined,
	TOptions extends CollectionOptions,
> = PgTableWithColumns<{
	name: TName;
	schema: undefined;
	columns: BuildColumns<
		TName,
		InferColumnsFromFields<TFields, TOptions, TTitle>,
		"pg"
	>;
	dialect: "pg";
}>;
export type LocalizedTableName<TName extends string> = `${TName}_i18n`;
