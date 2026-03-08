/**
 * Shared Validation Utilities
 *
 * Functions shared between collection and global validation helpers.
 */

import type { PgColumn } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

/**
 * Merge main table fields with localized fields into a single flat structure.
 * This is used for validation where we receive all fields together in the input.
 *
 * @example
 * ```ts
 * const mainFields = { name: varchar('name', { length: 255 }), price: integer('price') }
 * const localizedFields = { title: varchar('title', { length: 255 }), description: text('description') }
 *
 * const merged = mergeFieldsForValidation('products', mainFields, localizedFields)
 * // Result: pgTable with all fields: { name, price, title, description }
 * ```
 */
export function mergeFieldsForValidation<
	TMainFields extends Record<string, PgColumn>,
	TLocalizedFields extends Record<string, PgColumn>,
>(
	tableName: string,
	mainFields: TMainFields,
	localizedFields: TLocalizedFields,
): ReturnType<
	typeof pgTable<
		string,
		TMainFields & TLocalizedFields extends infer R
			? R extends Record<string, PgColumn>
				? R
				: never
			: never
	>
> {
	// Merge fields into single object
	const mergedFields = {
		...mainFields,
		...localizedFields,
	} as TMainFields & TLocalizedFields;

	// Create a virtual table for validation purposes
	// This table is never actually used in the database
	return pgTable(`${tableName}_validation`, mergedFields) as any;
}
