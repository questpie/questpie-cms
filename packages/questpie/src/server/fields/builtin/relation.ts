/**
 * Relation Field Type
 *
 * Field for defining relationships between collections.
 * Supports belongsTo, hasMany, and manyToMany relation types.
 */

import { eq, ne, inArray, notInArray, isNull, isNotNull, sql } from "drizzle-orm";
import { varchar, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";
import { defineField } from "../define-field.js";
import type {
	BaseFieldConfig,
	ContextualOperators,
	RelationFieldMetadata,
	JoinBuilder,
} from "../types.js";
import { getDefaultRegistry } from "../registry.js";

// ============================================================================
// Relation Field Configuration
// ============================================================================

/**
 * Relation type options.
 */
export type RelationType = "belongsTo" | "hasMany" | "manyToMany";

/**
 * Referential action options.
 */
export type ReferentialAction = "cascade" | "set null" | "restrict" | "no action";

/**
 * Relation field configuration options.
 */
export interface RelationFieldConfig extends BaseFieldConfig {
	/**
	 * Target collection name (slug).
	 * This is the collection being referenced.
	 */
	to: string;

	/**
	 * Relation type.
	 * - belongsTo: This record has one reference to target (FK stored here)
	 * - hasMany: Target records reference this record (FK on target, no column here)
	 * - manyToMany: Junction table relationship (no column here)
	 * @default "belongsTo"
	 */
	type?: RelationType;

	/**
	 * Foreign key column name.
	 * For belongsTo: Column name on this collection storing the FK
	 * For hasMany: Column name on target collection storing the FK
	 * @default "{fieldName}Id" for belongsTo, "{thisCollection}Id" for hasMany
	 */
	foreignKey?: string;

	/**
	 * Junction table name for manyToMany.
	 * - `true`: Auto-generate name from collection names
	 * - `string`: Custom junction table name
	 * Only used for manyToMany relations.
	 */
	through?: string | true;

	/**
	 * Source field on junction table (manyToMany).
	 * @default "{thisCollection}Id"
	 */
	sourceField?: string;

	/**
	 * Target field on junction table (manyToMany).
	 * @default "{targetCollection}Id"
	 */
	targetField?: string;

	/**
	 * Action on delete of referenced record.
	 * @default "cascade" for belongsTo, "set null" for others
	 */
	onDelete?: ReferentialAction;

	/**
	 * Action on update of referenced record's ID.
	 * @default "cascade"
	 */
	onUpdate?: ReferentialAction;

	/**
	 * Default filter conditions for the relation.
	 * Applied when fetching related records.
	 */
	where?: Record<string, unknown>;

	/**
	 * Default ordering for hasMany/manyToMany.
	 */
	orderBy?: Record<string, "asc" | "desc">;

	/**
	 * Limit number of related records (hasMany/manyToMany).
	 */
	limit?: number;
}

// ============================================================================
// Relation Field Operators
// ============================================================================

/**
 * Get operators for belongsTo relation (FK field).
 */
function getBelongsToOperators(): ContextualOperators {
	return {
		column: {
			eq: (col, value) => eq(col, value as string),
			ne: (col, value) => ne(col, value as string),
			in: (col, values) => inArray(col, values as string[]),
			notIn: (col, values) => notInArray(col, values as string[]),
			is: (col, value) => eq(col, value as string),
			isNot: (col, value) => ne(col, value as string),
			isNull: (col) => isNull(col),
			isNotNull: (col) => isNotNull(col),
		},
		jsonb: {
			eq: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' = ${value}`;
			},
			ne: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' != ${value}`;
			},
			in: (col, values, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' = ANY(${values}::text[])`;
			},
			notIn: (col, values, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`NOT (${col}#>>'{${sql.raw(path)}}' = ANY(${values}::text[]))`;
			},
			isNull: (col, _value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' IS NULL`;
			},
			isNotNull: (col, _value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' IS NOT NULL`;
			},
		},
	};
}

