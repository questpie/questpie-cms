import type { UploadOptions } from "#questpie/server/collection/builder/index.js";
import type { CRUD } from "#questpie/server/collection/crud/index.js";
import type { Questpie } from "#questpie/server/config/cms.js";
import type { RequestContext } from "#questpie/server/config/context.js";
import type { QuestpieConfig } from "#questpie/server/config/types.js";
import { executeJsonFunction } from "#questpie/server/functions/execute.js";
import type {
	ExtractJsonFunctions,
	FunctionsMap,
	InferFunctionInput,
	InferFunctionOutput,
	JsonFunctionDefinition,
} from "#questpie/server/functions/types.js";
import type { GlobalCRUD } from "#questpie/server/global/crud/index.js";
import type {
	AnyCollectionOrBuilder,
	CollectionFunctions,
	CollectionInsert,
	CollectionRelations,
	CollectionSelect,
	CollectionState,
	CollectionUpdate,
	GetCollection,
	GetGlobal,
	GlobalFunctions,
	GlobalInsert,
	GlobalRelations,
	GlobalSelect,
	GlobalUpdate,
	ResolveRelationsDeep,
} from "#questpie/shared/type-utils.js";

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

type UploadMethods<TSelect, TInsert> = {
	upload: NonNullable<CRUD<TSelect, TInsert, any, any>["upload"]>;
	uploadMany: NonNullable<CRUD<TSelect, TInsert, any, any>["uploadMany"]>;
};

type CollectionHasUpload<TCollection> =
	CollectionState<TCollection> extends { upload: infer TUpload }
		? TUpload extends UploadOptions
			? true
			: false
		: false;

type CollectionAPI<
	TCollection,
	TCollections extends Record<string, AnyCollectionOrBuilder>,
> = CRUD<
	CollectionSelect<TCollection>,
	CollectionInsert<TCollection>,
	CollectionUpdate<TCollection>,
	ResolveRelationsDeep<CollectionRelations<TCollection>, TCollections>
> extends infer TCrud
	? Omit<TCrud, "upload" | "uploadMany"> &
			(CollectionHasUpload<TCollection> extends true
				? UploadMethods<
						CollectionSelect<TCollection>,
						CollectionInsert<TCollection>
					>
				: {}) &
			CollectionFunctionsAPI<TCollection, TCollections>
	: never;

type GlobalAPI<
	TGlobal,
	TCollections extends Record<string, AnyCollectionOrBuilder>,
> = GlobalCRUD<
	GlobalSelect<TGlobal>,
	GlobalInsert<TGlobal>,
	GlobalUpdate<TGlobal>,
	ResolveRelationsDeep<GlobalRelations<TGlobal>, TCollections>
> &
	GlobalFunctionsAPI<TGlobal>;

export type QuestpieApi<TConfig extends QuestpieConfig = QuestpieConfig> =
	QuestpieAPI<TConfig> & RootFunctionsAPI<NonNullable<TConfig["functions"]>>;

export class QuestpieAPI<TConfig extends QuestpieConfig = QuestpieConfig> {
	constructor(private readonly cms: Questpie<TConfig>) {
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
		[K in keyof TConfig["collections"]]: CollectionAPI<
			GetCollection<TConfig["collections"], K>,
			TConfig["collections"]
		>;
	} {
		const collectionsProxy = {};
		const collectionsObj = this.cms.getCollections();

		for (const [name, collection] of Object.entries(collectionsObj)) {
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

		return collectionsProxy as {
			[K in keyof TConfig["collections"]]: CollectionAPI<
				GetCollection<TConfig["collections"], K>,
				TConfig["collections"]
			>;
		};
	}

	public get globals(): {
		[K in keyof NonNullable<TConfig["globals"]>]: GlobalAPI<
			GetGlobal<NonNullable<TConfig["globals"]>, K>,
			TConfig["collections"]
		>;
	} {
		const globalsProxy = {};
		const globalsObj = this.cms.getGlobals();

		for (const [name, global] of Object.entries(globalsObj)) {
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

		return globalsProxy as {
			[K in keyof NonNullable<TConfig["globals"]>]: GlobalAPI<
				GetGlobal<NonNullable<TConfig["globals"]>, K>,
				TConfig["collections"]
			>;
		};
	}
}
