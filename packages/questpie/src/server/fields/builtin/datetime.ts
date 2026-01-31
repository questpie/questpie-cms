/**
 * Datetime Field Type
 *
 * Timestamp field for storing date and time.
 * Supports timezone, precision, auto-now on create/update.
 */

import { eq, ne, gt, gte, lt, lte, between, isNull, isNotNull, sql } from "drizzle-orm";
import { timestamp } from "drizzle-orm/pg-core";
import { z } from "zod";
import { defineField } from "../define-field.js";
import type {
	BaseFieldConfig,
	ContextualOperators,
	FieldMetadataBase,
} from "../types.js";
import { getDefaultRegistry } from "../registry.js";

// ============================================================================
// Datetime Field Configuration
// ============================================================================

/**
 * Datetime field configuration options.
 */
export interface DatetimeFieldConfig extends BaseFieldConfig {
	/**
	 * Minimum datetime constraint (inclusive).
	 * Can be a Date object or ISO datetime string.
	 */
	min?: Date | string;

	/**
	 * Maximum datetime constraint (inclusive).
	 * Can be a Date object or ISO datetime string.
	 */
	max?: Date | string;

	/**
	 * Auto-set to current datetime on create.
	 */
	autoNow?: boolean;

	/**
	 * Auto-update to current datetime on every update.
	 * Note: This is applied via hooks, not DB default.
	 */
	autoNowUpdate?: boolean;

	/**
	 * Timestamp precision (0-6 fractional seconds digits).
	 * @default 3 (milliseconds)
	 */
	precision?: 0 | 1 | 2 | 3 | 4 | 5 | 6;

	/**
	 * Store with timezone information.
	 * @default true
	 */
	withTimezone?: boolean;
}

// ============================================================================
// Datetime Field Operators
// ============================================================================

/**
 * Get operators for datetime field.
 * Supports both column and JSONB path access.
 */
function getDatetimeOperators(): ContextualOperators {
	return {
		column: {
			eq: (col, value) => eq(col, new Date(value as string)),
			ne: (col, value) => ne(col, new Date(value as string)),
			gt: (col, value) => gt(col, new Date(value as string)),
			gte: (col, value) => gte(col, new Date(value as string)),
			lt: (col, value) => lt(col, new Date(value as string)),
			lte: (col, value) => lte(col, new Date(value as string)),
			between: (col, value) => {
				const [min, max] = value as [string, string];
				return between(col, new Date(min), new Date(max));
			},
			before: (col, value) => lt(col, new Date(value as string)),
			after: (col, value) => gt(col, new Date(value as string)),
			isNull: (col) => isNull(col),
			isNotNull: (col) => isNotNull(col),
		},
		jsonb: {
			eq: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::timestamptz = ${value}::timestamptz`;
			},
			ne: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::timestamptz != ${value}::timestamptz`;
			},
			gt: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::timestamptz > ${value}::timestamptz`;
			},
			gte: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::timestamptz >= ${value}::timestamptz`;
			},
			lt: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::timestamptz < ${value}::timestamptz`;
			},
			lte: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::timestamptz <= ${value}::timestamptz`;
			},
			between: (col, value, ctx) => {
				const [min, max] = value as [string, string];
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::timestamptz BETWEEN ${min}::timestamptz AND ${max}::timestamptz`;
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
// Datetime Field Definition
// ============================================================================

/**
 * Datetime field factory.
 * Creates a datetime (timestamp) field with the given configuration.
 *
 * @example
 * ```ts
 * const createdAt = datetimeField({ autoNow: true, input: false });
 * const updatedAt = datetimeField({ autoNowUpdate: true, input: false });
 * const publishedAt = datetimeField({ min: new Date() });
 * const eventTime = datetimeField({ precision: 0 }); // No fractional seconds
 * ```
 */
export const datetimeField = defineField<"datetime", DatetimeFieldConfig, Date>(
	"datetime",
	{
		toColumn(name, config) {
			const { precision = 3, withTimezone = true } = config;

			let column: any = timestamp(name, {
				precision,
				withTimezone,
				mode: "date",
			});

			// Apply constraints
			if (config.required && config.nullable !== true) {
				column = column.notNull();
			}

			// Default value
			if (config.autoNow) {
				column = column.defaultNow();
			} else if (config.default !== undefined) {
				const defaultValue =
					typeof config.default === "function"
						? config.default()
						: config.default;
				column = column.default(defaultValue as Date);
			}

			if (config.unique) {
				column = column.unique();
			}

			return column;
		},

		toZodSchema(config) {
			// Accept string or Date, coerce to Date
			let schema = z.coerce.date();

			// Min/max constraints
			if (config.min) {
				const minDate = typeof config.min === "string" ? new Date(config.min) : config.min;
				schema = schema.min(minDate);
			}
			if (config.max) {
				const maxDate = typeof config.max === "string" ? new Date(config.max) : config.max;
				schema = schema.max(maxDate);
			}

			// Nullability
			if (!config.required && config.nullable !== false) {
				return schema.nullish();
			}

			return schema;
		},

		getOperators() {
			return getDatetimeOperators();
		},

		getMetadata(config): FieldMetadataBase {
			return {
				type: "datetime",
				label: config.label,
				description: config.description,
				required: config.required ?? false,
				localized: config.localized ?? false,
				unique: config.unique ?? false,
				searchable: config.searchable ?? false,
				readOnly: config.input === false,
				writeOnly: config.output === false,
			};
		},
	},
);

// Register in default registry
getDefaultRegistry().register("datetime", datetimeField);
