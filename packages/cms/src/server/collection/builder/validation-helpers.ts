/**
 * Validation helpers for collections
 * Creates merged field definitions for validation purposes
 */

import type { PgColumn } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import type { z } from "zod";
import {
	createInsertSchema,
	createUpdateSchema,
} from "#questpie/cms/server/utils/drizzle-to-zod";

/**
 * Merge main table fields with localized fields into a single flat structure
 * This is used for validation where we receive all fields together in the input
 *
 * @example
 * ```ts
 * const mainFields = { name: varchar('name', { length: 255 }), price: integer('price') }
 * const localizedFields = { title: varchar('title', { length: 255 }), description: text('description') }
 *
 * const merged = mergeFi eldsForValidation('products', mainFields, localizedFields)
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

/**
 * Validation schemas for a collection
 */
export interface ValidationSchemas {
	/** Schema for insert operations (create) */
	insertSchema: z.ZodObject<any>;
	/** Schema for update operations (partial) */
	updateSchema: z.ZodObject<any>;
}

/**
 * Create validation schemas for a collection
 *
 * @param tableName - Name of the collection
 * @param mainFields - Non-localized fields from main table
 * @param localizedFields - Localized fields from i18n table
 * @param options - Schema generation options
 */
export function createCollectionValidationSchemas<
	TMainFields extends Record<string, PgColumn>,
	TLocalizedFields extends Record<string, PgColumn>,
>(
	tableName: string,
	mainFields: TMainFields,
	localizedFields: TLocalizedFields,
	options?: {
		/** Fields to exclude from validation (e.g., id, createdAt, updatedAt) */
		exclude?: Record<string, true>;
		/** Custom refinements per field */
		refine?: Record<string, (schema: z.ZodTypeAny) => z.ZodTypeAny>;
	},
): ValidationSchemas {
	// Create merged table for validation
	const validationTable = mergeFieldsForValidation(
		tableName,
		mainFields,
		localizedFields,
	);

	// Generate schemas using drizzle-to-zod utilities
	const insertSchema = createInsertSchema(validationTable, {
		exclude: options?.exclude || {},
		refine: options?.refine as any,
	});

	const updateSchema = createUpdateSchema(validationTable, {
		exclude: options?.exclude || {},
		refine: options?.refine as any,
	});

	return {
		insertSchema,
		updateSchema,
	};
}
