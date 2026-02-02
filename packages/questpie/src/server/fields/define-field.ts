/**
 * Define Field Helper
 *
 * Helper function for creating type-safe field definitions.
 * This is the primary way to implement custom field types.
 *
 * Uses TState pattern for complete type inference from config.
 * No chaining, no builder class - just pure config-based field definitions.
 */

import type { SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { ZodType } from "zod";
import type {
	BaseFieldConfig,
	ContextualOperators,
	FieldDefinition,
	FieldDefinitionState,
	FieldLocation,
	FieldMetadata,
	JoinBuilder,
	SelectModifier,
} from "./types.js";

// ============================================================================
// Type Helpers for State Inference (from config only)
// ============================================================================

/**
 * Infer field location from config.
 * - localized: true → "i18n"
 * - virtual: true | SQL → "virtual"
 * - Otherwise → "main"
 */
type InferFieldLocation<TConfig extends BaseFieldConfig> = TConfig extends {
	virtual: true | SQL<unknown>;
}
	? "virtual"
	: TConfig extends { localized: true }
		? "i18n"
		: "main";

/**
 * Infer input type from config.
 * Handles required, default, virtual, input options.
 */
type InferInputType<TConfig extends BaseFieldConfig, TValue> = TConfig extends {
	// Virtual fields: no input by default (unless input: true)
	virtual: true | SQL<unknown>;
}
	? TConfig extends { input: true }
		? TValue | undefined
		: never
	: // Input explicitly disabled
		TConfig extends { input: false }
		? never
		: // Input optional (field is nullable in DB)
			TConfig extends { input: "optional" }
			? TValue | undefined
			: // Required field
				TConfig extends { required: true }
				? TValue
				: // Has default value
					TConfig extends { default: infer TDefault }
					? TDefault extends () => infer TReturn
						? TValue | undefined // Factory function
						: TValue | undefined // Static default
					: TValue | null | undefined; // Nullable by default

/**
 * Infer output type from config.
 * Handles output: false and access.read functions.
 */
type InferOutputType<
	TConfig extends BaseFieldConfig,
	TValue,
> = TConfig extends { output: false } // Output explicitly disabled
	? never
	: TConfig extends { access: { read: (...args: unknown[]) => unknown } }
		? // Access control with function = might be filtered at runtime
				| (TConfig extends { required: true }
						? TConfig extends { nullable: true }
							? TValue | null
							: TValue
						: TConfig extends { nullable: false }
							? TValue
							: TValue | null)
				| undefined
		: // Output nullability mirrors column nullability (required/nullable)
			TConfig extends { required: true }
			? TConfig extends { nullable: true }
				? TValue | null
				: TValue
			: TConfig extends { nullable: false }
				? TValue
				: TValue | null;

/**
 * Infer column type from config.
 * Virtual fields have null columns.
 */
type InferColumnType<
	TConfig extends BaseFieldConfig,
	TColumn extends AnyPgColumn | null,
> = TConfig extends { virtual: true | SQL<unknown> } ? null : TColumn;

/**
 * Build complete field state from config.
 * This is the TState that FieldDefinition will use.
 */
type BuildFieldState<
	TType extends string,
	TConfig extends BaseFieldConfig,
	TValue,
	TColumn extends AnyPgColumn | null,
> = {
	type: TType;
	config: TConfig;
	value: TValue;
	input: InferInputType<TConfig, TValue>;
	output: InferOutputType<TConfig, TValue>;
	column: InferColumnType<TConfig, TColumn>;
	location: InferFieldLocation<TConfig>;
};

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
	) => Record<string, FieldDefinition<FieldDefinitionState>> | undefined;

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
 * Define a new field type using TState pattern.
 *
 * Returns a factory function that creates FieldDefinition with complete
 * type information inferred from the config object.
 *
 * Type inference (all from config):
 * - TState.location: "main" | "i18n" | "virtual" | "relation"
 * - TState.input: Required, optional, or never (based on required/default/virtual/input)
 * - TState.output: Value or never (based on output/access)
 * - TState.column: Column type or null (based on virtual)
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
 *     return { type: "text", required: !!config.required };
 *   },
 * });
 *
 * // Usage - all types inferred from config (no chaining, no .build()):
 * const posts = q.collection("posts").fields((f) => ({
 *   // Main table field
 *   title: f.text({ maxLength: 255, required: true }),
 *   // → TState.location = "main"
 *   // → TState.input = string
 *   // → TState.output = string
 *   // → TState.column = PgVarchar
 *
 *   // i18n table field
 *   content: f.text({ localized: true }),
 *   // → TState.location = "i18n"
 *   // → TState.input = string | null | undefined
 *   // → TState.output = string
 *
 *   // Virtual field (computed)
 *   excerpt: f.text({ virtual: true }),
 *   // → TState.location = "virtual"
 *   // → TState.column = null
 *   // → TState.input = never
 * }));
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
): <const TUserConfig extends TConfig>(
	config?: TUserConfig,
) => FieldDefinition<BuildFieldState<TType, TUserConfig, TValue, TColumn>> {
	return <const TUserConfig extends TConfig>(
		config: TUserConfig = {} as TUserConfig,
	) => {
		const fieldConfig = config;

		// Infer location from config at runtime
		const location: FieldLocation =
			"virtual" in config &&
			(config.virtual === true ||
				(typeof config.virtual === "object" && config.virtual !== null))
				? "virtual"
				: config.localized === true
					? "i18n"
					: "main";

		// Build the complete field state
		// Type casting is necessary because runtime location is a union,
		// but TypeScript needs to know it's the specific inferred type
		const state = {
			type,
			config: fieldConfig,
			value: undefined as TValue,
			input: undefined as InferInputType<TUserConfig, TValue>,
			output: undefined as InferOutputType<TUserConfig, TValue>,
			column: undefined as unknown as InferColumnType<TUserConfig, TColumn>,
			location: location as InferFieldLocation<TUserConfig>,
		};

		// Return FieldDefinition with full TState
		return {
			state,
			$types: {} as {
				value: TValue;
				input: InferInputType<TUserConfig, TValue>;
				output: InferOutputType<TUserConfig, TValue>;
				column: InferColumnType<TUserConfig, TColumn>;
				location: InferFieldLocation<TUserConfig>;
			},
			toColumn(name: string) {
				// Virtual fields don't have columns
				if (location === "virtual") {
					return null;
				}
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
				? () =>
						implementation.getNestedFields!(fieldConfig) as Record<
							string,
							FieldDefinition<FieldDefinitionState>
						>
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
				? (value: unknown) => implementation.toDb!(value as TValue, fieldConfig)
				: undefined,
		} as FieldDefinition<BuildFieldState<TType, TUserConfig, TValue, TColumn>>;
	};
}
