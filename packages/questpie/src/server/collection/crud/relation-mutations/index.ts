/**
 * Relation Mutations
 *
 * Functions for handling relation mutations (cascade delete, nested operations).
 */

export {
  handleCascadeDelete,
  type CascadeDeleteOptions,
} from "./cascade-delete.js";

export {
  separateNestedRelations,
  extractBelongsToConnectValues,
  applyBelongsToRelations,
  processHasManyNestedOperations,
  processManyToManyNestedOperations,
  processNestedRelations,
  type ProcessNestedRelationsOptions,
} from "./nested-operations.js";
