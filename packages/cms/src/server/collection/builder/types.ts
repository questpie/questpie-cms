// builder/types.ts
import type { Collection } from "#questpie/cms/server/collection/builder/collection";
import type { SearchableConfig } from "#questpie/cms/server/integrated/search";
import type { FunctionDefinition } from "#questpie/cms/server/functions/types";
import type { AccessMode } from "#questpie/cms/server/config/types";
import type {
	BuildColumns,
	BuildExtraConfigColumns,
	GetColumnData,
	SQL,
} from "drizzle-orm";
import type { PgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";
import type { ValidationSchemas } from "#questpie/cms/server/collection/builder/validation-helpers";

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
	 * Whether to automatically add `createdAt` and `updatedAt` timestamp fields
	 * @default true
	 */
	timestamps?: boolean;
	/**
	 * Whether to enable soft deletion with a `deletedAt` timestamp field.
	 * @default false
	 */
	softDelete?: boolean;
	/**
	 * Versioning configuration
	 */
	versioning?: boolean | CollectionVersioningOptions;
}

/**
 * Relation configuration
 */
export type RelationType = "one" | "many" | "manyToMany";

export interface RelationConfig {
	type: RelationType;
	collection: string;
	fields?: PgColumn[];
	references: string[];
	relationName?: string; // For linking corresponding relations
	onDelete?: "cascade" | "set null" | "restrict" | "no action";
	onUpdate?: "cascade" | "set null" | "restrict" | "no action";
	// Many-to-Many specific fields
	through?: string; // Junction table collection name
	sourceKey?: string; // Primary key on source table (default: "id")
	sourceField?: string; // Foreign key column in junction table pointing to source
	targetKey?: string; // Primary key on target table (default: "id")
	targetField?: string; // Foreign key column in junction table pointing to target
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
 * Context for virtuals callback
 */
export type CollectionBuilderVirtualsFn<
	TState extends CollectionBuilderState,
	TNewVirtuals extends Record<string, SQL> | undefined,
> = (ctx: {
	table: InferTableWithColumns<
		TState["name"],
		NonLocalizedFields<TState["fields"], TState["localized"]>,
		undefined,
		TState["options"]
	>;
	i18n: I18nFieldAccessor<TState["fields"], TState["localized"]>;
	context: any;
}) => TNewVirtuals;

/**
 * Context for title callback
 */
export type CollectionBuilderTitleFn<
	TState extends CollectionBuilderState,
	TNewTitle extends SQL | undefined,
> = (ctx: {
	table: InferTableWithColumns<
		TState["name"],
		NonLocalizedFields<TState["fields"], TState["localized"]>,
		undefined,
		TState["options"]
	>;
	i18n: I18nFieldAccessor<TState["fields"], TState["localized"]>;
	context: any;
}) => TNewTitle;

/**
 * Context for indexes callback
 */
export type CollectionBuilderIndexesFn<
	TState extends CollectionBuilderState,
	TNewIndexes extends Record<string, any>,
> = (ctx: {
	table: BuildExtraConfigColumns<
		TState["name"],
		InferColumnsFromFields<
			TState["fields"],
			TState["options"],
			TState["title"]
		>,
		"pg"
	>;
}) => TNewIndexes;

/**
 * Helper types for relation definition callback
 */
export interface RelationVariant {
	one: <C extends string>(
		collection: C,
		config: { fields: PgColumn[]; references: string[]; relationName?: string },
	) => RelationConfig & { type: "one"; collection: C };
	many: <C extends string>(
		collection: C,
		config?: {
			relationName?: string;
			onDelete?: "cascade" | "set null" | "restrict" | "no action";
			onUpdate?: "cascade" | "set null" | "restrict" | "no action";
		},
	) => RelationConfig & { type: "many"; collection: C };
	manyToMany: <C extends string>(
		collection: C,
		config: {
			through: string; // Junction table collection name
			sourceKey?: string; // Default: "id"
			sourceField: string; // FK in junction pointing to source
			targetKey?: string; // Default: "id"
			targetField: string; // FK in junction pointing to target
			onDelete?: "cascade" | "set null" | "restrict" | "no action";
			onUpdate?: "cascade" | "set null" | "restrict" | "no action";
		},
	) => RelationConfig & { type: "manyToMany"; collection: C };
}

/**
 * Base context for hooks - receives full CMS access
 * @template TData - The record data type (created/updated/deleted)
 * @template TOriginal - The original record type (for update/delete operations), use `never` if not available
 * @template TOperation - The operation type
 * @template TCMS - The CMS type for full type safety
 */
export interface HookContext<
	TData = any,
	TOriginal = any,
	TOperation extends "create" | "update" | "delete" | "read" =
		| "create"
		| "update"
		| "delete"
		| "read",
	TCMS = any,
> {
	/**
	 * The record data (created/updated record)
	 */
	data: TData;

	/**
	 * Original record (only available for update operations in afterChange/afterRead hooks)
	 */
	original: TOriginal extends never ? never : TOriginal | undefined;

	/**
	 * Current authenticated user (from request context)
	 */
	user?: any;

	/**
	 * Current locale
	 */
	locale?: string;

	/**
	 * Access mode (system or user)
	 */
	accessMode?: AccessMode;

	/**
	 * Operation type (specific to hook)
	 */
	operation: TOperation;

	/**
	 * Full CMS instance - type-safe access to all services and collections
	 * Example: cms.queue["job-name"].publish(...), cms.email.send(...), cms.logger.info(...)
	 * For ergonomic typing without generic params, use getCMSFromContext().
	 */
	cms: TCMS;

	/**
	 * Database client (for advanced use cases)
	 */
	db?: any;

	/**
	 * Legacy input field (deprecated, use data instead)
	 * @deprecated Use data instead
	 */
	input?: any;

	/**
	 * Legacy row field (deprecated, use data instead)
	 * @deprecated Use data instead
	 */
	row?: TData;
}

/**
 * Access control context
 */
export interface AccessContext<TRow = any> {
	user?: any;
	row?: TRow;
	input?: any;
	db: any;
	context?: any;
}

/**
 * Hook function type
 * Receives full CMS context with specific operation type
 * @template TData - The record data type
 * @template TOriginal - The original record type (for update/delete operations)
 * @template TOperation - The operation type
 * @template TCMS - The CMS type for full type safety
 */
export type HookFunction<
	TData = any,
	TOriginal = any,
	TOperation extends "create" | "update" | "delete" | "read" =
		| "create"
		| "update"
		| "delete"
		| "read",
	TCMS = any,
> = (
	ctx: HookContext<TData, TOriginal, TOperation, TCMS>,
) => Promise<void> | void;

/**
 * BeforeOperation hook - runs before any operation
 * @property data - Input data (TInsert for create, TUpdate for update, TSelect for read/delete)
 * @property original - Not available
 * @property operation - "create" | "update" | "delete" | "read"
 */
export type BeforeOperationHook<
	TSelect = any,
	TInsert = any,
	TUpdate = any,
	TCMS = any,
> = HookFunction<
	TInsert | TUpdate | TSelect,
	never,
	"create" | "update" | "delete" | "read",
	TCMS
>;

/**
 * BeforeValidate hook - runs before validation on create/update
 * @property data - Mutable input data (TInsert on create, TUpdate on update)
 * @property original - Not available
 * @property operation - "create" | "update"
 * @remarks Use this to transform/normalize input before validation
 */
export type BeforeValidateHook<
	_TSelect = any,
	TInsert = any,
	TUpdate = any,
	TCMS = any,
> = HookFunction<TInsert | TUpdate, never, "create" | "update", TCMS>;

/**
 * BeforeChange hook - runs before create/update (after validation)
 * @property data - Validated input data (TInsert on create, TUpdate on update)
 * @property original - Not available
 * @property operation - "create" | "update"
 * @remarks Use this for business logic, slug generation, complex validation
 */
export type BeforeChangeHook<
	_TSelect = any,
	TInsert = any,
	TUpdate = any,
	TCMS = any,
> = HookFunction<TInsert | TUpdate, never, "create" | "update", TCMS>;

/**
 * AfterChange hook - runs after create/update operations
 * @property data - Complete record (TSelect)
 * @property original - Original record (TSelect) - only available on update operations
 * @property operation - "create" | "update"
 * @remarks Use this for notifications, webhooks, syncing to external services
 */
export type AfterChangeHook<TSelect = any, TCMS = any> = HookFunction<
	TSelect,
	TSelect | undefined,
	"create" | "update",
	TCMS
>;

/**
 * BeforeRead hook - runs before read operations
 * @property data - Query context/options (implementation specific)
 * @property original - Not available
 * @property operation - "read"
 * @remarks Use this to modify query options or add filters
 */
export type BeforeReadHook<TSelect = any, TCMS = any> = HookFunction<
	TSelect,
	never,
	"read",
	TCMS
>;

/**
 * AfterRead hook - runs after any operation that returns data
 * @property data - Complete record (TSelect)
 * @property original - Original record (TSelect) - only available on update operations
 * @property operation - "create" | "update" | "delete" | "read"
 * @remarks Use this to transform output, add computed fields, format data
 */
export type AfterReadHook<TSelect = any, TCMS = any> = HookFunction<
	TSelect,
	TSelect | undefined,
	"create" | "update" | "delete" | "read",
	TCMS
>;

/**
 * BeforeDelete hook - runs before delete operations
 * @property data - Record to be deleted (TSelect)
 * @property original - Not available
 * @property operation - "delete"
 * @remarks Use this to prevent deletion, cascade deletes, create backups
 */
export type BeforeDeleteHook<TSelect = any, TCMS = any> = HookFunction<
	TSelect,
	never,
	"delete",
	TCMS
>;

/**
 * AfterDelete hook - runs after delete operations
 * @property data - Deleted record (TSelect)
 * @property original - Not available
 * @property operation - "delete"
 * @remarks Use this for cleanup, logging, notifying users
 */
export type AfterDeleteHook<TSelect = any, TCMS = any> = HookFunction<
	TSelect,
	never,
	"delete",
	TCMS
>;

/**
 * Collection lifecycle hooks
 * Each hook type can have multiple functions (executed in order)
 *
 * Hook execution order:
 * - Create: beforeOperation → beforeValidate → beforeChange → [DB INSERT] → afterChange → afterRead
 * - Update: beforeOperation → beforeValidate → beforeChange → [DB UPDATE] → afterChange → afterRead
 * - Delete: beforeOperation → beforeDelete → [DB DELETE] → afterDelete → afterRead
 * - Read: beforeOperation → beforeRead → [DB SELECT] → afterRead
 *
 * @template TSelect - The complete record type (after read)
 * @template TInsert - The insert data type
 * @template TUpdate - The update data type
 * @template TCMS - The CMS type for full type safety in hooks
 */
export interface CollectionHooks<
	TSelect = any,
	TInsert = any,
	TUpdate = any,
	TCMS = any,
> {
	/**
	 * Runs before any operation (create/update/delete/read)
	 *
	 * **Available fields:**
	 * - `data`: Input data (type depends on operation)
	 * - `original`: Not available
	 * - `operation`: "create" | "update" | "delete" | "read"
	 *
	 * **Use cases:** logging, rate limiting, early validation
	 */
	beforeOperation?:
		| BeforeOperationHook<TSelect, TInsert, TUpdate, TCMS>[]
		| BeforeOperationHook<TSelect, TInsert, TUpdate, TCMS>;

	/**
	 * Runs before validation on create/update operations
	 *
	 * **Available fields:**
	 * - `data`: Mutable input data (TInsert on create, TUpdate on update)
	 * - `original`: Not available
	 * - `operation`: "create" | "update"
	 *
	 * **Use cases:** transforming input, setting defaults, normalizing data
	 *
	 * @example
	 * ```ts
	 * beforeValidate: ({ data, operation }) => {
	 *   if (operation === 'create' && !data.slug) {
	 *     data.slug = slugify(data.title);
	 *   }
	 * }
	 * ```
	 */
	beforeValidate?:
		| BeforeValidateHook<TSelect, TInsert, TUpdate, TCMS>[]
		| BeforeValidateHook<TSelect, TInsert, TUpdate, TCMS>;

	/**
	 * Runs before create/update operations (after validation)
	 *
	 * **Available fields:**
	 * - `data`: Validated input data (TInsert on create, TUpdate on update)
	 * - `original`: Not available
	 * - `operation`: "create" | "update"
	 *
	 * **Use cases:** business logic, complex validation, derived fields
	 *
	 * @example
	 * ```ts
	 * beforeChange: ({ data, operation, cms }) => {
	 *   if (operation === 'create') {
	 *     data.createdBy = cms.context.user?.id;
	 *   }
	 * }
	 * ```
	 */
	beforeChange?:
		| BeforeChangeHook<TSelect, TInsert, TUpdate, TCMS>[]
		| BeforeChangeHook<TSelect, TInsert, TUpdate, TCMS>;

	/**
	 * Runs after create/update operations
	 *
	 * **Available fields:**
	 * - `data`: Complete record (TSelect)
	 * - `original`: Original record (TSelect) - **only on update**
	 * - `operation`: "create" | "update"
	 *
	 * **Use cases:** notifications, webhooks, syncing to external services
	 *
	 * @example
	 * ```ts
	 * afterChange: async ({ data, original, operation, cms }) => {
	 *   if (operation === 'update' && original) {
	 *     if (data.status !== original.status) {
	 *       await cms.queue['status-change'].publish({ id: data.id });
	 *     }
	 *   }
	 * }
	 * ```
	 */
	afterChange?:
		| AfterChangeHook<TSelect, TCMS>[]
		| AfterChangeHook<TSelect, TCMS>;

	/**
	 * Runs before read operations
	 *
	 * **Available fields:**
	 * - `data`: Query context/options
	 * - `original`: Not available
	 * - `operation`: "read"
	 *
	 * **Use cases:** modifying query options, adding filters
	 */
	beforeRead?: BeforeReadHook<TSelect, TCMS>[] | BeforeReadHook<TSelect, TCMS>;

	/**
	 * Runs after any operation that returns data
	 *
	 * **Available fields:**
	 * - `data`: Complete record (TSelect)
	 * - `original`: Original record (TSelect) - **only on update**
	 * - `operation`: "create" | "update" | "delete" | "read"
	 *
	 * **Use cases:** transforming output, adding computed fields, formatting
	 *
	 * @example
	 * ```ts
	 * afterRead: ({ data }) => {
	 *   // Add computed field
	 *   data.displayName = `${data.firstName} ${data.lastName}`;
	 * }
	 * ```
	 */
	afterRead?: AfterReadHook<TSelect, TCMS>[] | AfterReadHook<TSelect, TCMS>;

	/**
	 * Runs before delete operations
	 *
	 * **Available fields:**
	 * - `data`: Record to be deleted (TSelect)
	 * - `original`: Not available
	 * - `operation`: "delete"
	 *
	 * **Use cases:** preventing deletion, cascading deletes, creating backups
	 *
	 * @example
	 * ```ts
	 * beforeDelete: async ({ data, cms }) => {
	 *   // Prevent deletion if has active relations
	 *   const hasOrders = await cms.db.select().from(orders)
	 *     .where(eq(orders.userId, data.id));
	 *   if (hasOrders.length > 0) {
	 *     throw new Error('Cannot delete user with active orders');
	 *   }
	 * }
	 * ```
	 */
	beforeDelete?:
		| BeforeDeleteHook<TSelect, TCMS>[]
		| BeforeDeleteHook<TSelect, TCMS>;

	/**
	 * Runs after delete operations
	 *
	 * **Available fields:**
	 * - `data`: Deleted record (TSelect)
	 * - `original`: Not available
	 * - `operation`: "delete"
	 *
	 * **Use cases:** cleanup, logging, notifying users
	 *
	 * @example
	 * ```ts
	 * afterDelete: async ({ data, cms }) => {
	 *   await cms.queue['user-deleted'].publish({ userId: data.id });
	 * }
	 * ```
	 */
	afterDelete?:
		| AfterDeleteHook<TSelect, TCMS>[]
		| AfterDeleteHook<TSelect, TCMS>;
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

export type CollectionFunctionsMap = Record<string, FunctionDefinition>;

/**
 * Main builder state that accumulates configuration through the chain
 * Using Drizzle-style single generic pattern for better type performance
 */
/**
 * Collection builder state - simplified interface
 * Type inference happens from builder usage, not from explicit generics
 */
export interface CollectionBuilderState {
	name: string;
	fields: Record<string, any>; // Allow any Drizzle column type
	localized: readonly any[];
	virtuals: Record<string, SQL> | undefined;
	relations: Record<string, RelationConfig>;
	indexes: Record<string, any>;
	title: SQL | undefined;
	options: CollectionOptions;
	hooks: CollectionHooks<any, any, any, any>;
	access: CollectionAccess;
	functions: CollectionFunctionsMap;
	searchable: SearchableConfig | undefined;
	validation: ValidationSchemas | undefined;
}

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
export type ExtractFunctions<TState extends CollectionBuilderState> =
	TState["functions"];

/**
 * Default empty state for a new collection
 */
export type EmptyCollectionState<TName extends string> =
	CollectionBuilderState & {
		name: TName;
		fields: {};
		localized: [];
		virtuals: undefined;
		relations: {};
		indexes: {};
		title: undefined;
		options: {};
		hooks: CollectionHooks<any, any, any, any>;
		access: {};
		functions: {};
		searchable: undefined;
		validation: undefined;
	};

/**
 * Any collection builder state (for type constraints)
 */
export type AnyCollectionState = CollectionBuilderState;

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

export type InferColumnsFromFields<
	// TName extends string,
	TFields extends Record<string, any>,
	TOptions extends CollectionOptions,
	_TTitle extends SQL | undefined,
> = ReturnType<typeof Collection.pkCols> & {
	[K in keyof TFields]: TFields[K];
} & (TOptions["timestamps"] extends false
		? {}
		: ReturnType<typeof Collection.timestampsCols>) &
	(TOptions["softDelete"] extends true
		? ReturnType<typeof Collection.softDeleteCols>
		: {});

export type InferVersionColumnFromFields<
	// TName extends string,
	TFields extends Record<string, any>,
	_TTitle extends SQL | undefined,
> = ReturnType<typeof Collection.versionCols> & {
	[K in keyof TFields]: TFields[K];
};
export type InferI18nVersionColumnFromFields<
	// TName extends string,
	TFields extends Record<string, any>,
	_TTitle extends SQL | undefined,
> = ReturnType<typeof Collection.i18nVersionCols> & {
	[K in keyof TFields]: TFields[K];
};

export type LocalizedTableName<TName extends string> = `${TName}_i18n`;
export type VersionedTableName<TName extends string> = `${TName}_versions`;
export type I18nVersionedTableName<TName extends string> =
	`${TName}_i18n_versions`;

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

export type InferI18nTableWithColumns<
	TName extends string,
	TFields extends Record<string, any>,
	TTitle extends SQL | undefined,
> = PgTableWithColumns<{
	name: LocalizedTableName<TName>;
	schema: undefined;
	columns: BuildColumns<
		LocalizedTableName<TName>,
		InferColumnsFromFields<TFields, {}, TTitle>,
		"pg"
	>;
	dialect: "pg";
}>;

export type InferVersionedTableWithColumns<
	TName extends string,
	TFields extends Record<string, any>,
	TTitle extends SQL | undefined,
> = PgTableWithColumns<{
	name: VersionedTableName<TName>;
	schema: undefined;
	columns: BuildColumns<
		VersionedTableName<TName>,
		InferVersionColumnFromFields<TFields, TTitle>,
		"pg"
	>;
	dialect: "pg";
}>;

export type InferI18nVersionedTableWithColumns<
	TName extends string,
	TFields extends Record<string, any>,
	TTitle extends SQL | undefined,
> = PgTableWithColumns<{
	name: I18nVersionedTableName<TName>;
	schema: undefined;
	columns: BuildColumns<
		I18nVersionedTableName<TName>,
		InferI18nVersionColumnFromFields<TFields, TTitle>,
		"pg"
	>;
	dialect: "pg";
}>;
