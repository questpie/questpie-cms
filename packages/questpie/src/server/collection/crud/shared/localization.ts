/**
 * Shared Localization Utilities
 *
 * Provides field splitting utilities for localized content.
 * Supports two types of localization:
 * 1. Flat localized fields - entire column is localized (e.g., title, description)
 * 2. JSONB whole-mode - entire JSONB object per locale
 * 3. JSONB nested-mode - { $i18n: value } wrappers within JSONB field
 */

import { deepMergeI18n } from "./nested-i18n-merge.js";
import { autoSplitNestedI18n } from "./nested-i18n-split.js";

/**
 * Constant for the _localized column name in i18n table
 */
export const LOCALIZED_COLUMN = "_localized";

/**
 * Localization mode for fields
 */
type LocalizationMode = "whole" | "nested";

/**
 * Parse a localized field name to extract field name and mode.
 * Supports syntax: "fieldName" (default whole) or "fieldName:nested"
 */
function parseLocalizedField(localizedField: string): {
	name: string;
	mode: LocalizationMode;
} {
	if (localizedField.endsWith(":nested")) {
		return {
			name: localizedField.slice(0, -7), // Remove ":nested"
			mode: "nested",
		};
	}
	return {
		name: localizedField,
		mode: "whole",
	};
}

/**
 * Get localization mode for a specific field name.
 * Searches the localized array for the field name with optional :nested suffix.
 */
function getLocalizedFieldMode(
	localizedArray: readonly string[],
	fieldName: string,
): LocalizationMode | null {
	for (const localizedField of localizedArray) {
		const parsed = parseLocalizedField(localizedField);
		if (parsed.name === fieldName) {
			return parsed.mode;
		}
	}
	return null;
}

/**
 * Split input data into localized and non-localized fields.
 * Auto-detects { $i18n: value } wrappers for nested-mode JSONB fields.
 *
 * Handles three types of localized fields:
 * 1. Flat localized (text, varchar, etc.) - entire value goes to i18n table column
 * 2. JSONB whole-mode - entire JSONB object goes to i18n table column
 * 3. JSONB nested-mode - structure stays in main table, extracted $i18n values go to _localized column
 *
 * @param input - Input data object
 * @param localizedFields - Array of field names marked as localized (may include ":nested" suffix)
 * @returns Object with localized fields, nonLocalized fields, and nested localized values
 */
export function splitLocalizedFields(
	input: Record<string, any>,
	localizedFields: readonly string[],
): {
	localized: Record<string, any>;
	nonLocalized: Record<string, any>;
	nestedLocalized: Record<string, any> | null;
} {
	const localized: Record<string, any> = {};
	const nonLocalized: Record<string, any> = {};
	const nestedLocalized: Record<string, any> = {};
	let hasNestedLocalized = false;

	for (const [key, value] of Object.entries(input)) {
		const mode = getLocalizedFieldMode(localizedFields, key);

		// Check for { $i18n: value } wrappers in object values (nested-mode detection)
		if (value != null && typeof value === "object" && !Array.isArray(value)) {
			const { structure, i18nValues } = autoSplitNestedI18n(value);

			// If we found any $i18n wrappers, this must be nested-mode
			if (i18nValues != null) {
				// Verify that field is marked as nested-mode (or not localized at all - client might send $i18n anyway)
				if (mode === "nested" || mode === null) {
					// Structure (with $i18n: true markers) goes to main table
					nonLocalized[key] = structure;
					// Extracted values go to _localized column
					nestedLocalized[key] = i18nValues;
					hasNestedLocalized = true;
					continue;
				}
				// If mode is 'whole' but client sent $i18n wrappers, treat as error or fall through
				// For now, fall through to handle as whole-mode JSONB
			}

			// Object value without $i18n wrappers
			if (mode === "whole") {
				// JSONB whole-mode - entire object goes to i18n table column
				localized[key] = value;
				continue;
			}

			if (mode === "nested") {
				// Nested-mode but no $i18n wrappers - structure goes to main table, nothing to _localized
				nonLocalized[key] = value;
				continue;
			}

			// Not localized - JSONB field goes to main table
			nonLocalized[key] = value;
			continue;
		}

		// Primitive value (string, number, null, etc.)
		if (mode !== null) {
			// Localized field (flat or whole-mode if it was JSONB)
			localized[key] = value;
		} else {
			// Non-localized field - goes to main table
			nonLocalized[key] = value;
		}
	}

	return {
		localized,
		nonLocalized,
		nestedLocalized: hasNestedLocalized ? nestedLocalized : null,
	};
}

/**
 * Merge nested localized values from _localized column into row data.
 * For each field with $i18n markers, replaces markers with actual values.
 *
 * @param row - Row data with structure from main table
 * @param localizedCurrent - Current locale _localized data
 * @param localizedFallback - Fallback locale _localized data
 * @returns Row with nested localized values merged
 */
export function mergeNestedLocalizedFromColumn(
	row: Record<string, any>,
	localizedCurrent: Record<string, any> | null | undefined,
	localizedFallback: Record<string, any> | null | undefined,
): Record<string, any> {
	const result = { ...row };

	// Check each field for $i18n markers
	for (const [fieldName, value] of Object.entries(row)) {
		// Skip if not an object or doesn't have i18n markers
		if (!hasI18nMarkers(value)) continue;

		// Build i18n chain for this field from _localized column
		const fieldI18nChain = [
			localizedCurrent?.[fieldName],
			localizedFallback?.[fieldName],
		];

		// Merge using deepMergeI18n
		result[fieldName] = deepMergeI18n(value, fieldI18nChain);
	}

	return result;
}

/**
 * Check if a value contains $i18n markers (indicating nested localization).
 * Recursively checks nested objects.
 *
 * @param value - Value to check
 * @returns True if value contains any $i18n markers
 */
export function hasI18nMarkers(value: unknown): boolean {
	if (value == null || typeof value !== "object") {
		return false;
	}

	// Check if this is an $i18n marker
	if (
		typeof value === "object" &&
		(value as Record<string, unknown>).$i18n === true
	) {
		return true;
	}

	// Check array elements
	if (Array.isArray(value)) {
		return value.some(hasI18nMarkers);
	}

	// Check object properties
	for (const prop of Object.values(value)) {
		if (hasI18nMarkers(prop)) {
			return true;
		}
	}

	return false;
}

/**
 * Auto-detect and merge nested localized JSONB fields.
 * Scans the row for fields containing $i18n markers and applies merge.
 *
 * @param row - Row data from main table
 * @param i18nCurrent - Current locale i18n data (or null)
 * @param i18nFallback - Fallback locale i18n data (or null)
 * @returns Row with nested localized fields merged
 */
export function autoMergeNestedLocalizedFields(
	row: Record<string, any>,
	i18nCurrent: Record<string, any> | null | undefined,
	i18nFallback: Record<string, any> | null | undefined,
): Record<string, any> {
	const result = { ...row };

	for (const [fieldName, value] of Object.entries(row)) {
		// Skip if not an object or doesn't have i18n markers
		if (!hasI18nMarkers(value)) continue;

		// Build i18n chain for this field
		const fieldI18nChain = [
			i18nCurrent?.[fieldName],
			i18nFallback?.[fieldName],
		];

		// Merge using deepMergeI18n
		result[fieldName] = deepMergeI18n(value, fieldI18nChain);
	}

	return result;
}
