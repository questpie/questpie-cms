/**
 * Field Definition & Factory
 *
 * Defines reusable field types with form and cell components.
 * The `field()` factory returns a plain frozen object.
 *
 * A field definition is just a registry entry: name → component mapping.
 * All config/options flow from server introspection at runtime.
 */

import type { MaybeLazyComponent } from "../types/common";

// ============================================================================
// Field Definition (plain frozen object)
// ============================================================================

/**
 * Field definition — a registry entry mapping a field type name to its components.
 *
 * This is what the admin module stores per field type. All field options
 * (label, required, validation, etc.) come from server introspection at runtime,
 * not from the FE definition.
 */
export interface FieldDefinition<TName extends string = string> {
	readonly name: TName;
	readonly component: MaybeLazyComponent;
	readonly cell?: MaybeLazyComponent;
}

/**
 * A field instance with runtime options from server introspection.
 * Created by `configureField()` when mapping server metadata to field rendering.
 */
export interface FieldInstance {
	readonly name: string;
	readonly component: MaybeLazyComponent;
	readonly cell?: MaybeLazyComponent;
	readonly "~options": Record<string, unknown>;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a field definition as a plain frozen object.
 *
 * @param name - Field type name (e.g. "text", "relation")
 * @param config - Component and optional cell component
 *
 * @example
 * ```ts
 * export default field("text", {
 *   component: () => import("./text-field.js"),
 *   cell: () => import("./cells/primitive-cells.js"),
 * });
 * ```
 */
export function field<TName extends string>(
	name: TName,
	config: {
		component: MaybeLazyComponent;
		cell?: MaybeLazyComponent;
	},
): FieldDefinition<TName> {
	return Object.freeze({
		name,
		component: config.component,
		cell: config.cell,
	});
}

/**
 * Create a configured field instance (field + server-provided options).
 * Used when mapping server introspection metadata to field rendering.
 */
export function configureField(
	base: FieldDefinition,
	options: Record<string, unknown>,
): FieldInstance {
	return Object.freeze({
		name: base.name,
		component: base.component,
		cell: base.cell,
		"~options": options,
	});
}
