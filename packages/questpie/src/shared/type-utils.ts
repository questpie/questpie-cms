// Centralized Type Utilities for QUESTPIE CMS
// This file consolidates all type inference helpers used by both server and client

import type {
	Collection,
	CollectionBuilder,
	GlobalBuilder,
	Global,
	FunctionDefinition,
} from "#questpie/server/index.js";
import type { RelationConfig } from "#questpie/server/collection/builder/types.js";

// ============================================================================
// Performance Type Utilities
// ============================================================================

/**
 * Materialize computed types
 */
export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

/**
 * Merge two types - U overrides T. Stays lazy.
 */
export type TypeMerge<T, U> = {
	[K in keyof T | keyof U]: K extends keyof U
		? U[K]
		: K extends keyof T
			? T[K]
			: never;
};

/**
 * Set a property in a type. Stays lazy.
 */
export type SetProperty<T, K extends PropertyKey, V> = TypeMerge<
	Omit<T, K>,
	{ [P in K]: V }
>;

/**
 * Remove a property from a type. Stays lazy.
 * Same as Omit<T, K>, keeping for consistency.
 */
export type UnsetProperty<T, K extends PropertyKey> = Omit<T, K>;

// ============================================================================
// Base Type Helpers
// ============================================================================

export type AnyCollectionOrBuilder = Collection<any> | CollectionBuilder<any>;
export type AnyCollection = Collection<any>;
export type AnyGlobal = Global<any>;
export type AnyGlobalBuilder = GlobalBuilder<any>;
export type AnyGlobalOrBuilder = AnyGlobal | AnyGlobalBuilder;

export type PrettifiedAnyCollectionOrBuilder<
	TCollectionOrBuilder extends AnyCollectionOrBuilder,
> =
	TCollectionOrBuilder extends Collection<infer TState>
		? Collection<Prettify<TState>>
		: TCollectionOrBuilder extends CollectionBuilder<infer TState>
			? CollectionBuilder<Prettify<TState>>
			: never;

export type PrettifiedAnyGlobalOrBuilder<
	TGlobalOrBuilder extends AnyGlobalOrBuilder,
> =
	TGlobalOrBuilder extends Global<infer TState>
		? Global<Prettify<TState>>
		: TGlobalOrBuilder extends GlobalBuilder<infer TState>
			? GlobalBuilder<Prettify<TState>>
			: never;
// ============================================================================
// Collection Type Inference (from $infer property)
// ============================================================================

/**
 * Extract the $infer property from a Collection or CollectionBuilder
 */
export type CollectionInfer<T> = T extends { $infer: infer Infer }
	? Infer
	: never;

/**
 * Extract field access configuration from a Collection state
 */
type CollectionFieldAccess<T> =
	CollectionState<T> extends {
		access: { fields: infer Fields };
	}
		? Fields extends Record<string, any>
			? Fields
			: Record<never, never>
		: Record<never, never>;

/**
 * Make fields optional if they have access rules defined
 * TODO: this should be used only in client select context
 */
type MakeFieldsWithAccessOptional<TSelect, TFieldAccess> =
	TFieldAccess extends Record<string, any>
		? {
				[K in keyof TSelect as K extends keyof TFieldAccess
					? never
					: K]: TSelect[K];
			} & {
				[K in keyof TSelect as K extends keyof TFieldAccess
					? K
					: never]?: TSelect[K];
			}
		: TSelect;

/**
 * Extract the select type from a Collection or CollectionBuilder
 * Fields with access rules are made optional (marked with ?)
 * @example type Post = CollectionSelect<typeof posts>
 */
export type CollectionSelect<T> =
	CollectionInfer<T> extends {
		select: infer Select;
	}
		? MakeFieldsWithAccessOptional<Select, CollectionFieldAccess<T>>
		: never;

/**
 * Extract the insert type from a Collection or CollectionBuilder
 * @example type PostInsert = CollectionInsert<typeof posts>
 */
export type CollectionInsert<T> =
	CollectionInfer<T> extends {
		insert: infer Insert;
	}
		? Insert
		: never;

