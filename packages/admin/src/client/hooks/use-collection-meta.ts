/**
 * Hook for fetching collection metadata from the backend
 *
 * Used to get introspection info about collections like:
 * - Title field configuration (which field to display first)
 * - Whether timestamps are enabled
 * - Whether soft delete is enabled
 * - Localized fields
 * - Virtual fields
 */

import { type UseQueryOptions, useQuery } from "@tanstack/react-query";
import type { CollectionMeta } from "questpie/client";
import type {
  RegisteredCMS,
  RegisteredCollectionNames,
} from "../builder/registry";
import type { Questpie } from "questpie";
import { selectClient, useAdminStore } from "../runtime";

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Resolved collection names (string if not registered)
 */
type ResolvedCollectionNames =
  RegisteredCMS extends Questpie<any> ? RegisteredCollectionNames : string;

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to fetch collection metadata from the backend
 *
 * Returns introspection info useful for building dynamic UIs:
 * - title.fieldName: The field to use as display title (instead of _title)
 * - title.type: "field" (sortable) or "virtual" (computed)
 * - timestamps: Whether createdAt/updatedAt are enabled
 * - softDelete: Whether soft delete is enabled
 * - localizedFields: Fields that support i18n
 *
 * @example
 * ```tsx
 * const { data: meta } = useCollectionMeta("posts");
 *
 * // Use title.fieldName instead of _title for first column
 * const firstColumn = meta?.title.fieldName || "_title";
 *
 * // Only show timestamps columns if enabled
 * if (meta?.timestamps) {
 *   columns.push("createdAt", "updatedAt");
 * }
 * ```
 */
export function useCollectionMeta<K extends ResolvedCollectionNames>(
  collection: K,
  queryOptions?: Omit<UseQueryOptions<CollectionMeta>, "queryKey" | "queryFn">,
) {
  const client = useAdminStore(selectClient);

  return useQuery<CollectionMeta>({
    queryKey: ["questpie", "collections", collection, "meta"],
    queryFn: async () => {
      return (client as any).collections[collection].meta();
    },
    // Meta rarely changes, cache aggressively
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    ...queryOptions,
  });
}

/**
 * Query key for collection meta
 * Useful for prefetching or invalidation
 */
export function getCollectionMetaQueryKey(collection: string) {
  return ["questpie", "collections", collection, "meta"] as const;
}
