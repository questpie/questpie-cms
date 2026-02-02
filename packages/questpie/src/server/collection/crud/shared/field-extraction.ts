/**
 * Field Extraction Utilities (TState-based)
 * 
 * Runtime helpers to extract field information from FieldDefinition TState.
 * Replaces the old localized[] array approach.
 */

import type { FieldDefinition, FieldDefinitionState } from "#questpie/server/fields/types.js";

/**
 * Extract field names by location from field definitions.
 * Runtime version of ExtractFieldsByLocation type.
 */
export function extractFieldNamesByLocation(
	fieldDefinitions: Record<string, FieldDefinition<FieldDefinitionState>>,
	location: "main" | "i18n" | "virtual" | "relation",
): string[] {
	const names: string[] = [];
	for (const [name, fieldDef] of Object.entries(fieldDefinitions)) {
		if (fieldDef.state.location === location) {
			names.push(name);
		}
	}
	return names;
}

/**
 * Extract localized field names (for i18n operations).
 * Replaces the old state.localized array.
 */
export function extractLocalizedFieldNames(
	fieldDefinitions: Record<string, FieldDefinition<FieldDefinitionState>>,
): string[] {
	return extractFieldNamesByLocation(fieldDefinitions, "i18n");
}

/**
 * Extract main field names.
 */
export function extractMainFieldNames(
	fieldDefinitions: Record<string, FieldDefinition<FieldDefinitionState>>,
): string[] {
	return extractFieldNamesByLocation(fieldDefinitions, "main");
}

/**
 * Extract virtual field names.
 */
export function extractVirtualFieldNames(
	fieldDefinitions: Record<string, FieldDefinition<FieldDefinitionState>>,
): string[] {
	return extractFieldNamesByLocation(fieldDefinitions, "virtual");
}

/**
 * Check if collection has any localized fields.
 */
export function hasLocalizedFields(
	fieldDefinitions: Record<string, FieldDefinition<FieldDefinitionState>> | undefined,
): boolean {
	if (!fieldDefinitions) return false;
	return extractLocalizedFieldNames(fieldDefinitions).length > 0;
}

/**
 * Check if collection has any virtual fields.
 */
export function hasVirtualFields(
	fieldDefinitions: Record<string, FieldDefinition<FieldDefinitionState>> | undefined,
): boolean {
	if (!fieldDefinitions) return false;
	return extractVirtualFieldNames(fieldDefinitions).length > 0;
}

/**
 * Split fields into main and localized for data operations.
 * Returns { main: Record, localized: Record }
 */
export function splitFieldsByLocation<T extends Record<string, any>>(
	data: T,
	fieldDefinitions: Record<string, FieldDefinition<FieldDefinitionState>>,
): { main: Partial<T>; localized: Partial<T> } {
	const main: Partial<T> = {};
	const localized: Partial<T> = {};

	const localizedNames = new Set(extractLocalizedFieldNames(fieldDefinitions));

	for (const [key, value] of Object.entries(data)) {
		if (localizedNames.has(key)) {
			(localized as any)[key] = value;
		} else {
			(main as any)[key] = value;
		}
	}

	return { main, localized };
}

/**
 * Merge localized fields back into main data.
 * Inverse of splitFieldsByLocation.
 */
export function mergeFieldsByLocation<T extends Record<string, any>>(
	main: Partial<T>,
	localized: Partial<T>,
): Partial<T> {
	return { ...main, ...localized };
}
