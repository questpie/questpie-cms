/**
 * Number Field Type
 *
 * Numeric field with various storage modes (integer, bigint, real, double, decimal).
 * Supports validation, constraints, and numeric operators.
 */

import {
	eq,
	ne,
	gt,
	gte,
	lt,
	lte,
	between,
	inArray,
	notInArray,
	isNull,
	isNotNull,
	sql,
} from "drizzle-orm";
import {
	integer,
	smallint,
	bigint,
	real,
	doublePrecision,
	numeric,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { defineField } from "../define-field.js";
import type {
	BaseFieldConfig,
	ContextualOperators,
	FieldMetadataBase,
} from "../types.js";
import { getDefaultRegistry } from "../registry.js";

// ============================================================================
// Number Field Configuration
// ============================================================================

/**
 * Number field configuration options.
 */
export interface NumberFieldConfig extends BaseFieldConfig {
	/**
	 * Storage mode: integer (default), smallint, bigint, real, double, or decimal.
	 * - integer: 32-bit integer (-2,147,483,648 to 2,147,483,647)
	 * - smallint: 16-bit integer (-32,768 to 32,767)
	 * - bigint: 64-bit integer (for very large numbers)
	 * - real: 32-bit floating point (6 decimal digits precision)
	 * - double: 64-bit floating point (15 decimal digits precision)
	 * - decimal: Arbitrary precision decimal (use with precision/scale)
	 * @default "integer"
	 */
	mode?: "integer" | "smallint" | "bigint" | "real" | "double" | "decimal";

	/**
	 * Precision for decimal mode (total digits).
	 * @default 10
	 */
	precision?: number;

	/**
	 * Scale for decimal mode (digits after decimal point).
	 * @default 2
	 */
	scale?: number;

	/**
	 * Minimum value constraint.
	 */
	min?: number;

	/**
	 * Maximum value constraint.
	 */
	max?: number;

	/**
	 * Value must be positive (> 0).
	 */
	positive?: boolean;

	/**
	 * Value must be negative (< 0).
	 */
	negative?: boolean;

	/**
	 * Value must be non-negative (>= 0).
	 */
	nonNegative?: boolean;

	/**
	 * Value must be non-positive (<= 0).
	 */
	nonPositive?: boolean;

	/**
	 * Value must be an integer (enforced in validation even for float storage).
	 */
	int?: boolean;

	/**
	 * Step/increment for validation (e.g., 0.01 for currency).
	 */
	step?: number;

	/**
	 * Value must be finite (not Infinity or -Infinity).
	 * @default true for decimal mode
	 */
	finite?: boolean;

	/**
	 * Value must be safe integer (for bigint mode, within JS safe integer range).
	 */
	safe?: boolean;
}

// ============================================================================
// Number Field Operators
// ============================================================================

/**
 * Get operators for number field.
 * Supports both column and JSONB path access.
 */
function getNumberOperators(): ContextualOperators {
	return {
		column: {
			eq: (col, value) => eq(col, value as number),
			ne: (col, value) => ne(col, value as number),
			gt: (col, value) => gt(col, value as number),
			gte: (col, value) => gte(col, value as number),
			lt: (col, value) => lt(col, value as number),
			lte: (col, value) => lte(col, value as number),
			between: (col, value) => {
				const [min, max] = value as [number, number];
				return between(col, min, max);
			},
			in: (col, values) => inArray(col, values as number[]),
			notIn: (col, values) => notInArray(col, values as number[]),
			isNull: (col) => isNull(col),
			isNotNull: (col) => isNotNull(col),
		},
		jsonb: {
			eq: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::numeric = ${value}`;
			},
			ne: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::numeric != ${value}`;
			},
			gt: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::numeric > ${value}`;
			},
			gte: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::numeric >= ${value}`;
			},
			lt: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::numeric < ${value}`;
			},
			lte: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::numeric <= ${value}`;
			},
			between: (col, value, ctx) => {
				const [min, max] = value as [number, number];
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`(${col}#>>'{${sql.raw(path)}}')::numeric BETWEEN ${min} AND ${max}`;
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
// Number Field Definition
// ============================================================================

/**
 * Number field factory.
 * Creates a number field with the given configuration.
 *
 * @example
 * ```ts
 * const age = numberField({ min: 0, max: 150 });
 * const price = numberField({ mode: "decimal", precision: 10, scale: 2, min: 0 });
 * const count = numberField({ mode: "integer", nonNegative: true });
 * const rating = numberField({ min: 1, max: 5, step: 0.5 });
 * ```
 */
export const numberField = defineField<"number", NumberFieldConfig, number>(
	"number",
	{
		toColumn(name, config) {
			const { mode = "integer", precision = 10, scale = 2 } = config;

			let column: any;

			switch (mode) {
				case "smallint":
					column = smallint(name);
					break;
				case "bigint":
					column = bigint(name, { mode: "number" });
					break;
				case "real":
					column = real(name);
					break;
				case "double":
					column = doublePrecision(name);
					break;
				case "decimal":
					column = numeric(name, { precision, scale });
					break;
				case "integer":
				default:
					column = integer(name);
					break;
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
				column = column.default(defaultValue as number);
			}
			if (config.unique) {
				column = column.unique();
			}

			return column;
		},

		toZodSchema(config) {
			let schema = z.number();

			// Range constraints
			if (config.min !== undefined) {
				schema = schema.min(config.min);
			}
			if (config.max !== undefined) {
				schema = schema.max(config.max);
			}

			// Sign constraints
			if (config.positive) {
				schema = schema.positive();
			}
			if (config.negative) {
				schema = schema.negative();
			}
			if (config.nonNegative) {
				schema = schema.nonnegative();
			}
			if (config.nonPositive) {
				schema = schema.nonpositive();
			}

			// Type constraints
			if (config.int || config.mode === "integer" || config.mode === "smallint") {
				schema = schema.int();
			}
			if (config.finite ?? config.mode === "decimal") {
				schema = schema.finite();
			}
			if (config.safe) {
				schema = schema.safe();
			}

			// Step validation
			if (config.step !== undefined) {
				const step = config.step;
				schema = schema.refine(
					(val) => {
						// Check if value is a multiple of step (with floating point tolerance)
						const remainder = Math.abs(val % step);
						const tolerance = 1e-10;
						return remainder < tolerance || Math.abs(remainder - step) < tolerance;
					},
					{ message: `Value must be a multiple of ${step}` }
				);
			}

			// Nullability
			if (!config.required && config.nullable !== false) {
				return schema.nullish();
			}

			return schema;
		},

		getOperators() {
			return getNumberOperators();
		},

		getMetadata(config): FieldMetadataBase {
			return {
				type: "number",
				label: config.label,
				description: config.description,
				required: config.required ?? false,
				localized: config.localized ?? false,
				unique: config.unique ?? false,
				searchable: config.searchable ?? false,
				readOnly: config.input === false,
				writeOnly: config.output === false,
				validation: {
					min: config.min,
					max: config.max,
				},
			};
		},
	},
);

// Register in default registry
getDefaultRegistry().register("number", numberField);
