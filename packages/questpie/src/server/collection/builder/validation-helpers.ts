/**
 * Validation helpers for collections
 * Creates merged field definitions for validation purposes
 */

import type { PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import type {
	FieldDefinition,
	FieldDefinitionState,
	RelationFieldMetadata,
} from "#questpie/server/fields/types.js";
import { mergeFieldsForValidation } from "#questpie/server/fields/validation-utils.js";
import {
	createInsertSchema,
	createUpdateSchema,
} from "#questpie/server/utils/drizzle-to-zod.js";

export { mergeFieldsForValidation };

/**
 * Validation schemas for a collection
 */
export interface ValidationSchemas {
	/** Schema for insert operations (create) - may include preprocessing for relation fields */
	insertSchema: z.ZodTypeAny;
	/** Schema for update operations (partial) - may include preprocessing for relation fields */
	updateSchema: z.ZodTypeAny;
}

/**
 * Extract relation field mappings from field definitions.
 *
 * With the unified field API, the FK column key is the same as the field name.
 * This function now returns an empty map since no transformation is needed.
 *
 * @param fieldDefinitions - Collection field definitions
 * @returns Empty map (no transformation needed with unified field API)
 */
export function extractRelationFieldMappings(
	_fieldDefinitions: Record<string, FieldDefinition<FieldDefinitionState>>,
): Record<string, string> {
	// With unified field API, field name = column key
	// No transformation needed
	return {};
}

/**
 * Create a Zod preprocessor that normalizes relation field names to FK column names.
 *
 * This allows users to use either:
 * - `{ author: "user-uuid" }` (field name - preferred, matches TypeScript types)
 * - `{ authorId: "user-uuid" }` (FK column name - also accepted)
 *
 * The preprocessor transforms field names to FK column names before validation.
 *
 * @param relationMappings - Map of relation field names to FK column names
 * @returns Zod preprocessor function
 */
function createRelationFieldPreprocessor(
	relationMappings: Record<string, string>,
): (input: unknown) => unknown {
	return (input: unknown) => {
		if (typeof input !== "object" || input === null) {
			return input;
		}

		const result = { ...input } as Record<string, unknown>;

		for (const [fieldName, fkColumnName] of Object.entries(relationMappings)) {
			// If the field name exists with a simple value (string/null)
			if (fieldName in result) {
				const value = result[fieldName];

				// Only transform simple values (string IDs or null), not nested mutation objects
				if (typeof value === "string" || value === null) {
					// Transform: author → authorId
					result[fkColumnName] = value;
					delete result[fieldName];
				}
				// If it's an object (nested mutation), leave it for later processing
				// It will be stripped by passthrough and handled by separateNestedRelations
			}
		}

		return result;
	};
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
		/** Field definitions for relation field name normalization */
		fieldDefinitions?: Record<string, FieldDefinition<FieldDefinitionState>>;
	},
): ValidationSchemas {
	// Create merged table for validation
	const validationTable = mergeFieldsForValidation(
		tableName,
		mainFields,
		localizedFields,
	);

	// Generate base schemas using drizzle-to-zod utilities
	const baseInsertSchema = createInsertSchema(validationTable, {
		exclude: options?.exclude || {},
		refine: options?.refine as any,
	});

	const baseUpdateSchema = createUpdateSchema(validationTable, {
		exclude: options?.exclude || {},
		refine: options?.refine as any,
	});

	// If field definitions are provided, add relation field name normalization
	if (options?.fieldDefinitions) {
		const relationMappings = extractRelationFieldMappings(
			options.fieldDefinitions,
		);

		if (Object.keys(relationMappings).length > 0) {
			const preprocessor = createRelationFieldPreprocessor(relationMappings);

			// Wrap schemas with preprocessor to normalize relation field names
			// Use passthrough() to allow extra keys (nested mutations will be stripped later)
			return {
				insertSchema: z.preprocess(
					preprocessor,
					baseInsertSchema.passthrough(),
				),
				updateSchema: z.preprocess(
					preprocessor,
					baseUpdateSchema.passthrough(),
				),
			};
		}
	}

	return {
		insertSchema: baseInsertSchema,
		updateSchema: baseUpdateSchema,
	};
}
