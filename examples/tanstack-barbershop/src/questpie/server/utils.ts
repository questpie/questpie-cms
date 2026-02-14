/**
 * Shared utilities for collection definitions.
 */

/**
 * Convert a string to a URL-friendly slug.
 * Handles Unicode/diacritics (e.g., "Holič" → "holic").
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // Remove diacritics
		.replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
		.replace(/^-+|-+$/g, "") // Trim hyphens from start/end
		.slice(0, 255);
}
