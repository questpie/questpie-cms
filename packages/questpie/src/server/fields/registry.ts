/**
 * Field Registry
 *
 * Registry for field types. Allows registration of built-in and custom fields.
 * The registry maps field type names to their factory functions.
 */

import type {
	AnyFieldDefinition,
	BaseFieldConfig,
	FieldDefinition,
	InferColumnType,
	InferInputType,
	InferOutputType,
} from "./types.js";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

// ============================================================================
// Field Factory Type
// ============================================================================

/**
 * Factory function that creates a field definition from config.
 *
 * Type parameters match FieldDefinition for consistency:
 * - TType: Field type identifier
 * - TConfig: Configuration object type (extends BaseFieldConfig)
 * - TValue: Base runtime value type
 * - TInput: Input type (inferred from config via InferInputType)
 * - TOutput: Output type (inferred from config via InferOutputType)
 * - TColumn: Drizzle column type (inferred from toColumn return)
 *
 * See "Type System & Inference" section for detailed type derivation.
 */
export type FieldFactory<
	TType extends string = string,
	TConfig extends BaseFieldConfig = BaseFieldConfig,
	TValue = unknown,
	TColumn extends AnyPgColumn = AnyPgColumn,
> = <TUserConfig extends TConfig>(
	config?: TUserConfig,
) => FieldDefinition<
	TType,
	TUserConfig,
	TValue,
	InferInputType<TUserConfig, TValue>,
	InferOutputType<TUserConfig, TValue>,
	InferColumnType<TUserConfig, TColumn>
>;

/**
 * Generic field factory type for registry storage.
 */
export type AnyFieldFactory = (config?: BaseFieldConfig) => AnyFieldDefinition;

// ============================================================================
// Field Registry
// ============================================================================

/**
 * Registry for field types.
 * Allows registration of built-in and custom fields.
 */
export class FieldRegistry {
	/** Registered field factories */
	private fields: Map<string, AnyFieldFactory> = new Map();

	/**
	 * Register a field type.
	 *
	 * @param type - The field type identifier (e.g., "text", "number")
	 * @param factory - Factory function that creates field definitions
	 * @returns this (for chaining)
	 *
	 * @example
	 * ```ts
	 * registry.register("text", textFieldFactory);
	 * registry.register("number", numberFieldFactory);
	 * ```
	 */
	register<TType extends string, TConfig extends BaseFieldConfig, TValue>(
		type: TType,
		factory: FieldFactory<TType, TConfig, TValue, AnyPgColumn>,
	): this {
		this.fields.set(type, factory as AnyFieldFactory);
		return this;
	}

	/**
	 * Get field factory by type.
	 *
	 * @param type - The field type identifier
	 * @returns The field factory or undefined if not registered
	 *
	 * @example
	 * ```ts
	 * const textFactory = registry.get("text");
	 * if (textFactory) {
	 *   const field = textFactory({ required: true });
	 * }
	 * ```
	 */
	get<TType extends string>(type: TType): AnyFieldFactory | undefined {
		return this.fields.get(type);
	}

	/**
	 * Check if field type is registered.
	 *
	 * @param type - The field type identifier
	 * @returns true if the type is registered
	 */
	has(type: string): boolean {
		return this.fields.has(type);
	}

	/**
	 * Get all registered field types.
	 *
	 * @returns Array of registered type names
	 */
	types(): string[] {
		return Array.from(this.fields.keys());
	}

	/**
	 * Get the number of registered field types.
	 */
	get size(): number {
		return this.fields.size;
	}

	/**
	 * Create a shallow copy of this registry.
	 * Useful for extending built-in registry with custom fields.
	 *
	 * @returns New registry with same field registrations
	 */
	clone(): FieldRegistry {
		const newRegistry = new FieldRegistry();
		for (const [type, factory] of this.fields) {
			newRegistry.fields.set(type, factory);
		}
		return newRegistry;
	}
}

/**
 * Default global registry instance.
 * Built-in fields are registered here during module initialization.
 */
let defaultRegistry: FieldRegistry | null = null;

/**
 * Get the default field registry.
 * Creates it if it doesn't exist yet.
 *
 * @returns The default field registry instance
 */
export function getDefaultRegistry(): FieldRegistry {
	if (!defaultRegistry) {
		defaultRegistry = new FieldRegistry();
	}
	return defaultRegistry;
}

/**
 * Create a new field registry.
 * Use this when you need isolated registries (e.g., for testing).
 *
 * @returns A new empty field registry
 */
export function createFieldRegistry(): FieldRegistry {
	return new FieldRegistry();
}
