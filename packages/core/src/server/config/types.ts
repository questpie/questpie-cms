import type {
	AnyGlobalState,
	Collection,
	CollectionBuilder,
	GlobalBuilder,
	Global,
} from "#questpie/core/server";
import type {
	AnyCollectionState,
	InferTableWithColumns,
	LocalizedFields,
	NonLocalizedFields,
} from "#questpie/core/server/collection/builder/types";
import type { drizzle } from "drizzle-orm/bun-sql";
import type { SQL } from "bun";
import type { BetterAuthOptions } from "better-auth";
import type { MailerConfig } from "../integrated/mailer";
import type {
	QueueConfig as BaseQueueConfig,
	JobDefinition,
} from "../integrated/queue/types";
import type { DriverContract } from "flydrive/types";

export type AnyCollectionOrBuilder =
	| Collection<AnyCollectionState>
	| CollectionBuilder<AnyCollectionState>;
export type AnyGlobal = Global<AnyGlobalState>;
export type AnyGlobalBuilder = GlobalBuilder<AnyGlobalState>;
export type AnyGlobalOrBuilder = AnyGlobal | AnyGlobalBuilder;

export type DrizzleSchemaFromCollections<
	TCollections extends AnyCollectionOrBuilder[],
> = {
	[K in TCollections[number] as K extends Collection<infer TState>
		? TState["name"]
		: K extends CollectionBuilder<infer TState>
			? TState["name"]
			: never]: K extends Collection<infer TState>
		? InferTableWithColumns<
				TState["name"],
				NonLocalizedFields<TState["fields"], TState["localized"]>,
				TState["title"],
				TState["options"]
			>
		: K extends CollectionBuilder<infer TState>
			? InferTableWithColumns<
					TState["name"],
					NonLocalizedFields<TState["fields"], TState["localized"]>,
					TState["title"],
					TState["options"]
				>
			: never;
} & {
	[K in TCollections[number] as K extends Collection<infer TState>
		? TState["localized"][number] extends string
			? `${TState["name"]}_i18n`
			: never
		: K extends CollectionBuilder<infer TState>
			? TState["localized"][number] extends string
				? `${TState["name"]}_i18n`
				: never
			: never]: K extends Collection<infer TState>
		? TState["localized"][number] extends string
			? InferTableWithColumns<
					TState["name"],
					LocalizedFields<TState["fields"], TState["localized"]>,
					TState["title"],
					TState["options"]
				>
			: never
		: K extends CollectionBuilder<infer TState>
			? TState["localized"][number] extends string
				? InferTableWithColumns<
						TState["name"],
						LocalizedFields<TState["fields"], TState["localized"]>,
						TState["title"],
						TState["options"]
					>
				: never
			: never;
};

export type CollectionNames<TCollections extends AnyCollectionOrBuilder[]> =
	TCollections[number] extends { name: infer Name }
		? Name extends string
			? Name
			: never
		: never;

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

export type GetCollection<
	TCollections extends AnyCollectionOrBuilder[],
	Name extends CollectionNames<TCollections>,
> = CollectionMap<TCollections>[Name];

export type GlobalNames<TGlobals extends AnyGlobalOrBuilder[]> =
	TGlobals[number] extends { name: infer Name }
		? Name extends string
			? Name
			: never
		: never;

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

export type GetGlobal<
	TGlobals extends AnyGlobalOrBuilder[],
	Name extends GlobalNames<TGlobals>,
> = GlobalMap<TGlobals>[Name];

export type DrizzleSchemaFromGlobals<TGlobals extends AnyGlobalOrBuilder[]> = {
	[K in TGlobals[number] as K extends Global<infer TState>
		? TState["name"]
		: K extends GlobalBuilder<infer TState>
			? TState["name"]
			: never]: K extends Global<infer TState>
		? InferTableWithColumns<
				TState["name"],
				NonLocalizedFields<TState["fields"], TState["localized"]>,
				never,
				{}
			>
		: K extends GlobalBuilder<infer TState>
			? InferTableWithColumns<
					TState["name"],
					NonLocalizedFields<TState["fields"], TState["localized"]>,
					never,
					{}
				>
			: never;
} & {
	[K in TGlobals[number] as K extends Global<infer TState>
		? TState["localized"][number] extends string
			? `${TState["name"]}_i18n`
			: never
		: K extends GlobalBuilder<infer TState>
			? TState["localized"][number] extends string
				? `${TState["name"]}_i18n`
				: never
			: never]: K extends Global<infer TState>
		? TState["localized"][number] extends string
			? InferTableWithColumns<
					TState["name"],
					LocalizedFields<TState["fields"], TState["localized"]>,
					never,
					{}
				>
			: never
		: K extends GlobalBuilder<infer TState>
			? TState["localized"][number] extends string
				? InferTableWithColumns<
						TState["name"],
						LocalizedFields<TState["fields"], TState["localized"]>,
						never,
						{}
					>
				: never
			: never;
};

export type Locale = {
	code: string;
	fallback?: boolean;
};

export interface LocaleConfig {
	/**
	 * Available locales. Can be a static array or an async function.
	 */
	locales: Locale[] | (() => Promise<Locale[]> | Locale[]);

	/**
	 * Default locale to use when none is specified.
	 */
	defaultLocale: string;

	/**
	 * Fallback locale mappings. Maps a locale code to its fallback locale code.
	 * Example: { "en-GB": "en", "fr-CA": "fr" }
	 */
	fallbacks?: Record<string, string>;
}

export type DrizzleClientFromCMSConfig<
	TCollections extends AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[],
> = ReturnType<
	typeof drizzle<
		DrizzleSchemaFromCollections<TCollections> &
			DrizzleSchemaFromGlobals<TGlobals>
	>
>;

export interface StorageConfig {
	/**
	 * FlyDrive driver instance to be used for
	 * @defaults to FSDriver (local disk storage)
	 */
	driver?: DriverContract;
}

export interface CMSConfig<
	TCollections extends AnyCollectionOrBuilder[] = AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[] = AnyGlobalOrBuilder[],
	TJobs extends JobDefinition<any, any>[] = JobDefinition<any, any>[],
> {
	app: {
		url: string;
	};

	db: {
		connection: SQL.Options;
	};

	/**
	 * List of collections to register
	 * Can be Collection instances or CollectionBuilder instances
	 * Builders will be automatically built during registration
	 */
	collections: TCollections;

	/**
	 * List of globals to register
	 */
	globals?: TGlobals;

	/**
	 * Global localization settings
	 */
	locale?: LocaleConfig;

	/**
	 * Secret key for signing tokens, etc.
	 */
	secret?: string;

	/**
	 * Authentication configuration (Better Auth)
	 */
	auth?: BetterAuthOptions;

	/**
	 * Storage configuration
	 */
	storage?: StorageConfig;

	/**
	 * Email configuration (Nodemailer + React Email)
	 */
	email?: MailerConfig;

	/**
	 * Queue configuration (pg-boss)
	 */
	queue?: BaseQueueConfig<TJobs>;
}

export interface CMSContextExtensions {
	// To be extended by plugins or user config
	[key: string]: any;
}
