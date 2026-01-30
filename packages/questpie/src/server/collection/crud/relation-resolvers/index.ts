/**
 * Relation Resolvers
 *
 * Functions for resolving different types of relations in CRUD operations.
 */

export {
  resolveBelongsToRelation,
  type ResolveBelongsToOptions,
} from "./belongs-to.js";

export {
  resolveHasManyRelation,
  resolveHasManyWithAggregation,
  type ResolveHasManyOptions,
} from "./has-many.js";

export {
  resolveManyToManyRelation,
  type ResolveManyToManyOptions,
} from "./many-to-many.js";
