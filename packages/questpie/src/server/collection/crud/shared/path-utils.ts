/**
 * Path Utilities for Nested Object Manipulation
 *
 * Provides utilities for working with nested objects.
 */

/**
 * Check if a value is a plain object (not array, not null, not class instance).
 *
 * @param value - Value to check
 * @returns True if plain object
 */
export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (value == null || typeof value !== "object") {
		return false;
	}
	if (Array.isArray(value)) {
		return false;
	}
	const proto = Object.getPrototypeOf(value);
	return proto === null || proto === Object.prototype;
}