/**
 * Extract the update type from a Collection or CollectionBuilder
 * @example type PostUpdate = CollectionUpdate<typeof posts>
 */
export type CollectionUpdate<T> =
	CollectionInfer<T> extends {
		update: infer Update;
	}
		? Update
		: never;

/**
 * Extract the state from a Collection or CollectionBuilder
 */
export type CollectionState<T> = T extends { state: infer State }
	? State
	: never;

/**
 * Extract functions from a Collection or CollectionBuilder
 */
export type CollectionFunctions<T> =
	CollectionState<T> extends { functions: infer Functions }
		? Functions extends Record<string, FunctionDefinition>
			? Functions
			: Record<string, FunctionDefinition>
		: Record<string, FunctionDefinition>;

/**
 * Extract relations from a Collection or CollectionBuilder
 */
export type CollectionRelations<T> =
	CollectionState<T> extends {
		relations: infer Relations;
	}
		? Relations extends Record<string, RelationConfig>
			? Relations
			: Record<string, RelationConfig>
		: Record<string, RelationConfig>;

// /**
// TODO: use this type
//  * Extract search metadata type from a Collection or CollectionBuilder
//  */
// export type CollectionSearchMetadata<T> =
// 	CollectionState<T> extends { searchable: SearchableConfig }
// 		? Record<string, any>
// 		: Record<string, any>;

// ============================================================================
// Global Type Inference (from $infer property)
// ============================================================================

/**
 * Extract the $infer property from a Global or GlobalBuilder
 */
export type GlobalInfer<T> = T extends { $infer: infer Infer } ? Infer : never;

/**
 * Extract field access configuration from a Global state
 */
type GlobalFieldAccess<T> = T extends {
	state: { access: { fields?: infer Fields } };
}
	? Fields extends Record<string, any>
		? Fields
		: {}
	: {};

/**
 * Extract the select type from a Global or GlobalBuilder
 * Fields with access rules are made optional (marked with ?)
 * @example type Settings = GlobalSelect<typeof siteSettings>
 */
export type GlobalSelect<T> =
	GlobalInfer<T> extends { select: infer Select }
		? MakeFieldsWithAccessOptional<Select, GlobalFieldAccess<T>>
		: never;

/**
 * Extract the insert type from a Global or GlobalBuilder
 * @example type SettingsInsert = GlobalInsert<typeof siteSettings>
 */
export type GlobalInsert<T> =
	GlobalInfer<T> extends { insert: infer Insert } ? Insert : never;

/**
 * Extract the update type from a Global or GlobalBuilder
 * @example type SettingsUpdate = GlobalUpdate<typeof siteSettings>
 */
export type GlobalUpdate<T> =
	GlobalInfer<T> extends { update: infer Update } ? Update : never;

/**
 * Extract the state from a Global or GlobalBuilder
 */
export type GlobalState<T> = T extends { state: infer State } ? State : never;

/**
 * Extract functions from a Global or GlobalBuilder
 */
export type GlobalFunctions<T> =
	GlobalState<T> extends { functions: infer F }
		? F extends Record<string, FunctionDefinition>
			? F
			: Record<string, FunctionDefinition>
		: Record<string, FunctionDefinition>;

/**
 * Extract relations from a Global or GlobalBuilder
 */
export type GlobalRelations<T> =
	GlobalState<T> extends {
		relations: infer Relations;
	}
		? Relations extends Record<string, RelationConfig>
			? Relations
			: Record<string, RelationConfig>
		: Record<string, RelationConfig>;

// ============================================================================
// Collection Name Extraction & Lookup
// ============================================================================

/**
 * Get a Collection by name from collections object
 * @example type Posts = GetCollection<{ posts: typeof posts, pages: typeof pages }, "posts">
 */
export type GetCollection<
	TCollections extends Record<string, AnyCollectionOrBuilder>,
	Name extends keyof TCollections,
> = TCollections[Name] extends Collection<infer TState>
	? Collection<TState>
	: TCollections[Name] extends CollectionBuilder<infer TState>
		? Collection<TState>
		: never;

