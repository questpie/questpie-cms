import type {
	AnyCollectionOrBuilder,
	AnyGlobalOrBuilder,
	CMSDbConfig,
	CollectionNames,
	CRUD,
	GetCollection,
	GetGlobal,
	GlobalCRUD,
	GlobalNames,
	JobDefinition,
	QCMS,
} from "#questpie/cms/exports/server.js";
import type { RequestContext } from "#questpie/cms/server/config/context";
import { executeJsonFunction } from "#questpie/cms/server/functions/execute";
import type {
	ExtractJsonFunctions,
	FunctionsMap,
	InferFunctionInput,
	InferFunctionOutput,
	JsonFunctionDefinition,
} from "#questpie/cms/server/functions/types";
import type {
	CollectionFunctions,
	CollectionInsert,
	CollectionRelations,
	CollectionSelect,
	CollectionUpdate,
	GlobalFunctions,
	GlobalInsert,
	GlobalRelations,
	GlobalSelect,
	GlobalUpdate,
	ResolveRelations,
} from "#questpie/cms/shared/type-utils.js";

type JsonFunctionCaller<TDefinition extends JsonFunctionDefinition<any, any>> =
	(
		input: InferFunctionInput<TDefinition>,
		context?: RequestContext,
	) => Promise<InferFunctionOutput<TDefinition>>;

type RootFunctionsAPI<TFunctions extends FunctionsMap> = {
	[K in keyof ExtractJsonFunctions<TFunctions>]: ExtractJsonFunctions<TFunctions>[K] extends JsonFunctionDefinition<
		any,
		any
	>
		? JsonFunctionCaller<ExtractJsonFunctions<TFunctions>[K]>
		: never;
};

type CollectionFunctionsAPI<TCollection, _TCollections> = {
	[K in keyof ExtractJsonFunctions<
		CollectionFunctions<TCollection>
	>]: ExtractJsonFunctions<
		CollectionFunctions<TCollection>
	>[K] extends JsonFunctionDefinition<any, any>
		? JsonFunctionCaller<
				ExtractJsonFunctions<CollectionFunctions<TCollection>>[K]
			>
		: never;
};

type GlobalFunctionsAPI<TGlobal> = {
	[K in keyof ExtractJsonFunctions<
		GlobalFunctions<TGlobal>
	>]: ExtractJsonFunctions<
		GlobalFunctions<TGlobal>
	>[K] extends JsonFunctionDefinition<any, any>
		? JsonFunctionCaller<ExtractJsonFunctions<GlobalFunctions<TGlobal>>[K]>
		: never;
};

type CollectionAPI<
	TCollection,
	TCollections extends AnyCollectionOrBuilder[],
> = CRUD<
	CollectionSelect<TCollection>,
	CollectionInsert<TCollection>,
	CollectionUpdate<TCollection>,
	ResolveRelations<CollectionRelations<TCollection>, TCollections>
> &
	CollectionFunctionsAPI<TCollection, TCollections>;

type GlobalAPI<TGlobal> = GlobalCRUD<
	GlobalSelect<TGlobal>,
	GlobalInsert<TGlobal>,
	GlobalUpdate<TGlobal>,
	GlobalRelations<TGlobal>
> &
	GlobalFunctionsAPI<TGlobal>;

export type QCMSApi<
	TCollections extends AnyCollectionOrBuilder[] = AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[] = AnyGlobalOrBuilder[],
	TJobs extends JobDefinition<any, any>[] = JobDefinition<any, any>[],
	TEmailTemplates extends any[] = any[],
	TFunctions extends FunctionsMap = FunctionsMap,
> = QCMSAPI<TCollections, TGlobals, TJobs, TEmailTemplates, TFunctions> &
	RootFunctionsAPI<TFunctions>;

export class QCMSAPI<
	TCollections extends AnyCollectionOrBuilder[] = AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[] = AnyGlobalOrBuilder[],
	TJobs extends JobDefinition<any, any>[] = JobDefinition<any, any>[],
	TEmailTemplates extends any[] = any[],
	TFunctions extends FunctionsMap = FunctionsMap,
> {
	constructor(
		readonly cms: QCMS<
			TCollections,
			TGlobals,
			TJobs,
			TEmailTemplates,
			TFunctions,
			CMSDbConfig
		>,
	) {
		this.registerRootFunctions();
	}

	private registerRootFunctions() {
		const functions = this.cms.getFunctions() as FunctionsMap;

		for (const [name, definition] of Object.entries(functions)) {
			if (definition.mode === "raw") continue;
			if (name in this) {
				throw new Error(`Function "${name}" collides with existing API keys.`);
			}

			Object.defineProperty(this, name, {
				get: () => this.createJsonFunctionCaller(definition),
				enumerable: true,
			});
		}
	}

	private createJsonFunctionCaller(
		definition: JsonFunctionDefinition<any, any>,
	) {
		return async (input: unknown, context?: RequestContext) => {
			return executeJsonFunction(this.cms, definition, input as never, context);
		};
	}

	private createCollectionFunctions(
		functions: FunctionsMap,
		crud: Record<string, any>,
	) {
		const output: Record<string, any> = {};

		for (const [name, definition] of Object.entries(functions)) {
			if (definition.mode === "raw") continue;
			if (name in crud) {
				throw new Error(
					`Function "${name}" collides with collection CRUD method.`,
				);
			}
			output[name] = this.createJsonFunctionCaller(definition);
		}

		return output;
	}

	private createGlobalFunctions(
		functions: FunctionsMap,
		crud: Record<string, any>,
	) {
		const output: Record<string, any> = {};

		for (const [name, definition] of Object.entries(functions)) {
			if (definition.mode === "raw") continue;
			if (name in crud) {
				throw new Error(`Function "${name}" collides with global CRUD method.`);
			}
			output[name] = this.createJsonFunctionCaller(definition);
		}

		return output;
	}

	/**
	 * Access collections CRUD operations
	 * @example
	 * await cms.api.collections.users.create({ email: '...' }, context)
	 * await cms.api.collections.posts.find({ where: { status: 'published' } })
	 */
	public get collections(): {
		[K in CollectionNames<TCollections>]: CollectionAPI<
			GetCollection<TCollections, K>,
			TCollections
		>;
	} {
		const collectionsProxy = {} as any;

		for (const collection of this.cms.getCollections()) {
			const name = collection.name as CollectionNames<TCollections>;
			Object.defineProperty(collectionsProxy, name, {
				get: () => {
					const crud = collection.generateCRUD(this.cms.db, this.cms) as any;
					const functions = this.createCollectionFunctions(
						collection.state.functions || {},
						crud,
					);
					return {
						...crud,
						...functions,
					};
				},
				enumerable: true,
			});
		}

		return collectionsProxy;
	}

	public get globals(): {
		[K in GlobalNames<TGlobals>]: GlobalAPI<GetGlobal<TGlobals, K>>;
	} {
		const globalsProxy = {} as any;

		for (const global of this.cms.getGlobals()) {
			const name = global.name as GlobalNames<TGlobals>;
			Object.defineProperty(globalsProxy, name, {
				get: () => {
					const crud = global.generateCRUD(this.cms.db, this.cms) as any;
					const functions = this.createGlobalFunctions(
						global.state.functions || {},
						crud,
					);
					return {
						...crud,
						...functions,
					};
				},
				enumerable: true,
			});
		}

		return globalsProxy;
	}
}
