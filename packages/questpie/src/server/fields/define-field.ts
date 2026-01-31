/**
 * Define Field Helper
 *
 * Helper function for creating type-safe field definitions.
 * This is the primary way to implement custom field types.
 */

import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { ZodType } from "zod";
import type {
	BaseFieldConfig,
	ContextualOperators,
	FieldDefinition,
	FieldMetadata,
	InferColumnType,
	InferInputType,
	InferOutputType,
	JoinBuilder,
	SelectModifier,
} from "./types.js";

// ============================================================================
// Field Implementation Options
// ============================================================================

/**
 * Options for implementing a field type.
 * Provides all the methods needed by FieldDefinition.
 */
export interface FieldImplementation<
	TType extends string,
	TConfig extends BaseFieldConfig,
	TValue,
	TColumn extends AnyPgColumn | null = AnyPgColumn | null,
> {
	/**
	 * Generate Drizzle column(s) for this field.
	 * May return single column, multiple, or null for virtual fields.
	 */
	toColumn: (name: string, config: TConfig) => TColumn | TColumn[] | null;

	/**
	 * Generate Zod schema for input validation.
	 */
	toZodSchema: (config: TConfig) => ZodType;

	/**
	 * Get operators for query builder.
	 * Return both column and JSONB variants.
	 */
	getOperators: (config: TConfig) => ContextualOperators;

	/**
	 * Get metadata for admin introspection.
	 */
	getMetadata: (config: TConfig) => FieldMetadata;

	/**
	 * Optional: Get nested fields (for object/array types).
	 */
	getNestedFields?: (
		config: TConfig,
	) => Record<string, FieldDefinition> | undefined;

	/**
	 * Optional: Modify select query (for relations, computed fields).
	 */
	getSelectModifier?: (config: TConfig) => SelectModifier | undefined;

	/**
	 * Optional: Build joins for relation fields.
	 */
	getJoinBuilder?: (config: TConfig) => JoinBuilder | undefined;

	/**
	 * Optional: Transform value after reading from DB.
	 */
	fromDb?: (dbValue: unknown, config: TConfig) => TValue;

	/**
	 * Optional: Transform value before writing to DB.
	 */
	toDb?: (value: TValue, config: TConfig) => unknown;
}

// ============================================================================
// Define Field Helper
// ============================================================================

/**
 * Define a new field type.
 *
 * This is the primary way to implement custom field types. It takes the field
 * type identifier and implementation options, returning a factory function
 * that creates field definitions.
 *
 * @param type - The field type identifier (e.g., "text", "number")
 * @param implementation - Object with methods to implement field behavior
 * @returns A factory function that creates field definitions
 *
 * @example
 * ```ts
 * const textField = defineField<"text", TextFieldConfig, string>("text", {
 *   toColumn(name, config) {
 *     return config.mode === "text"
 *       ? text(name)
 *       : varchar(name, { length: config.maxLength ?? 255 });
 *   },
 *   toZodSchema(config) {
 *     let schema = z.string();
 *     if (config.maxLength) schema = schema.max(config.maxLength);
 *     return config.required ? schema : schema.nullish();
 *   },
 *   getOperators(config) {
 *     return { column: stringColumnOperators, jsonb: stringJsonbOperators };
 *   },
 *   getMetadata(config) {
 *     return { type: "text", required: !!config.required, ... };
 *   },
 * });
 * ```
 */
export function defineField<
	TType extends string,
	TConfig extends BaseFieldConfig,
	TValue,
	TColumn extends AnyPgColumn = AnyPgColumn,
>(
	type: TType,
	implementation: FieldImplementation<TType, TConfig, TValue, TColumn>,
): <TUserConfig extends TConfig>(
	config?: TUserConfig,
) => FieldDefinition<
	TType,
	TUserConfig,
	TValue,
	InferInputType<TUserConfig, TValue>,
	InferOutputType<TUserConfig, TValue>,
	InferColumnType<TUserConfig, TColumn>
> {
	return <TUserConfig extends TConfig>(config: TUserConfig = {} as TUserConfig) => {
		const fieldConfig = config;

		return {
			type,
			config: fieldConfig,

			// Phantom types for type inference
			$types: {} as {
				value: TValue;
				input: InferInputType<TUserConfig, TValue>;
				output: InferOutputType<TUserConfig, TValue>;
				column: InferColumnType<TUserConfig, TColumn>;
			},

			toColumn(name: string) {
				return implementation.toColumn(name, fieldConfig);
			},

			toZodSchema() {
				return implementation.toZodSchema(fieldConfig);
			},

			getOperators() {
				return implementation.getOperators(fieldConfig);
			},

			getMetadata() {
				return implementation.getMetadata(fieldConfig);
			},

			getNestedFields: implementation.getNestedFields
				? () => implementation.getNestedFields!(fieldConfig)
				: undefined,

			getSelectModifier: implementation.getSelectModifier
				? () => implementation.getSelectModifier!(fieldConfig)
				: undefined,

			getJoinBuilder: implementation.getJoinBuilder
				? () => implementation.getJoinBuilder!(fieldConfig)
				: undefined,

			fromDb: implementation.fromDb
				? (dbValue: unknown) => implementation.fromDb!(dbValue, fieldConfig)
				: undefined,

			toDb: implementation.toDb
				? (value: unknown) =>
						implementation.toDb!(value as TValue, fieldConfig)
				: undefined,
		} as FieldDefinition<
			TType,
			TUserConfig,
			TValue,
			InferInputType<TUserConfig, TValue>,
			InferOutputType<TUserConfig, TValue>,
			InferColumnType<TUserConfig, TColumn>
		>;
	};
}
