import type {
	AnyCollectionOrBuilder,
	AnyGlobalOrBuilder,
	CollectionNames,
	CRUD,
	GetCollection,
	GetGlobal,
	GlobalCRUD,
	GlobalNames,
	JobDefinition,
	QCMS,
} from "#questpie/cms/exports/server.js";
import type { RelationConfig } from "#questpie/cms/server/collection/builder/types.js";

type CollectionInfer<T> = T extends { $infer: infer Infer } ? Infer : never;
type CollectionSelect<T> =
	CollectionInfer<T> extends { select: infer Select } ? Select : never;
type CollectionInsert<T> =
	CollectionInfer<T> extends { insert: infer Insert } ? Insert : never;
type CollectionUpdate<T> =
	CollectionInfer<T> extends { update: infer Update } ? Update : never;
type CollectionState<T> = T extends { state: infer State } ? State : never;
type CollectionRelations<T> = CollectionState<T> extends {
	relations: infer Relations;
}
	? Relations extends Record<string, RelationConfig>
		? Relations
		: Record<string, RelationConfig>
	: Record<string, RelationConfig>;

type ResolveCollectionSelect<
	TCollections extends AnyCollectionOrBuilder[],
	C,
> = C extends CollectionNames<TCollections>
	? CollectionSelect<GetCollection<TCollections, C>>
	: any;

type ResolvePolymorphic<
	TCollections extends AnyCollectionOrBuilder[],
	TRelation extends RelationConfig,
> = TRelation extends { collections: Record<string, infer C> }
	? ResolveCollectionSelect<TCollections, C>
	: any;

type ResolveRelations<
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

export class QCMSCrudAPI<
	TCollections extends AnyCollectionOrBuilder[] = AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[] = AnyGlobalOrBuilder[],
	TJobs extends JobDefinition<any, any>[] = JobDefinition<any, any>[],
> {
	constructor(readonly cms: QCMS<TCollections, TGlobals, TJobs>) {}

	/**
	 * Access collections CRUD operations
	 * @example
	 * await cms.api.collections.users.create({ email: '...' }, context)
	 * await cms.api.collections.posts.find({ where: { status: 'published' } })
	 */
	public get collections(): {
		[K in CollectionNames<TCollections>]: CRUD<
			CollectionSelect<GetCollection<TCollections, K>>,
			CollectionInsert<GetCollection<TCollections, K>>,
			CollectionUpdate<GetCollection<TCollections, K>>,
			ResolveRelations<
				CollectionRelations<GetCollection<TCollections, K>>,
				TCollections
			>
		>;
	} {
		const collectionsProxy = {} as any;

		for (const collection of this.cms.getCollections()) {
			const name = collection.name as CollectionNames<TCollections>;
			Object.defineProperty(collectionsProxy, name, {
				get: () => {
					// Generate CRUD with cms reference
					return collection.generateCRUD(this.cms.db.drizzle, this.cms);
				},
				enumerable: true,
			});
		}

		return collectionsProxy;
	}

	public get globals(): {
		[K in GlobalNames<TGlobals>]: GlobalCRUD<
			GetGlobal<TGlobals, K>["$infer"]["select"],
			GetGlobal<TGlobals, K>["$infer"]["insert"],
			GetGlobal<TGlobals, K>["$infer"]["update"],
			GetGlobal<TGlobals, K>["state"]["relations"]
		>;
	} {
		const globalsProxy = {} as any;

		for (const global of this.cms.getGlobals()) {
			const name = global.name as GlobalNames<TGlobals>;
			Object.defineProperty(globalsProxy, name, {
				get: () => {
					// Generate CRUD with cms reference
					return global.generateCRUD(this.cms.db.drizzle, this.cms);
				},
				enumerable: true,
			});
		}

		return globalsProxy;
	}
}
