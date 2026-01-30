/**
 * Nested I18n Split Utilities
 *
 * Provides functionality to split merged data into structure and i18n values.
 * Used in beforeWrite hooks to separate localized content from structure.
 *
 * This is the reverse operation of deepMergeI18n from nested-i18n-merge.ts.
 *
 * ## Auto-detect mode
 *
 * Client wraps localized values in `{ $i18n: value }`:
 * ```typescript
 * { title: { $i18n: "Hello" }, alignment: "center" }
 * ```
 *
 * Server splits into:
 * - structure: `{ title: { $i18n: true }, alignment: "center" }`
 * - i18nValues: `{ title: "Hello" }`
 */

import { I18N_MARKER } from "./nested-i18n-merge.js";
import { isPlainObject } from "./path-utils.js";

/**
 * Check if a value is an i18n value wrapper: `{ $i18n: actualValue }`
 * This is used by clients to mark values as localized.
 */
export function isI18nValueWrapper(
	value: unknown,
): value is { $i18n: unknown } {
	return (
		isPlainObject(value) &&
		I18N_MARKER in (value as Record<string, unknown>) &&
		(value as Record<string, unknown>)[I18N_MARKER] !== true // Not a marker, has actual value
	);
}

/**
 * Auto-split nested data by detecting `{ $i18n: value }` wrappers.
 *
 * Client wraps localized values: `{ title: { $i18n: "Hello" }, alignment: "center" }`
 * Server splits into:
 * - structure: `{ title: { $i18n: true }, alignment: "center" }`
 * - i18nValues: `{ title: "Hello" }`
 *
 * @param data - Data with `{ $i18n: value }` wrappers for localized values
 * @returns Structure with markers and extracted i18n values
 */
export function autoSplitNestedI18n(data: unknown): SplitResult {
	if (data == null) {
		return { structure: null, i18nValues: null };
	}

	// Check if this is an i18n wrapper
	if (isI18nValueWrapper(data)) {
		return {
			structure: { [I18N_MARKER]: true },
			i18nValues: (data as { $i18n: unknown }).$i18n,
		};
	}

	// Handle arrays
	if (Array.isArray(data)) {
		const structureArr: unknown[] = [];
		const i18nArr: unknown[] = [];
		let hasI18n = false;

		for (const item of data) {
			const { structure, i18nValues } = autoSplitNestedI18n(item);
			structureArr.push(structure);
			i18nArr.push(i18nValues);
			if (i18nValues != null) hasI18n = true;
		}

		return {
			structure: structureArr,
			i18nValues: hasI18n ? i18nArr : null,
		};
	}

	// Handle objects
	if (isPlainObject(data)) {
		const obj = data as Record<string, unknown>;
		const structureObj: Record<string, unknown> = {};
		const i18nObj: Record<string, unknown> = {};
		let hasI18n = false;

		for (const [key, value] of Object.entries(obj)) {
			const { structure, i18nValues } = autoSplitNestedI18n(value);
			structureObj[key] = structure;
			if (i18nValues != null) {
				i18nObj[key] = i18nValues;
				hasI18n = true;
			}
		}

		return {
			structure: structureObj,
			i18nValues: hasI18n ? i18nObj : null,
		};
	}

	// Primitives - not localized
	return { structure: data, i18nValues: null };
}

/**
 * Result of splitting nested i18n data.
 */
export type SplitResult = {
	/** Structure with `{$i18n: true}` markers */
	structure: unknown;
	/** Extracted i18n values */
	i18nValues: unknown;
};
