/**
 * Field Builder Proxy
 *
 * Creates a type-safe proxy object that provides field factory methods.
 * Usage: f.text({ required: true }), f.number({ min: 0 }), etc.
 */

import type { AnyFieldFactory, FieldRegistry } from "./registry.js";
import type { FieldDefinition, BaseFieldConfig } from "./types.js";

// ============================================================================
// Field Builder Proxy Types
// ============================================================================

/**
 * Type map for registered fields.
 * Used to provide type-safe autocomplete for f.text(), f.number(), etc.
 *
 * This can be extended via module augmentation for custom fields:
 * ```ts
 * declare module "questpie/server/fields/builder" {
 *   interface FieldTypeMap {
 *     myCustomField: typeof myCustomFieldFactory;
 *   }
 * }
 * ```
 */
export interface FieldTypeMap {
	// Built-in fields will be added here via module augmentation
	// when the built-in fields module is loaded
	[key: string]: AnyFieldFactory;
}

/**
 * Default field type map for built-in fields.
 * Provides full type inference for standard fields.
 *
 * Note: This interface is populated by the builtin fields module.
 * It's defined here for type-level extension.
 */
export interface DefaultFieldTypeMap extends FieldTypeMap {}

/**
 * Field builder proxy type.
 * Provides type-safe access to field factories.
 *
 * @template TMap - The field type map to use (defaults to DefaultFieldTypeMap)
 *
 * @example
 * ```ts
 * // Using the proxy:
 * const fields = {
 *   title: f.text({ required: true, maxLength: 255 }),
 *   count: f.number({ min: 0 }),
 *   isActive: f.boolean({ default: true }),
 * };
 * ```
 */
export type FieldBuilderProxy<TMap extends FieldTypeMap = DefaultFieldTypeMap> =
	{
		[K in keyof TMap]: TMap[K];
	};

// ============================================================================
// Field Builder Creation
// ============================================================================

/**
 * Create a field builder proxy from a registry.
 * The proxy provides type-safe access to all registered field factories.
 *
 * @param registry - The field registry to use
 * @returns A proxy object with field factory methods
 *
 * @example
 * ```ts
 * const registry = getDefaultRegistry();
 * const f = createFieldBuilder(registry);
 *
 * const fields = {
 *   title: f.text({ required: true }),
 *   count: f.number(),
 * };
 * ```
 */
export function createFieldBuilder<TMap extends FieldTypeMap = DefaultFieldTypeMap>(
	registry: FieldRegistry,
): FieldBuilderProxy<TMap> {
	// Create a proxy that delegates to the registry
	return new Proxy({} as FieldBuilderProxy<TMap>, {
		get(_target, prop: string) {
			const factory = registry.get(prop);
			if (!factory) {
				throw new Error(
					`Unknown field type: "${prop}". ` +
						`Available types: ${registry.types().join(", ")}`,
				);
			}
			return factory;
		},

		has(_target, prop: string) {
			return registry.has(prop);
		},

		ownKeys() {
			return registry.types();
		},

		getOwnPropertyDescriptor(_target, prop: string) {
			if (registry.has(prop)) {
				return {
					configurable: true,
					enumerable: true,
					value: registry.get(prop),
				};
			}
			return undefined;
		},
	});
}

// ============================================================================
// Field Definition Extraction
// ============================================================================

/**
 * Extract field definitions from a fields function result.
 * Separates field definitions from the Drizzle columns they generate.
 *
 * @param fields - Object with field definitions
 * @returns Object with both field definitions and extracted columns
 */
export function extractFieldDefinitions<
	TFields extends Record<string, FieldDefinition>,
>(fields: TFields): {
	definitions: TFields;
	columns: Record<string, unknown>;
} {
	const columns: Record<string, unknown> = {};

	for (const [name, fieldDef] of Object.entries(fields)) {
		const column = fieldDef.toColumn(name);
		if (column !== null) {
			if (Array.isArray(column)) {
				// Multiple columns (e.g., polymorphic relation with type + id)
				for (const col of column) {
					const colName = (col as { name?: string }).name ?? name;
					columns[colName] = col;
				}
			} else {
				columns[name] = column;
			}
		}
	}

	return {
		definitions: fields,
		columns,
	};
}

/**
 * Type helper to infer field types from a fields factory function.
 */
export type InferFieldsFromFactory<
	TFactory extends (f: FieldBuilderProxy) => Record<string, FieldDefinition>,
> = ReturnType<TFactory>;

/**
 * Type helper to extract value types from field definitions.
 */
export type FieldValues<TFields extends Record<string, FieldDefinition>> = {
	[K in keyof TFields]: TFields[K]["$types"]["value"];
};

/**
 * Type helper to extract input types from field definitions.
 */
export type FieldInputs<TFields extends Record<string, FieldDefinition>> = {
	[K in keyof TFields as TFields[K]["$types"]["input"] extends never
		? never
		: K]: TFields[K]["$types"]["input"];
};

/**
 * Type helper to extract output types from field definitions.
 */
export type FieldOutputs<TFields extends Record<string, FieldDefinition>> = {
	[K in keyof TFields as TFields[K]["$types"]["output"] extends never
		? never
		: K]: TFields[K]["$types"]["output"];
};
