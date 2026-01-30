/**
 * Integrations Module
 *
 * Re-exports all integration utilities for CRUD operations.
 * These functions integrate with external services like search.
 */

export {
  indexToSearch,
  removeFromSearch,
  flushPendingSearchIndexes,
  type IndexToSearchOptions,
  type RemoveFromSearchOptions,
} from "./search.js";
