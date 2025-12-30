// builder/index.ts - Main exports for the collection builder

export {
	defineCollection,
	CollectionBuilder,
} from "./collection-builder";
export { Collection } from "./collection";
export { softDeleteUniqueIndex } from "./index-helpers";
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
} from "./types";

// Re-export CRUD types for convenience
export type {
	CRUD,
	CRUDContext,
	FindManyOptions,
	FindFirstOptions,
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
} from "#questpie/cms/server/collection/crud";
