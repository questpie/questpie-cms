/**
 * Detect Relations Utility
 *
 * Automatically detects relation fields (especially M:N relations)
 * that need to be included when fetching data for forms.
 */

import type { FieldDefinition } from "../builder/field/field";

export interface DetectRelationsConfig {
  /**
   * Collection fields configuration
   */
  fields?: Record<string, FieldDefinition>;
}

/**
 * Auto-detect M:N relation fields from config and build `with` clause.
 *
 * M:N relations need to be explicitly loaded when fetching items for editing,
 * as they are stored in junction tables and not included by default.
 *
 * @param config - Collection configuration with fields
 * @returns Object mapping relation field names to `true` for M:N relations
 *
 * @example
 * ```tsx
 * const withRelations = detectManyToManyRelations({ fields: config?.fields });
 *
 * // Use with query
 * const { data } = useCollectionItem(collection, id, {
 *   with: withRelations,
 * });
 * ```
 */
export function detectManyToManyRelations(
  config: DetectRelationsConfig,
): Record<string, boolean> {
  const withRelations: Record<string, boolean> = {};

  if (config?.fields) {
    for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
      const fc = fieldConfig as any;
      // Detect M:N relation fields (FieldDefinition.name: "relation" with ~options.type: "multiple")
      if (fc?.name === "relation" && fc?.["~options"]?.type === "multiple") {
        withRelations[fieldName] = true;
      }
    }
  }

  return withRelations;
}

/**
 * Check if there are any M:N relations to include
 */
export function hasManyToManyRelations(
  withRelations: Record<string, boolean>,
): boolean {
  return Object.keys(withRelations).length > 0;
}