/**
 * Get operators for hasMany/manyToMany relations.
 * These operate on the existence of related records.
 * Note: Actual implementation requires subqueries with collection context.
 */
function getToManyOperators(): ContextualOperators {
	// These operators are conceptual - actual implementation requires
	// collection/query context to build proper subqueries
	return {
		column: {
			// Has at least one matching related record
			some: () => sql`TRUE`, // Placeholder - requires subquery
			// Has no matching related records
			none: () => sql`TRUE`, // Placeholder - requires subquery
			// All related records match condition
			every: () => sql`TRUE`, // Placeholder - requires subquery
			// Count of related records
			count: () => sql`0`, // Placeholder - requires subquery
		},
		jsonb: {
			// For JSONB stored arrays (unlikely for relations but included)
			some: () => sql`TRUE`,
			none: () => sql`TRUE`,
			every: () => sql`TRUE`,
			count: () => sql`0`,
		},
	};
}

// ============================================================================
// Relation Field Definition
// ============================================================================

/**
 * Relation field factory.
 * Creates a relation field with the given configuration.
 *
 * @example
 * ```ts
 * // BelongsTo: Post has one Author
 * const author = relationField({
 *   to: "users",
 *   type: "belongsTo",
 *   required: true,
 * });
 *
 * // HasMany: Author has many Posts (no column on author, FK on posts)
 * const posts = relationField({
 *   to: "posts",
 *   type: "hasMany",
 *   foreignKey: "authorId",
 *   orderBy: { createdAt: "desc" },
 * });
 *
 * // ManyToMany: Post has many Tags
 * const tags = relationField({
 *   to: "tags",
 *   type: "manyToMany",
 *   through: "post_tags",
 * });
 * ```
 */
export const relationField = defineField<
	"relation",
	RelationFieldConfig,
	string | string[] | null
>("relation", {
	toColumn(name, config) {
		const { type = "belongsTo" } = config;

		// Only belongsTo creates a column (FK column)
		if (type !== "belongsTo") {
			// hasMany and manyToMany don't create columns on this table
			return null as any;
		}

		// BelongsTo: store foreign key as UUID/varchar
		let column: any = varchar(name, { length: 36 }); // UUID length

		// Apply constraints
		if (config.required && config.nullable !== true) {
			column = column.notNull();
		}
		if (config.default !== undefined) {
			const defaultValue =
				typeof config.default === "function"
					? config.default()
					: config.default;
			column = column.default(defaultValue as string);
		}
		if (config.unique) {
			column = column.unique();
		}

		return column;
	},

	toZodSchema(config) {
		const { type = "belongsTo" } = config;

		if (type === "belongsTo") {
			// Single FK reference
			let schema = z.string().uuid();

			if (!config.required && config.nullable !== false) {
				return schema.nullish();
			}

			return schema;
		} else {
			// hasMany/manyToMany: array of IDs for input
			// Note: For creates/updates, we accept array of IDs to link
			let schema = z.array(z.string().uuid());

			if (!config.required && config.nullable !== false) {
				return schema.nullish();
			}

			return schema;
		}
	},

	getOperators(config) {
		const { type = "belongsTo" } = config;
		return type === "belongsTo" ? getBelongsToOperators() : getToManyOperators();
	},

	getMetadata(config): RelationFieldMetadata {
		const { type = "belongsTo" } = config;

		return {
			type: "relation",
			label: config.label,
			description: config.description,
			required: config.required ?? false,
			localized: config.localized ?? false,
			unique: config.unique ?? false,
			searchable: config.searchable ?? false,
			readOnly: config.input === false,
			writeOnly: config.output === false,
			relationTarget: config.to,
			relationType: type,
		};
	},
});

// Register in default registry
// Note: Cast needed because RelationFieldConfig has required 'to' property
getDefaultRegistry().register("relation", relationField as any);
