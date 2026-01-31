/**
 * Polymorphic Relation Field Type
 *
 * Field for defining polymorphic relationships where a field
 * can reference different types of collections.
 */

import { eq, ne, inArray, notInArray, isNull, isNotNull, and, sql } from "drizzle-orm";
import { varchar } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import { defineField } from "../define-field.js";
import type {
	BaseFieldConfig,
	ContextualOperators,
	PolymorphicRelationFieldMetadata,
} from "../types.js";
import { getDefaultRegistry } from "../registry.js";

// ============================================================================
// Polymorphic Relation Field Configuration
// ============================================================================

/**
 * Referential action options.
 */
export type ReferentialAction = "cascade" | "set null" | "restrict";

/**
 * Polymorphic relation field configuration options.
 */
export interface PolymorphicRelationConfig extends BaseFieldConfig {
	/**
	 * Allowed target collection types (slugs).
	 * The field can reference any of these collections.
	 */
	types: readonly string[];

	/**
	 * Column name for storing the referenced type.
	 * @default "{fieldName}Type"
	 */
	typeField?: string;

	/**
	 * Column name for storing the referenced ID.
	 * @default "{fieldName}Id"
	 */
	idField?: string;

	/**
	 * Action on delete of referenced record.
	 * @default "set null"
	 */
	onDelete?: ReferentialAction;
}

// ============================================================================
// Polymorphic Relation Field Operators
// ============================================================================

/**
 * Get operators for polymorphic relation field.
 * Operators work on the combined type+id pair.
 */
function getPolymorphicOperators(): ContextualOperators {
	return {
		column: {
			// Match exact type and ID
			eq: (col, value) => {
				// Value expected as { type: string, id: string }
				const v = value as { type: string; id: string };
				// Note: This is conceptual - actual impl needs both columns
				return sql`TRUE`; // Placeholder
			},
			ne: (col, value) => {
				return sql`TRUE`; // Placeholder
			},
			// Match any of the types
			typeIn: (col, values) => inArray(col, values as string[]),
			typeEq: (col, value) => eq(col, value as string),
			// ID operators (applied to ID column)
			idEq: (col, value) => eq(col, value as string),
			idIn: (col, values) => inArray(col, values as string[]),
			isNull: (col) => isNull(col),
			isNotNull: (col) => isNotNull(col),
		},
		jsonb: {
			eq: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' = ${JSON.stringify(value)}::jsonb`;
			},
			ne: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' != ${JSON.stringify(value)}::jsonb`;
			},
			typeEq: (col, value, ctx) => {
				const path = [...(ctx.jsonbPath ?? []), "type"].join(",");
				return sql`${col}#>>'{${sql.raw(path)}}' = ${value}`;
			},
			typeIn: (col, values, ctx) => {
				const path = [...(ctx.jsonbPath ?? []), "type"].join(",");
				return sql`${col}#>>'{${sql.raw(path)}}' = ANY(${values}::text[])`;
			},
			idEq: (col, value, ctx) => {
				const path = [...(ctx.jsonbPath ?? []), "id"].join(",");
				return sql`${col}#>>'{${sql.raw(path)}}' = ${value}`;
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

// ============================================================================
// Polymorphic Relation Field Definition
// ============================================================================

/**
 * Type for polymorphic reference value.
 */
export interface PolymorphicReference {
	type: string;
	id: string;
}

/**
 * Polymorphic relation field factory.
 * Creates a polymorphic relation field with the given configuration.
 *
 * Creates two columns:
 * - Type column: stores the collection type/slug
 * - ID column: stores the referenced record ID
 *
 * @example
 * ```ts
 * // A comment that can belong to either a Post or a Page
 * const commentable = polymorphicRelationField({
 *   types: ["posts", "pages"],
 *   required: true,
 * });
 *
 * // An activity log that references various entity types
 * const subject = polymorphicRelationField({
 *   types: ["users", "posts", "comments", "orders"],
 *   typeField: "subjectType",
 *   idField: "subjectId",
 * });
 * ```
 */
export const polymorphicRelationField = defineField<
	"polymorphicRelation",
	PolymorphicRelationConfig,
	PolymorphicReference | null
>("polymorphicRelation", {
	toColumn(name, config) {
		const typeFieldName = config.typeField ?? `${name}Type`;
		const idFieldName = config.idField ?? `${name}Id`;

		// Create type column
		const maxTypeLength = Math.max(
			...config.types.map((t) => t.length),
			50,
		);
		let typeColumn: any = varchar(typeFieldName, { length: maxTypeLength });

		// Create ID column
		let idColumn: any = varchar(idFieldName, { length: 36 }); // UUID length

		// Apply constraints
		if (config.required && config.nullable !== true) {
			typeColumn = typeColumn.notNull();
			idColumn = idColumn.notNull();
		}

		// Return both columns
		// Note: The collection builder needs to handle multiple columns
		return [typeColumn, idColumn] as any;
	},

	toZodSchema(config) {
		const typeEnum = config.types as readonly [string, ...string[]];

		const schema = z.object({
			type: z.enum(typeEnum),
			id: z.string().uuid(),
		});

		if (!config.required && config.nullable !== false) {
			return schema.nullish();
		}

		return schema;
	},

	getOperators() {
		return getPolymorphicOperators();
	},

	getMetadata(config): PolymorphicRelationFieldMetadata {
		return {
			type: "polymorphicRelation",
			label: config.label,
			description: config.description,
			required: config.required ?? false,
			localized: config.localized ?? false,
			unique: config.unique ?? false,
			searchable: config.searchable ?? false,
			readOnly: config.input === false,
			writeOnly: config.output === false,
			relationType: "polymorphic",
			types: [...config.types],
			typeField: config.typeField,
			idField: config.idField,
		};
	},
});

// Register in default registry
// Note: Cast needed because PolymorphicRelationConfig has required 'types' property
getDefaultRegistry().register("polymorphicRelation", polymorphicRelationField as any);
