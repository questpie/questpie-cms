// builder/collection.ts

import type {
	Column,
	GetColumnData,
	InferInsertModel,
	InferSelectModel,
	SQL,
} from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import {
	bigint,
	bigserial,
	char,
	index,
	integer,
	jsonb,
	pgTable,
	serial,
	smallint,
	smallserial,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import type {
	CollectionBuilderIndexesFn,
	CollectionBuilderRelationFn,
	CollectionBuilderState,
	CollectionBuilderTitleFn,
	CollectionBuilderVirtualsFn,
	I18nFieldAccessor,
	InferI18nTableWithColumns,
	InferI18nVersionedTableWithColumns,
	InferSQLType,
	InferTableWithColumns,
	InferVersionedTableWithColumns,
	LocalizedFields,
	LocalizedTableName,
	NonLocalizedFields,
	RelationVariant,
	TitleExpression,
} from "#questpie/server/collection/builder/types.js";
import { createCollectionValidationSchemas } from "#questpie/server/collection/builder/validation-helpers.js";
import { CRUDGenerator } from "#questpie/server/collection/crud/index.js";
import type { CRUD } from "#questpie/server/collection/crud/types.js";
import { DEFAULT_LOCALE } from "#questpie/shared/constants.js";
import type { Prettify } from "#questpie/shared/type-utils.js";

// ... (Infer types skipped for brevity if not changing) ...
/**
 * Infer select type from Collection
 * Combines: Drizzle table $inferSelect + virtual fields + _title + localized fields + output extensions
 */
type InferCollectionSelect<
	TTable extends PgTable,
	TFields extends Record<string, any>,
	TLocalized extends ReadonlyArray<keyof TFields>,
	TVirtuals extends Record<string, SQL> | undefined,
	TTitle extends TitleExpression | undefined,
	TOutput extends Record<string, any> | undefined = undefined,
> = Prettify<
	InferSelectModel<TTable> &
		(TVirtuals extends Record<string, SQL>
			? {
					[K in keyof TVirtuals]: InferSQLType<TVirtuals[K]>;
				}
			: Record<never, never>) &
		(TLocalized[number] extends never
			? Record<never, never>
			: {
					[K in TLocalized[number]]: GetColumnData<TFields[K]>;
				}) & { _title: string } & (TOutput extends Record<string, any> // Always include _title (fallback to id when no title defined)
			? TOutput
			: Record<never, never>)
>;

/**
 * Infer insert type from Collection
 * Uses Drizzle's $inferInsert + adds localized fields
 */
type InferCollectionInsert<
	TTable extends PgTable,
	TFields extends Record<string, any>,
	TLocalized extends ReadonlyArray<keyof TFields>,
> = Prettify<
	InferInsertModel<TTable> &
		(TLocalized[number] extends never
			? Record<never, never>
			: {
					// Localized fields are optional on insert (default locale)
					[K in TLocalized[number]]?: GetColumnData<TFields[K]>;
				})
>;

/**
 * Infer update type from Collection
 * Partial of $inferInsert + localized fields
 */
type InferCollectionUpdate<
	TTable extends PgTable,
	TFields extends Record<string, any>,
	TLocalized extends ReadonlyArray<keyof TFields>,
> = Prettify<
	Partial<InferInsertModel<TTable>> &
		(TLocalized[number] extends never
			? Record<never, never>
			: {
					[K in TLocalized[number]]?: GetColumnData<TFields[K]>;
				})
>;

// Re-export for convenience
export type { CollectionBuilder } from "./collection-builder.js";

export type CollectionSelect<TState extends CollectionBuilderState> =
	InferCollectionSelect<
		InferTableWithColumns<
			TState["name"],
			NonLocalizedFields<TState["fields"], TState["localized"]>,
			TState["title"],
			TState["options"]
		>,
		TState["fields"],
		TState["localized"],
		TState["virtuals"],
		TState["title"],
		TState["output"]
	>;

export type CollectionInsert<TState extends CollectionBuilderState> =
	InferCollectionInsert<
		InferTableWithColumns<
			TState["name"],
			NonLocalizedFields<TState["fields"], TState["localized"]>,
			TState["title"],
			TState["options"]
		>,
		TState["fields"],
		TState["localized"]
	>;

export type CollectionUpdate<TState extends CollectionBuilderState> =
	InferCollectionUpdate<
		InferTableWithColumns<
			TState["name"],
			NonLocalizedFields<TState["fields"], TState["localized"]>,
			TState["title"],
			TState["options"]
		>,
		TState["fields"],
		TState["localized"]
	>;

/**
 * Default ID column factory - creates a text column with gen_random_uuid() default
 */
const defaultIdColumn = () =>
	text("id").primaryKey().default(sql`gen_random_uuid()`);

/**
 * Helper to get column config from a Drizzle column
 */
function getColumnConfig(column: PgColumn): any {
	return (column as any).config || {};
}

/**
 * Creates a column of the same type as the source column but with a different name.
 * Used for creating foreign key columns that match the parent table's ID type.
 *
 * @param sourceColumn - The source column to clone the type from
 * @param newName - The name for the new column
 * @returns A new column with the same type but different name
 */
function cloneColumnType(sourceColumn: PgColumn, newName: string) {
	const config = getColumnConfig(sourceColumn);
	const columnType = config.columnType || sourceColumn.constructor.name;

	switch (columnType) {
		case "PgUUID":
			return uuid(newName);
		case "PgText":
			return text(newName);
		case "PgVarchar":
			return varchar(newName, { length: config.length });
		case "PgChar":
			return char(newName, { length: config.length });
		case "PgInteger":
			return integer(newName);
		case "PgSerial":
			// Serial becomes integer for FK (serial is just auto-increment integer)
			return integer(newName);
		case "PgSmallInt":
			return smallint(newName);
		case "PgSmallSerial":
			return smallint(newName);
		case "PgBigInt53":
		case "PgBigInt64":
			return bigint(newName, { mode: config.mode || "number" });
		case "PgBigSerial53":
		case "PgBigSerial64":
			return bigint(newName, { mode: config.mode || "number" });
		default:
			// Fallback to text if unknown type
			return text(newName);
	}
}

/**
 * Check if a column is a JSONB type
 * JSONB fields marked as localized don't get their own column in the i18n table.
 * Instead, their localized values (from $i18n wrappers) go to the _localized column.
 *
 * @param column - The column to check
 * @returns True if the column is a JSONB type
 */
function isJsonbColumn(column: any): boolean {
	const config = getColumnConfig(column);
	const columnType = config.columnType || column?.constructor?.name;
	return columnType === "PgJsonb" || columnType === "PgJson";
}

/**
 * Localization mode for fields
 * - 'whole': Entire value (or JSONB object) is stored per locale in i18n table
 * - 'nested': JSONB contains { $i18n: value } wrappers, values extracted to _localized column
 */
type LocalizationMode = "whole" | "nested";

/**
 * Parse a localized field name to extract field name and mode.
 * Supports syntax: "fieldName" (default whole) or "fieldName:nested"
 *
 * @param localizedField - Field name or field name with :nested suffix
 * @returns Object with field name and localization mode
 */
function parseLocalizedField(localizedField: string): {
	name: string;
	mode: LocalizationMode;
} {
	if (localizedField.endsWith(":nested")) {
		return {
			name: localizedField.slice(0, -7), // Remove ":nested"
			mode: "nested",
		};
	}
	return {
		name: localizedField,
		mode: "whole",
	};
}

/**
 * Get localization mode for a specific field name.
 * Searches the localized array for the field name with optional :nested suffix.
 *
 * @param localizedArray - Array of localized field names (possibly with :nested suffix)
 * @param fieldName - The field name to look up
 * @returns Localization mode ('whole' or 'nested') if field is localized, null otherwise
 */
function getLocalizedFieldMode(
	localizedArray: readonly string[],
	fieldName: string,
): LocalizationMode | null {
	for (const localizedField of localizedArray) {
		const parsed = parseLocalizedField(localizedField);
		if (parsed.name === fieldName) {
			return parsed.mode;
		}
	}
	return null;
}

/**
 * Final Collection class - the result of build()
 * Contains the generated tables, types, and CRUD operations
 * Uses single generic state pattern for better type performance
 */
export class Collection<TState extends CollectionBuilderState> {
	/**
	 * @deprecated Use defaultIdColumn() instead. This is kept for backwards compatibility.
	 */
	static readonly pkCols = () => ({
		id: defaultIdColumn(),
	});

	static readonly timestampsCols = () => ({
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
	});

	static readonly softDeleteCols = () => ({
		deletedAt: timestamp("deleted_at", { mode: "date" }),
	});

	/**
	 * Creates version table columns with ID type matching the parent table
	 * @param parentIdColumn - The ID column from the parent table to match type
	 */
	static readonly versionCols = (parentIdColumn?: PgColumn) => ({
		// primary key of a version table - always uses default ID type
		versionId: text("version_id")
			.primaryKey()
			.default(sql<string>`gen_random_uuid()`),
		// reference to the main record - matches parent ID type
		id: parentIdColumn
			? cloneColumnType(parentIdColumn, "id").notNull()
			: text("id").notNull(),
		versionNumber: integer("version_number").notNull(),
		versionOperation: text("version_operation").notNull(), // 'create' | 'update' | 'delete'
		versionUserId: text("version_user_id"), // Nullable if unknown
		versionCreatedAt: timestamp("version_created_at", { mode: "date" })
			.defaultNow()
			.notNull(),
	});

	/**
	 * Creates i18n version table columns with ID type matching the parent table
	 * @param parentIdColumn - The ID column from the parent table to match type
	 */
	static readonly i18nVersionCols = (parentIdColumn?: PgColumn) => ({
		id: text("id").primaryKey().default(sql`gen_random_uuid()`),
		parentId: parentIdColumn
			? cloneColumnType(parentIdColumn, "parent_id").notNull()
			: text("parent_id").notNull(),
		versionNumber: integer("version_number").notNull(),
		locale: text("locale").notNull(),
	});

	/**
	 * Creates i18n table columns with ID type matching the parent table
	 * @param parentIdColumn - The ID column from the parent table to match type
	 */
	static readonly i18nCols = (parentIdColumn?: PgColumn) => ({
		id: text("id").primaryKey().default(sql`gen_random_uuid()`),
		parentId: parentIdColumn
			? cloneColumnType(parentIdColumn, "parent_id").notNull()
			: text("parent_id").notNull(),
		locale: text("locale").notNull(),
		// Nested localized values from $i18n wrappers in any field
		_localized: jsonb("_localized"),
	});

	static readonly uploadCols = () => ({
		key: varchar("key", { length: 255 }).notNull(),
		filename: varchar("filename", { length: 255 }).notNull(),
		mimeType: varchar("mime_type", { length: 100 }).notNull(),
		size: integer("size").notNull(),
		visibility: varchar("visibility", {
			length: 20,
			enum: ["public", "private"] as const,
		})
			.notNull()
			.default("public"),
	});

	public readonly name: TState["name"];
	public readonly table: InferTableWithColumns<
		TState["name"],
		NonLocalizedFields<TState["fields"], TState["localized"]>,
		TState["title"],
		TState["options"]
	>;
	public readonly i18nTable: TState["localized"][number] extends never
		? null
		: InferI18nTableWithColumns<
				LocalizedTableName<TState["name"]>,
				LocalizedFields<TState["fields"], TState["localized"]>,
				TState["title"]
			>;
	public readonly versionsTable: TState["options"]["versioning"] extends true
		? InferVersionedTableWithColumns<
				TState["name"],
				NonLocalizedFields<TState["fields"], TState["localized"]>,
				TState["title"]
			>
		: null;
	public readonly i18nVersionsTable: TState["localized"][number] extends never
		? null
		: TState["options"]["versioning"] extends true
			? InferI18nVersionedTableWithColumns<
					TState["name"],
					LocalizedFields<TState["fields"], TState["localized"]>,
					TState["title"]
				>
			: null;

	public readonly state: TState;

	/**
	 * Type inference helper
	 * Access with: collection.$infer.select, collection.$infer.insert, etc.
	 */
	public readonly $infer!: {
		select: CollectionSelect<TState>;
		insert: CollectionInsert<TState>;
		update: CollectionUpdate<TState>;
	};

	constructor(
		state: TState,
		private readonly virtualsFn?: CollectionBuilderVirtualsFn<
			TState,
			TState["virtuals"]
		>,
		private readonly relationsFn?: CollectionBuilderRelationFn<TState, any>,
		readonly indexesFn?: CollectionBuilderIndexesFn<TState, TState["indexes"]>,
	) {
		this.state = state;
		this.name = state.name;

		// Build the main table
		this.table = this.generateMainTable(indexesFn) as any;

		// Build the i18n table if there are localized fields
		this.i18nTable = this.generateI18nTable() as any;

		// Build the versions table
		this.versionsTable = this.generateVersionsTable() as any;
		this.i18nVersionsTable = this.generateI18nVersionsTable() as any;

		// Auto-generate validation schemas if not explicitly provided
		// This ensures .notNull() fields are validated before database insert
		if (!state.validation) {
			const localizedFieldNames = new Set(state.localized as readonly string[]);
			const mainFields: Record<string, any> = {};
			const localizedFields: Record<string, any> = {};

			// Include auto-generated ID field if user didn't define one
			// This ensures the validation schema accepts custom IDs during create
			const hasUserDefinedId = "id" in state.fields;
			if (!hasUserDefinedId) {
				mainFields.id = defaultIdColumn();
			}

			for (const [key, column] of Object.entries(state.fields)) {
				if (localizedFieldNames.has(key)) {
					localizedFields[key] = column;
				} else {
					mainFields[key] = column;
				}
			}

			// Include system fields in validation schema so internal operations
			// (like restore) can update them
			if (state.options.timestamps !== false) {
				Object.assign(mainFields, Collection.timestampsCols());
			}
			if (state.options.softDelete) {
				Object.assign(mainFields, Collection.softDeleteCols());
			}

			state.validation = createCollectionValidationSchemas(
				state.name,
				mainFields,
				localizedFields,
			) as any;
		}

		// Ensure virtuals is always initialized
		if (!state.virtuals) {
			state.virtuals = {} as TState["virtuals"];
		}

		// Execute virtual fields function now that we have the table
		if (virtualsFn) {
			const context = {
				defaultLocale:
					(this.state.options as any).defaultLocale || DEFAULT_LOCALE,
			};
			const i18nAccessor = this.createI18nAccessor(context);
			state.virtuals = virtualsFn({
				table: this.table,
				i18n: i18nAccessor,
				context,
			}) as TState["virtuals"];
		}

		// Execute relations function
		if (relationsFn) {
			const context = {
				defaultLocale:
					(this.state.options as any).defaultLocale || DEFAULT_LOCALE,
			};
			const i18nAccessor = this.createI18nAccessor(context);

			const helpers: RelationVariant = {
				one: (collection, config) =>
					({ type: "one", collection, ...config }) as any,
				many: (collection, config) =>
					({ type: "many", collection, ...config }) as any,
				manyToMany: (collection, config) =>
					({ type: "manyToMany", collection, ...config }) as any,
			};

			state.relations = this.relationsFn?.({
				table: this.table as any,
				i18n: i18nAccessor,
				...helpers,
			}) as TState["relations"];
		}

		// Type inference helper (empty runtime object, types only)
		this.$infer = {} as any;
	}

	/**
	 * Get virtual fields with specific context
	 * This allows regenerating virtual field SQL with runtime context
	 */
	public getVirtuals(context: any): TState["virtuals"] {
		if (!this.virtualsFn)
			return this.state.virtuals || ({} as TState["virtuals"]);
		const i18nAccessor = this.createI18nAccessor(context);
		return this.virtualsFn({
			table: this.table,
			i18n: i18nAccessor,
			context,
		});
	}

	/**
	 * Get virtual fields with aliased i18n tables for use in queries.
	 * This creates COALESCE expressions using the aliased tables instead of subqueries.
	 *
	 * @param context - CRUD context
	 * @param i18nCurrentTable - Aliased i18n table for current locale
	 * @param i18nFallbackTable - Aliased i18n table for fallback locale (null if no fallback)
	 */
	public getVirtualsWithAliases(
		context: any,
		i18nCurrentTable: any | null,
		i18nFallbackTable: any | null,
	): TState["virtuals"] {
		if (!this.virtualsFn)
			return this.state.virtuals || ({} as TState["virtuals"]);
		const i18nAccessor = this.createI18nAccessorWithAliases(
			i18nCurrentTable,
			i18nFallbackTable,
			context,
		);
		return this.virtualsFn({
			table: this.table,
			i18n: i18nAccessor,
			context,
		});
	}

	public getVirtualsForVersions(context: any): TState["virtuals"] {
		if (!this.virtualsFn || !this.versionsTable)
			return this.state.virtuals || ({} as TState["virtuals"]);
		const i18nAccessor = this.createI18nAccessorForVersions(
			this.versionsTable,
			this.i18nVersionsTable,
			context,
		);
		// TODO: fix typing, plus we should have profix that maps parentId to id

		return this.virtualsFn({
			table: this.versionsTable as any,
			i18n: i18nAccessor,
			context,
		});
	}

	/**
	 * Get virtual fields for versions with aliased i18n tables.
	 * Creates COALESCE expressions using the aliased tables instead of subqueries.
	 *
	 * @param context - CRUD context
	 * @param i18nVersionsCurrentTable - Aliased i18n versions table for current locale
	 * @param i18nVersionsFallbackTable - Aliased i18n versions table for fallback locale
	 */
	public getVirtualsForVersionsWithAliases(
		context: any,
		i18nVersionsCurrentTable: any | null,
		i18nVersionsFallbackTable: any | null,
	): TState["virtuals"] {
		if (!this.virtualsFn || !this.versionsTable)
			return this.state.virtuals || ({} as TState["virtuals"]);

		// Create i18n accessor using aliased tables
		const i18nAccessor = this.createI18nAccessorWithAliasesForVersions(
			i18nVersionsCurrentTable,
			i18nVersionsFallbackTable,
			context,
		);

		return this.virtualsFn({
			table: this.versionsTable as any,
			i18n: i18nAccessor,
			context,
		});
	}

	/**
	 * Get title field name
	 */
	public getTitleFieldName(): string | undefined {
		return this.state.title;
	}

	/**
	 * Get title column/expression with specific context
	 * Resolves the title field name to the actual column or virtual SQL
	 */
	public getTitleExpression(context: any): SQL | Column | null {
		const titleField = this.state.title;
		if (!titleField) return null;

		// Check if it's a regular field (column on main table)
		if (titleField in this.state.fields) {
			// Check if it's a localized field (need to parse field names)
			const mode = getLocalizedFieldMode(
				this.state.localized as readonly string[],
				titleField,
			);
			if (mode !== null) {
				// Use i18n accessor for localized fields
				const i18nAccessor = this.createI18nAccessor(context);
				return (i18nAccessor as any)[titleField];
			}
			// Non-localized field - get from table
			return (this.table as any)[titleField];
		}

		// Check if it's a virtual field
		const virtuals = this.getVirtuals(context);
		if (virtuals && titleField in virtuals) {
			return (virtuals as any)[titleField];
		}

		return null;
	}

	/**
	 * Get title expression for versions table
	 */
	public getTitleExpressionForVersions(context: any): SQL | Column | null {
		const titleField = this.state.title;
		if (!titleField || !this.versionsTable) return null;

		// Check if it's a regular field
		if (titleField in this.state.fields) {
			// Check if it's a localized field (need to parse field names)
			const mode = getLocalizedFieldMode(
				this.state.localized as readonly string[],
				titleField,
			);
			if (mode !== null) {
				const i18nAccessor = this.createI18nAccessorForVersions(
					this.versionsTable,
					this.i18nVersionsTable,
					context,
				);
				return (i18nAccessor as any)[titleField];
			}
			// Non-localized field - get from versions table
			return (this.versionsTable as any)[titleField];
		}

		// Check if it's a virtual field
		const virtuals = this.getVirtualsForVersions(context);
		if (virtuals && titleField in virtuals) {
			return (virtuals as any)[titleField];
		}

		return null;
	}

	/**
	 * Get raw title expression (for UPDATE queries) without COALESCE
	 */
	public getRawTitleExpression(context: any): SQL | Column | null {
		const titleField = this.state.title;
		if (!titleField) return null;

		// Check if it's a regular field
		if (titleField in this.state.fields) {
			// Check if it's a localized field (need to parse field names)
			const mode = getLocalizedFieldMode(
				this.state.localized as readonly string[],
				titleField,
			);
			if (mode !== null) {
				const i18nAccessor = this.createRawI18nAccessor();
				return (i18nAccessor as any)[titleField];
			}
			// Non-localized field - get from table
			return (this.table as any)[titleField];
		}

		// Check if it's a virtual field
		const virtuals = this.getVirtuals(context);
		if (virtuals && titleField in virtuals) {
			return (virtuals as any)[titleField];
		}

		return null;
	}

	/**
	 * Generate the main Drizzle table
	 */
	private generateMainTable(
		indexesFn?: CollectionBuilderIndexesFn<TState, TState["indexes"]>,
	): PgTable {
		const tableName = this.state.name;
		const columns: Record<string, any> = {};

		// Check if user defined 'id' in fields
		const hasUserDefinedId = "id" in this.state.fields;

		// Add default ID if user didn't provide one
		if (!hasUserDefinedId) {
			columns.id = defaultIdColumn();
		}

		// Add non-localized fields (including user-defined id if present)
		// Also include JSONB fields with nested localization (they store structure with $i18n markers)
		for (const [fieldName, column] of Object.entries(this.state.fields)) {
			const mode = getLocalizedFieldMode(
				this.state.localized as readonly string[],
				fieldName,
			);

			// Skip localized fields (they go to i18n table)
			if (mode !== null) {
				// Exception: JSONB nested-mode stays in main table (structure with $i18n markers)
				if (mode === "nested" && isJsonbColumn(column)) {
					columns[fieldName] = column;
				}
				continue;
			}

			columns[fieldName] = column;
		}

		// Add timestamps
		if (this.state.options.timestamps !== false) {
			Object.assign(columns, Collection.timestampsCols());
		}

		// Add soft delete
		if (this.state.options.softDelete) {
			Object.assign(columns, Collection.softDeleteCols());
		}

		// Create final table with constraints
		const table = pgTable(tableName, columns as any, (t) => {
			const constraints: Record<string, any> = {};

			// User-defined indexes
			if (indexesFn) {
				Object.assign(constraints, indexesFn({ table: t as any }));
			}

			// Auto-index on deletedAt for soft delete
			if (this.state.options.softDelete) {
				constraints[`${tableName}_deleted_at_idx`] = index().on(
					(t as any).deletedAt,
				);
			}

			return Object.values(constraints);
		});

		return table;
	}

	/**
	 * Generate the i18n table for localized fields
	 * Uses the same ID type as the parent table for parentId foreign key
	 *
	 * Includes:
	 * - Flat localized fields (non-JSONB) - entire column is localized
	 * - JSONB whole-mode localized fields - entire JSONB per locale
	 * - `_localized` JSONB column - stores nested localized values from $i18n wrappers
	 *
	 * Note: JSONB nested-mode fields do NOT get their own column in the i18n table.
	 * Instead, they stay in the main table (with $i18n markers) and their extracted
	 * localized values are stored in the `_localized` column.
	 */
	private generateI18nTable(): PgTable | null {
		const hasLocalizedFields = this.state.localized.length > 0;

		// Need i18n table if we have localized fields
		if (!hasLocalizedFields) return null;

		const tableName = `${this.state.name}_i18n`;

		// Get the parent table's ID column to match its type for parentId
		const parentIdColumn = (this.table as any).id as PgColumn;

		const columns: Record<string, any> = {
			// Own ID - uses default type
			id: text("id").primaryKey().default(sql`gen_random_uuid()`),
			// Parent ID - matches parent table's ID type
			parentId: cloneColumnType(parentIdColumn, "parent_id")
				.notNull()
				.references(() => (this.table as any).id, { onDelete: "cascade" }),
			locale: text("locale").notNull(),
			// Nested localized values from $i18n wrappers in nested-mode fields
			_localized: jsonb("_localized"),
		};

		// Add localized fields based on their mode
		for (const localizedField of this.state.localized) {
			const parsed = parseLocalizedField(localizedField as string);
			const column = this.state.fields[parsed.name];
			if (!column) continue;

			const isJsonb = isJsonbColumn(column);

			// Flat fields (non-JSONB) always get their own column
			if (!isJsonb) {
				columns[parsed.name] = column;
				continue;
			}

			// JSONB fields:
			// - whole mode: get their own column (entire JSONB per locale)
			// - nested mode: skip (values go to _localized column)
			if (parsed.mode === "whole") {
				columns[parsed.name] = column;
			}
			// nested mode: skip, uses _localized column
		}

		return pgTable(tableName, columns as any, (t) => ({
			parentLocaleIdx: uniqueIndex().on(t.parentId, t.locale),
		}));
	}

	/**
	 * Generate the versions table
	 * Uses the same ID type as the parent table for the id foreign key
	 */
	private generateVersionsTable(): InferVersionedTableWithColumns<
		TState["name"],
		NonLocalizedFields<TState["fields"], TState["localized"]>,
		TState["title"]
	> | null {
		const versioning = this.state.options.versioning;
		if (!versioning) return null;
		if (typeof versioning === "object" && !versioning.enabled) return null;

		const tableName = `${this.state.name}_versions`;

		// Get the parent table's ID column to match its type
		const parentIdColumn = (this.table as any).id as PgColumn;
		const columns: Record<string, any> = Collection.versionCols(parentIdColumn);

		for (const [fieldName, column] of Object.entries(this.state.fields)) {
			if (this.state.localized.includes(fieldName as any)) continue;
			// Skip id field as it's already included in versionCols
			if (fieldName === "id") continue;
			columns[fieldName as string] = column;
		}

		/*
		//  we don't want timestamps in versions table, they are represented by versionCreatedAt
		//  also no point of soft delete in versions table
		if (this.state.options.timestamps !== false) {
			Object.assign(columns, Collection.timestampsCols());
		}

		if (this.state.options.softDelete) {
			Object.assign(columns, Collection.softDeleteCols());
		}
		*/

		return pgTable(tableName, columns as any, (t) => [
			index().on(t.id, t.versionNumber),
			index().on(t.versionCreatedAt),
		]) as any;
	}

	/**
	 * Generate the i18n versions table
	 * Uses the same ID type as the parent table for parentId
	 */
	private generateI18nVersionsTable(): InferI18nVersionedTableWithColumns<
		TState["name"],
		LocalizedFields<TState["fields"], TState["localized"]>,
		TState["title"]
	> | null {
		const versioning = this.state.options.versioning;
		if (!versioning) return null;
		if (typeof versioning === "object" && !versioning.enabled) return null;
		if (this.state.localized.length === 0) return null;

		const tableName = `${this.state.name}_i18n_versions`;

		// Get the parent table's ID column to match its type
		const parentIdColumn = (this.table as any).id as PgColumn;
		const columns: Record<string, any> =
			Collection.i18nVersionCols(parentIdColumn);

		// Add _localized column for nested-mode fields
		columns._localized = jsonb("_localized");

		// Add localized fields based on their mode (same logic as generateI18nTable)
		for (const localizedField of this.state.localized) {
			const parsed = parseLocalizedField(localizedField as string);
			const column = this.state.fields[parsed.name];
			if (!column) continue;

			const isJsonb = isJsonbColumn(column);

			// Flat fields (non-JSONB) always get their own column
			if (!isJsonb) {
				columns[parsed.name] = column;
				continue;
			}

			// JSONB fields:
			// - whole mode: get their own column (entire JSONB per locale)
			// - nested mode: skip (values go to _localized column)
			if (parsed.mode === "whole") {
				columns[parsed.name] = column;
			}
		}

		return pgTable(tableName, columns as any, (t) => [
			uniqueIndex().on(t.parentId, t.versionNumber, t.locale),
			index().on(t.parentId, t.versionNumber),
		]) as any;
	}

	/**
	 * Create i18n accessor object for localized fields
	 * Returns SQL expressions with COALESCE pattern for each localized field
	 */
	private createI18nAccessorFor(
		table: any,
		i18nTable: any | null,
		context: any,
	): I18nFieldAccessor<TState["fields"], TState["localized"]> {
		const accessor: any = {};
		const defaultLocale = context?.defaultLocale || DEFAULT_LOCALE;

		if (!i18nTable) return accessor;

		for (const localizedField of this.state.localized) {
			// Parse field name (remove :nested suffix if present)
			const parsed = parseLocalizedField(localizedField as string);
			const fieldName = parsed.name;

			// COALESCE(
			//   1. Value from the main LEFT JOIN (filtered by current locale in CRUD generator)
			//   2. Fallback subquery for default locale
			// )
			const i18nRef = i18nTable as any;
			if (context?.localeFallback === false) {
				accessor[fieldName] = i18nRef[fieldName];
			} else {
				accessor[fieldName] = sql`COALESCE(
					${i18nRef[fieldName]},
					(SELECT ${i18nRef[fieldName]} FROM ${i18nTable}
					 WHERE ${i18nRef.parentId} = ${(table as any).id}
					 AND ${i18nRef.locale} = ${defaultLocale} LIMIT 1)
				)`;
			}
		}

		return accessor;
	}

	private createI18nAccessorForVersions(
		table: any,
		i18nTable: any | null,
		context: any,
	): I18nFieldAccessor<TState["fields"], TState["localized"]> {
		const accessor: any = {};
		const defaultLocale = context?.defaultLocale || DEFAULT_LOCALE;

		if (!i18nTable) return accessor;

		for (const localizedField of this.state.localized) {
			// Parse field name (remove :nested suffix if present)
			const parsed = parseLocalizedField(localizedField as string);
			const fieldName = parsed.name;

			const i18nRef = i18nTable as any;
			if (context?.localeFallback === false) {
				accessor[fieldName] = i18nRef[fieldName];
			} else {
				accessor[fieldName] = sql`COALESCE(
					${i18nRef[fieldName]},
					(SELECT ${i18nRef[fieldName]} FROM ${i18nTable}
					 WHERE ${i18nRef.parentId} = ${(table as any).id}
					 AND ${i18nRef.versionNumber} = ${(table as any).versionNumber}
					 AND ${i18nRef.locale} = ${defaultLocale} LIMIT 1)
				)`;
			}
		}

		return accessor;
	}

	/**
	 * Create raw i18n accessor object (direct column references)
	 */
	private createRawI18nAccessorFor(
		i18nTable: any | null,
	): I18nFieldAccessor<TState["fields"], TState["localized"]> {
		const accessor: any = {};

		if (!i18nTable) return accessor;

		for (const localizedField of this.state.localized) {
			// Parse field name (remove :nested suffix if present)
			const parsed = parseLocalizedField(localizedField as string);
			const fieldName = parsed.name;

			accessor[fieldName] = (i18nTable as any)[fieldName];
		}

		return accessor;
	}

	private createI18nAccessor(
		context: any,
	): I18nFieldAccessor<TState["fields"], TState["localized"]> {
		return this.createI18nAccessorFor(this.table, this.i18nTable, context);
	}

	/**
	 * Create i18n accessor using aliased tables for current and fallback locales.
	 * Uses simple COALESCE(current, fallback) instead of subqueries.
	 *
	 * @param i18nCurrentTable - Aliased i18n table for current locale (null if no i18n)
	 * @param i18nFallbackTable - Aliased i18n table for fallback locale (null if no fallback)
	 * @param context - CRUD context
	 */
	private createI18nAccessorWithAliases(
		i18nCurrentTable: any | null,
		i18nFallbackTable: any | null,
		context: any,
	): I18nFieldAccessor<TState["fields"], TState["localized"]> {
		const accessor: any = {};

		if (!i18nCurrentTable) return accessor;

		for (const localizedField of this.state.localized) {
			// Parse field name (remove :nested suffix if present)
			const parsed = parseLocalizedField(localizedField as string);
			const fieldName = parsed.name;

			const currentRef = i18nCurrentTable[fieldName];

			// If no fallback or fallback disabled, use current directly
			if (!i18nFallbackTable || context?.localeFallback === false) {
				accessor[fieldName] = currentRef;
			} else {
				// COALESCE(current, fallback) - no subquery needed
				const fallbackRef = i18nFallbackTable[fieldName];
				accessor[fieldName] = sql`COALESCE(${currentRef}, ${fallbackRef})`;
			}
		}

		return accessor;
	}

	/**
	 * Create i18n accessor for versions using aliased tables for current and fallback locales.
	 * Uses simple COALESCE(current, fallback) instead of subqueries.
	 *
	 * @param i18nVersionsCurrentTable - Aliased i18n versions table for current locale
	 * @param i18nVersionsFallbackTable - Aliased i18n versions table for fallback locale
	 * @param context - CRUD context
	 */
	private createI18nAccessorWithAliasesForVersions(
		i18nVersionsCurrentTable: any | null,
		i18nVersionsFallbackTable: any | null,
		context: any,
	): I18nFieldAccessor<TState["fields"], TState["localized"]> {
		// Same logic as createI18nAccessorWithAliases - just with different table parameters
		const accessor: any = {};

		if (!i18nVersionsCurrentTable) return accessor;

		for (const localizedField of this.state.localized) {
			// Parse field name (remove :nested suffix if present)
			const parsed = parseLocalizedField(localizedField as string);
			const fieldName = parsed.name;

			const currentRef = i18nVersionsCurrentTable[fieldName];

			// If no fallback or fallback disabled, use current directly
			if (!i18nVersionsFallbackTable || context?.localeFallback === false) {
				accessor[fieldName] = currentRef;
			} else {
				// COALESCE(current, fallback) - no subquery needed
				const fallbackRef = i18nVersionsFallbackTable[fieldName];
				accessor[fieldName] = sql`COALESCE(${currentRef}, ${fallbackRef})`;
			}
		}

		return accessor;
	}

	private createRawI18nAccessor(): I18nFieldAccessor<
		TState["fields"],
		TState["localized"]
	> {
		return this.createRawI18nAccessorFor(this.i18nTable);
	}

	/**
	 * Generate CRUD operations (Drizzle RQB v2-like)
	 */
	generateCRUD(
		db: any,
		cms?: any,
	): CRUD<
		CollectionSelect<TState>,
		CollectionInsert<TState>,
		CollectionUpdate<TState>,
		TState["relations"]
	> {
		const crud = new CRUDGenerator(
			this.state,
			this.table,
			this.i18nTable,
			this.versionsTable,
			this.i18nVersionsTable,
			db,
			this.getVirtuals.bind(this),
			this.getVirtualsWithAliases.bind(this),
			this.getTitleExpression.bind(this),
			this.getVirtualsForVersions.bind(this),
			this.getVirtualsForVersionsWithAliases.bind(this),
			this.getTitleExpressionForVersions.bind(this),
			this.getRawTitleExpression.bind(this),
			cms,
		);

		return crud.generate() as CRUD<
			CollectionSelect<TState>,
			CollectionInsert<TState>,
			CollectionUpdate<TState>,
			TState["relations"]
		>;
	}
	// ...

	/**
	 * Get metadata about the collection
	 */
	getMeta() {
		// Title is now a field name (string) - determine if it's a field or virtual
		const titleField = this.state.title;
		const titleMeta: {
			defined: boolean;
			type: "field" | "virtual" | null;
			fieldName: string | null;
		} = {
			defined: !!titleField,
			type: null,
			fieldName: titleField || null,
		};

		if (titleField) {
			if (titleField in this.state.fields) {
				titleMeta.type = "field";
			} else if (this.state.virtuals && titleField in this.state.virtuals) {
				titleMeta.type = "virtual";
			}
		}

		return {
			name: this.state.name,
			fields: Object.entries(this.state.fields).map(([name, column]) => {
				const mode = getLocalizedFieldMode(
					this.state.localized as readonly string[],
					name,
				);
				return {
					name,
					column,
					localized: mode !== null,
					localizationMode: mode,
					virtual: this.state.virtuals && name in this.state.virtuals,
				};
			}),
			title: titleMeta,
			timestamps: this.state.options.timestamps !== false,
			softDelete: this.state.options.softDelete || false,
			virtualFields: this.state.virtuals
				? Object.keys(this.state.virtuals)
				: [],
			localizedFields: Array.from(this.state.localized).map((f) =>
				parseLocalizedField(f as string),
			),
			relations: Object.keys(this.state.relations),
		};
	}
}
