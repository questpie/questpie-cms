/**
 * Upload Field Type
 *
 * File upload field that references assets collection.
 * Supports single and multiple file uploads with mime type and size validation.
 */

import { eq, ne, inArray, notInArray, isNull, isNotNull, sql } from "drizzle-orm";
import { varchar, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";
import { defineField } from "../define-field.js";
import type {
	BaseFieldConfig,
	ContextualOperators,
	RelationFieldMetadata,
} from "../types.js";
import { getDefaultRegistry } from "../registry.js";

// ============================================================================
// Upload Field Configuration
// ============================================================================

/**
 * Upload field configuration options.
 */
export interface UploadFieldConfig extends BaseFieldConfig {
	/**
	 * Allowed MIME types.
	 * If not provided, all types are allowed.
	 * @example ["image/png", "image/jpeg", "image/gif"]
	 * @example ["image/*"] // Wildcard for all images
	 * @example ["application/pdf", "application/msword"]
	 */
	mimeTypes?: string[];

	/**
	 * Maximum file size in bytes.
	 * Applied during upload validation.
	 */
	maxSize?: number;

	/**
	 * Target upload collection.
	 * @default "assets"
	 */
	collection?: string;

	/**
	 * Allow multiple file uploads.
	 * When true, stores array of asset IDs as JSONB.
	 * @default false
	 */
	multiple?: boolean;

	/**
	 * Minimum number of files (for multiple: true).
	 */
	minItems?: number;

	/**
	 * Maximum number of files (for multiple: true).
	 */
	maxItems?: number;
}

// ============================================================================
// Upload Field Operators
// ============================================================================

/**
 * Get operators for single upload field.
 */
function getSingleUploadOperators(): ContextualOperators {
	return {
		column: {
			eq: (col, value) => eq(col, value as string),
			ne: (col, value) => ne(col, value as string),
			in: (col, values) => inArray(col, values as string[]),
			notIn: (col, values) => notInArray(col, values as string[]),
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
 * Get operators for multiple upload field.
 */
function getMultipleUploadOperators(): ContextualOperators {
	return {
		column: {
			// Contains specified asset ID
			contains: (col, value) =>
				sql`${col} @> ${JSON.stringify([value])}::jsonb`,
			// Contains all specified asset IDs
			containsAll: (col, values) =>
				sql`${col} @> ${JSON.stringify(values)}::jsonb`,
			// Contains any of specified asset IDs
			containsAny: (col, values) =>
				sql`${col} ?| ${sql.raw(`ARRAY[${(values as string[]).map((v) => `'${v}'`).join(",")}]`)}`,
			// Is empty array
			isEmpty: (col) =>
				sql`(${col} = '[]'::jsonb OR ${col} IS NULL)`,
			// Is not empty
			isNotEmpty: (col) =>
				sql`(${col} != '[]'::jsonb AND ${col} IS NOT NULL)`,
			// Count equals
			count: (col, value) =>
				sql`jsonb_array_length(COALESCE(${col}, '[]'::jsonb)) = ${value}`,
			// Count greater than
			countGt: (col, value) =>
				sql`jsonb_array_length(COALESCE(${col}, '[]'::jsonb)) > ${value}`,
			// Count less than
			countLt: (col, value) =>
				sql`jsonb_array_length(COALESCE(${col}, '[]'::jsonb)) < ${value}`,
			isNull: (col) => isNull(col),
			isNotNull: (col) => isNotNull(col),
		},
		jsonb: {
			contains: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' @> ${JSON.stringify([value])}::jsonb`;
			},
			containsAll: (col, values, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' @> ${JSON.stringify(values)}::jsonb`;
			},
			containsAny: (col, values, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' ?| ${sql.raw(`ARRAY[${(values as string[]).map((v) => `'${v}'`).join(",")}]`)}`;
			},
			isEmpty: (col, _value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>'{${sql.raw(path)}}' = '[]'::jsonb OR ${col}#>'{${sql.raw(path)}}' IS NULL)`;
			},
			isNotEmpty: (col, _value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>'{${sql.raw(path)}}' != '[]'::jsonb AND ${col}#>'{${sql.raw(path)}}' IS NOT NULL)`;
			},
			count: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`jsonb_array_length(COALESCE(${col}#>'{${sql.raw(path)}}', '[]'::jsonb)) = ${value}`;
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
// Upload Field Definition
// ============================================================================

/**
 * Upload field factory.
 * Creates a file upload field with the given configuration.
 *
 * @example
 * ```ts
 * const avatar = uploadField({ mimeTypes: ["image/*"], maxSize: 5_000_000 });
 * const documents = uploadField({ mimeTypes: ["application/pdf"], multiple: true, maxItems: 10 });
 * const gallery = uploadField({ mimeTypes: ["image/*"], multiple: true, minItems: 1, maxItems: 20 });
 * ```
 */
export const uploadField = defineField<
	"upload",
	UploadFieldConfig,
	string | string[]
>("upload", {
	toColumn(name, config) {
		const { multiple = false } = config;

		let column: any;

		if (multiple) {
			// Multiple uploads: store as JSONB array of asset IDs
			column = jsonb(name);
		} else {
			// Single upload: store asset ID as varchar
			column = varchar(name, { length: 36 }); // UUID length
		}

		// Apply constraints
		if (config.required && config.nullable !== true) {
			column = column.notNull();
		}
		if (config.default !== undefined) {
			const defaultValue =
				typeof config.default === "function"
					? config.default()
					: config.default;
			column = column.default(
				multiple ? JSON.stringify(defaultValue) : defaultValue,
			);
		}
		if (config.unique && !multiple) {
			column = column.unique();
		}

		return column;
	},

	toZodSchema(config) {
		const { multiple = false } = config;

		if (multiple) {
			// Multiple uploads: array of UUIDs
			let schema = z.array(z.string().uuid());

			if (config.minItems !== undefined) {
				schema = schema.min(config.minItems);
			}
			if (config.maxItems !== undefined) {
				schema = schema.max(config.maxItems);
			}

			// Nullability
			if (!config.required && config.nullable !== false) {
				return schema.nullish();
			}

			return schema;
		} else {
			// Single upload: UUID
			let schema = z.string().uuid();

			// Nullability
			if (!config.required && config.nullable !== false) {
				return schema.nullish();
			}

			return schema;
		}
	},

	getOperators(config) {
		return config.multiple
			? getMultipleUploadOperators()
			: getSingleUploadOperators();
	},

	getMetadata(config): RelationFieldMetadata {
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
			relationTarget: config.collection ?? "assets",
			relationType: config.multiple ? "hasMany" : "belongsTo",
			validation: {
				minItems: config.minItems,
				maxItems: config.maxItems,
			},
		};
	},
});

// Register in default registry
getDefaultRegistry().register("upload", uploadField);
