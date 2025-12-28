import type {
	AnyCollectionOrBuilder,
	AnyGlobalOrBuilder,
	CollectionNames,
	CRUD,
	GetCollection,
	JobDefinition,
	QCMS,
} from "#questpie/core/exports/server.js";
import type { RelationConfig } from "#questpie/core/server/collection/builder/types.js";

type ResolveRelations<
	TRelations extends Record<string, RelationConfig>,
	TCollections extends AnyCollectionOrBuilder[],
> = {
	[K in keyof TRelations]: TRelations[K] extends {
		type: "many" | "manyToMany";
		collection: infer C extends string;
	}
		? GetCollection<TCollections, C>["$infer"]["select"][]
		: TRelations[K] extends {
					type: "one";
					collection: infer C extends string;
		  }
		? GetCollection<TCollections, C>["$infer"]["select"]
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
	 * await cms.api.collections.posts.findMany({ where: { status: 'published' } })
	 */
	public get collections(): {
		[K in CollectionNames<TCollections>]: CRUD<
			GetCollection<TCollections, K>["$infer"]["select"],
			GetCollection<TCollections, K>["$infer"]["insert"],
			GetCollection<TCollections, K>["$infer"]["update"],
			ResolveRelations<
				GetCollection<TCollections, K>["state"]["relations"],
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

	// public get globals(): {
	// TODO: uncomment when types are fixed
	// 	[K in GlobalNames<TGlobals>]: GlobalCRUD<
	// 		GetGlobal<TGlobals, K>["$infer"]["select"],
	// 		GetGlobal<TGlobals, K>["$infer"]["insert"],
	// 		GetGlobal<TGlobals, K>["$infer"]["update"],
	// 	>;
	// } {
	// 	const globalsProxy = {} as any;

	// 	for (const global of this.cms.getGlobals()) {
	// 		const name = global.name as GlobalNames<TGlobals>;
	// 		Object.defineProperty(globalsProxy, name, {
	// 			get: () => {
	// 				// Generate CRUD with cms reference
	// 				return global.generateCRUD(this.cms.db.drizzle, this.cms);
	// 			},
	// 			enumerable: true,
	// 		});
	// 	}

	// 	return globalsProxy;
	// }
}
