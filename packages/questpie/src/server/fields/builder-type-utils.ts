/**
 * Shared Builder Type Utilities
 *
 * Type helpers used by both collection-builder and global-builder.
 */

import type { FieldDefinition, FieldDefinitionState } from "./types.js";

/**
 * Extract Drizzle column types from field definitions.
 * Maps each field definition to its column type, excluding virtual fields.
 */
export type ExtractColumnsFromFieldDefinitions<
	TFields extends Record<string, FieldDefinition<FieldDefinitionState>>,
> = {
	[K in keyof TFields]: TFields[K]["$types"]["column"] extends null
		? never
		: TFields[K]["$types"]["column"];
};
