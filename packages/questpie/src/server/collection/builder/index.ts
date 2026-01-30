// builder/index.ts - Main exports for the collection builder

export { collection, CollectionBuilder } from "./collection-builder.js";
export { Collection } from "./collection.js";
export { softDeleteUniqueIndex } from "./index-helpers.js";
export {
  mergeFieldsForValidation,
  createCollectionValidationSchemas,
  type ValidationSchemas,
} from "./validation-helpers.js";
export type {
  CollectionBuilderState,
  CollectionOptions,
  CollectionHooks,
  CollectionAccess,
  HookFunction,
  HookContext,
  AccessContext,
  AccessRule,
  AccessWhere,
  FieldAccess,
  RelationConfig,
  NonLocalizedFields,
  LocalizedFields,
  InferSQLType,
  UploadOptions,
} from "./types.js";

// Re-export CRUD types for convenience
export type {
  CRUD,
  CRUDContext,
  FindManyOptions,
  FindOneOptions,
  CreateInput,
  CreateInputBase,
  CreateInputWithRelations,
  UpdateParams,
  DeleteParams,
  RestoreParams,
  Where,
  WhereOperators,
  Columns,
  OrderBy,
  OrderByDirection,
  With,
  Extras,
} from "#questpie/server/collection/crud/index.js";