// /**
// TODO: use this type
//  * Extract searchable collection names from a collections map
//  */
// export type SearchableCollectionNames<
// 	TCollections extends Record<string, AnyCollectionOrBuilder>,
// > = {
// 	[K in keyof TCollections]: CollectionState<
// 		GetCollection<TCollections, K>
// 	> extends { searchable: SearchableConfig }
// 		? K
// 		: never;
// }[keyof TCollections];

// ============================================================================
// Global Name Extraction & Lookup
// ============================================================================

/**
 * Get a Global by name from globals object
 * @example type Settings = GetGlobal<{ siteSettings: typeof siteSettings, themeConfig: typeof themeConfig }, "siteSettings">
 */
export type GetGlobal<
	TGlobals extends Record<string, AnyGlobalOrBuilder>,
	Name extends keyof TGlobals,
> = TGlobals[Name] extends Global<infer TState>
	? Global<TState>
	: TGlobals[Name] extends GlobalBuilder<infer TState>
		? Global<TState>
		: never;

// ============================================================================
// Relation Resolution
// ============================================================================

/**
 * Resolve a collection select type by name
 */
type ResolveCollectionSelect<
	TCollections extends Record<string, AnyCollectionOrBuilder>,
	C,
> = C extends keyof TCollections
	? CollectionSelect<GetCollection<TCollections, C>>
	: any;

type DecrementDepth<Depth extends unknown[]> = Depth extends [
	unknown,
	...infer Rest,
]
	? Rest
	: [];

export type RelationShape<TSelect, TRelations, TInsert = TSelect> = {
	__select: TSelect;
	__relations: TRelations;
	__insert: TInsert;
};

export type ExtractRelationSelect<T> =
	T extends RelationShape<infer Select, any, any> ? Select : T;

export type ExtractRelationRelations<T> =
	T extends RelationShape<any, infer Relations, any> ? Relations : never;

export type ExtractRelationInsert<T> =
	T extends RelationShape<any, any, infer Insert> ? Insert : T;

type ResolveCollectionRelation<
	TCollections extends Record<string, AnyCollectionOrBuilder>,
	C,
	Depth extends unknown[],
> = C extends keyof TCollections
	? RelationShape<
			CollectionSelect<GetCollection<TCollections, C>>,
			Depth extends []
				? never
				: ResolveRelationsDeep<
						CollectionRelations<GetCollection<TCollections, C>>,
						TCollections,
						DecrementDepth<Depth>
					>,
			CollectionInsert<GetCollection<TCollections, C>>
		>
	: RelationShape<any, never, any>;

/**
 * Resolve all relations from a RelationConfig to actual types
 * Handles one-to-many, many-to-many, and one-to-one relations
 *
 * @example
 * type PostRelations = ResolveRelations<
 *   typeof posts.state.relations,
 *   { posts: typeof posts, comments: typeof comments, users: typeof users }
 * >
 * // => { author: User, comments: Comment[], tags: Tag[] }
 */
export type ResolveRelations<
	TRelations extends Record<string, RelationConfig>,
	TCollections extends Record<string, AnyCollectionOrBuilder>,
> = {
	[K in keyof TRelations]: TRelations[K] extends {
		type: "many" | "manyToMany";
		collection: infer C;
	}
		? ResolveCollectionSelect<TCollections, C>[]
		: TRelations[K] extends {
					type: "one";
					collection: infer C;
				}
			? ResolveCollectionSelect<TCollections, C>
			: never;
};

export type ResolveRelationsDeep<
	TRelations extends Record<string, RelationConfig>,
	TCollections extends Record<string, AnyCollectionOrBuilder>,
	Depth extends unknown[] = [1, 1, 1, 1, 1],
> = {
	[K in keyof TRelations]: TRelations[K] extends {
		type: "many" | "manyToMany";
		collection: infer C;
	}
		? ResolveCollectionRelation<TCollections, C, Depth>[]
		: TRelations[K] extends {
					type: "one";
					collection: infer C;
				}
			? ResolveCollectionRelation<TCollections, C, Depth>
			: never;
};
