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
import type {
	CollectionSelect,
	CollectionInsert,
	CollectionUpdate,
	CollectionRelations,
	GlobalSelect,
	GlobalInsert,
	GlobalUpdate,
	GlobalRelations,
	ResolveRelations,
} from "#questpie/cms/shared/type-utils.js";

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
			GlobalSelect<GetGlobal<TGlobals, K>>,
			GlobalInsert<GetGlobal<TGlobals, K>>,
			GlobalUpdate<GetGlobal<TGlobals, K>>,
			GlobalRelations<GetGlobal<TGlobals, K>>
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
