// Centralized Type Utilities for QUESTPIE CMS
// This file consolidates all type inference helpers used by both server and client

import type {
	AnyGlobalState,
	Collection,
	CollectionBuilder,
	GlobalBuilder,
	Global,
} from "#questpie/cms/server";
import type { AnyCollectionState } from "#questpie/cms/server/collection/builder/types";
import type { RelationConfig } from "#questpie/cms/server/collection/builder/types";

// ============================================================================
// Base Type Helpers
// ============================================================================

export type AnyCollectionOrBuilder =
	| Collection<AnyCollectionState>
	| CollectionBuilder<AnyCollectionState>;
export type AnyCollection = Collection<AnyCollectionState>;
export type AnyGlobal = Global<AnyGlobalState>;
export type AnyGlobalBuilder = GlobalBuilder<AnyGlobalState>;
export type AnyGlobalOrBuilder = AnyGlobal | AnyGlobalBuilder;

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
 * Extract the select type from a Collection or CollectionBuilder
 * @example type Post = CollectionSelect<typeof posts>
 */
export type CollectionSelect<T> =
	CollectionInfer<T> extends {
		select: infer Select;
	}
		? Select
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

// ============================================================================
// Global Type Inference (from $infer property)
// ============================================================================

/**
 * Extract the $infer property from a Global or GlobalBuilder
 */
export type GlobalInfer<T> = T extends { $infer: infer Infer } ? Infer : never;

/**
 * Extract the select type from a Global or GlobalBuilder
 * @example type Settings = GlobalSelect<typeof siteSettings>
 */
export type GlobalSelect<T> =
	GlobalInfer<T> extends { select: infer Select } ? Select : never;

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
 * Extract all collection names from a tuple of collections
 * @example type Names = CollectionNames<[typeof posts, typeof pages]> // "posts" | "pages"
 */
export type CollectionNames<TCollections extends AnyCollectionOrBuilder[]> =
	TCollections[number] extends { name: infer Name }
		? Name extends string
			? Name
			: never
		: never;

/**
 * Create a map of collection names to Collection instances
 */
export type CollectionMap<TCollections extends AnyCollectionOrBuilder[]> = {
	[K in TCollections[number] as K extends Collection<infer TState>
		? TState["name"]
		: K extends CollectionBuilder<infer TState>
			? TState["name"]
			: never]: K extends Collection<infer TState>
		? Collection<TState>
		: K extends CollectionBuilder<infer TState>
			? Collection<TState>
			: never;
};

/**
 * Get a Collection by name from a tuple of collections
 * @example type Posts = GetCollection<[typeof posts, typeof pages], "posts">
 */
export type GetCollection<
	TCollections extends AnyCollectionOrBuilder[],
	Name extends CollectionNames<TCollections>,
> = CollectionMap<TCollections>[Name];

// ============================================================================
// Global Name Extraction & Lookup
// ============================================================================

/**
 * Extract all global names from a tuple of globals
 * @example type Names = GlobalNames<[typeof siteSettings, typeof themeConfig]> // "siteSettings" | "themeConfig"
 */
export type GlobalNames<TGlobals extends AnyGlobalOrBuilder[]> =
	TGlobals[number] extends { name: infer Name }
		? Name extends string
			? Name
			: never
		: never;

/**
 * Create a map of global names to Global instances
 */
export type GlobalMap<TGlobals extends AnyGlobalOrBuilder[]> = {
	[K in TGlobals[number] as K extends Global<infer TState>
		? TState["name"]
		: K extends GlobalBuilder<infer TState>
			? TState["name"]
			: never]: K extends Global<infer TState>
		? Global<TState>
		: K extends GlobalBuilder<infer TState>
			? Global<TState>
			: never;
};

/**
 * Get a Global by name from a tuple of globals
 * @example type Settings = GetGlobal<[typeof siteSettings, typeof themeConfig], "siteSettings">
 */
export type GetGlobal<
	TGlobals extends AnyGlobalOrBuilder[],
	Name extends GlobalNames<TGlobals>,
> = GlobalMap<TGlobals>[Name];

// ============================================================================
// Relation Resolution
// ============================================================================

/**
 * Resolve a collection select type by name
 */
type ResolveCollectionSelect<
	TCollections extends AnyCollectionOrBuilder[],
	C,
> = C extends CollectionNames<TCollections>
	? CollectionSelect<GetCollection<TCollections, C>>
	: any;

/**
 * Resolve polymorphic relation types
 */
type ResolvePolymorphic<
	TCollections extends AnyCollectionOrBuilder[],
	TRelation extends RelationConfig,
> = TRelation extends { collections: Record<string, infer C> }
	? ResolveCollectionSelect<TCollections, C>
	: any;

/**
 * Resolve all relations from a RelationConfig to actual types
 * Handles one-to-many, many-to-many, one-to-one, and polymorphic relations
 *
 * @example
 * type PostRelations = ResolveRelations<
 *   typeof posts.state.relations,
 *   [typeof posts, typeof comments, typeof users]
 * >
 * // => { author: User, comments: Comment[], tags: Tag[] }
 */
export type ResolveRelations<
	TRelations extends Record<string, RelationConfig>,
	TCollections extends AnyCollectionOrBuilder[],
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
			: TRelations[K] extends { type: "polymorphic" }
				? ResolvePolymorphic<TCollections, TRelations[K]>
				: never;
};
