import type {
	Collection,
	CollectionBuilder,
	Global,
	GlobalBuilder,
} from "#questpie/cms/server";
import type {
	InferTableWithColumns,
	LocalizedFields,
	NonLocalizedFields,
} from "#questpie/cms/server/collection/builder/types";
import type { FunctionsMap } from "#questpie/cms/server/functions/types";
import type {
	AnyCollectionOrBuilder,
	AnyGlobal,
	AnyGlobalBuilder,
	AnyGlobalOrBuilder,
	GetCollection,
	GetGlobal,
} from "#questpie/cms/shared/type-utils.js";

// Re-export for convenience (many files import from here)
export type {
	AnyCollectionOrBuilder,
	AnyGlobal,
	AnyGlobalBuilder,
	AnyGlobalOrBuilder,
	GetCollection,
	GetGlobal,
};

import type { PGlite } from "@electric-sql/pglite";
import type { drizzle as drizzleBun } from "drizzle-orm/bun-sql";
import type { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import type { DriverContract } from "flydrive/types";
import type { MailerConfig } from "../integrated/mailer";
import type { QueueConfig as BaseQueueConfig } from "../integrated/queue/types";
import type { RealtimeConfig } from "../integrated/realtime";
import type { SearchConfig } from "../integrated/search";
import type { Migration } from "../migration/types";
import type { BetterAuthOptions } from "better-auth";

export type DrizzleSchemaFromCollections<
	TCollections extends Record<string, AnyCollectionOrBuilder>,
> = {
	[K in keyof TCollections as TCollections[K] extends Collection<infer TState>
		? TState["name"]
		: TCollections[K] extends CollectionBuilder<infer TState>
			? TState["name"]
			: never]: TCollections[K] extends Collection<infer TState>
		? InferTableWithColumns<
				TState["name"],
				NonLocalizedFields<TState["fields"], TState["localized"]>,
				TState["title"],
				TState["options"]
			>
		: TCollections[K] extends CollectionBuilder<infer TState>
			? InferTableWithColumns<
					TState["name"],
					NonLocalizedFields<TState["fields"], TState["localized"]>,
					TState["title"],
					TState["options"]
				>
			: never;
} & {
	[K in keyof TCollections as TCollections[K] extends Collection<infer TState>
		? TState["localized"][number] extends string
			? `${TState["name"]}_i18n`
			: never
		: TCollections[K] extends CollectionBuilder<infer TState>
			? TState["localized"][number] extends string
				? `${TState["name"]}_i18n`
				: never
			: never]: TCollections[K] extends Collection<infer TState>
		? TState["localized"][number] extends string
			? InferTableWithColumns<
					TState["name"],
					LocalizedFields<TState["fields"], TState["localized"]>,
					TState["title"],
					TState["options"]
				>
			: never
		: TCollections[K] extends CollectionBuilder<infer TState>
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

export type DrizzleSchemaFromGlobals<
	TGlobals extends Record<string, AnyGlobalOrBuilder>,
> = {
	[K in keyof TGlobals as TGlobals[K] extends Global<infer TState>
		? TState["name"]
		: TGlobals[K] extends GlobalBuilder<infer TState>
			? TState["name"]
			: never]: TGlobals[K] extends Global<infer TState>
		? InferTableWithColumns<
				TState["name"],
				NonLocalizedFields<TState["fields"], TState["localized"]>,
				never,
				{}
			>
		: TGlobals[K] extends GlobalBuilder<infer TState>
			? InferTableWithColumns<
					TState["name"],
					NonLocalizedFields<TState["fields"], TState["localized"]>,
					never,
					{}
				>
			: never;
} & {
	[K in keyof TGlobals as TGlobals[K] extends Global<infer TState>
		? TState["localized"][number] extends string
			? `${TState["name"]}_i18n`
			: never
		: TGlobals[K] extends GlobalBuilder<infer TState>
			? TState["localized"][number] extends string
				? `${TState["name"]}_i18n`
				: never
			: never]: TGlobals[K] extends Global<infer TState>
		? TState["localized"][number] extends string
			? InferTableWithColumns<
					TState["name"],
					LocalizedFields<TState["fields"], TState["localized"]>,
					never,
					{}
				>
			: never
		: TGlobals[K] extends GlobalBuilder<infer TState>
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

export type DbClientType = "postgres" | "pglite";

export type DrizzleClientFromCMSConfig<
	TCollections extends Record<string, AnyCollectionOrBuilder>,
	TGlobals extends Record<string, AnyGlobalOrBuilder>,
	TDbClientType extends DbClientType = "postgres",
> = ReturnType<
	TDbClientType extends "postgres"
		? typeof drizzleBun<
				DrizzleSchemaFromCollections<TCollections> &
					DrizzleSchemaFromGlobals<TGlobals>
			>
		: typeof drizzlePgLite<
				DrizzleSchemaFromCollections<TCollections> &
					DrizzleSchemaFromGlobals<TGlobals>
			>
>;

export type CmsDbClient<
	TCollections extends Record<string, AnyCollectionOrBuilder>,
	TGlobals extends Record<string, AnyGlobalOrBuilder>,
> = DrizzleClientFromCMSConfig<TCollections, TGlobals>;

export type AccessMode = "user" | "system";

export interface StorageConfig {
	/**
	 * FlyDrive driver instance to be used for
	 * @defaults to FSDriver (local disk storage)
	 */
	driver?: DriverContract;
}

export type CMSDbConfig =
	| {
			url: string;
	  }
	| {
			pglite: PGlite;
	  };

export type InferyDbClientType<TDbConfig extends CMSDbConfig> =
	TDbConfig extends {
		url: string;
	}
		? "postgres"
		: TDbConfig extends { pglite: PGlite }
			? "pglite"
			: never;

export interface CMSConfig {
	app: {
		url: string;
	};

	db: CMSDbConfig;

	/**
	 * Collections map - register collections as object with keys
	 * Can be Collection instances or CollectionBuilder instances
	 * Builders will be automatically built during registration
	 */
	collections: Record<string, AnyCollectionOrBuilder>;

	/**
	 * Globals map - register globals as object with keys
	 */
	globals?: Record<string, AnyGlobalOrBuilder>;

	/**
	 * RPC functions (root-level)
	 */
	functions?: FunctionsMap;

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
	 * Add any new plugins on overrides. Db
	 * part cannot be overridden here, as it is internally handled by the CMS instance.
	 * ```
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
	queue?: BaseQueueConfig;

	/**
	 * Search configuration (Postgres 18+ BM25, FTS, Trigrams)
	 * Enables full-text search with BM25 ranking, fuzzy matching, and optional embeddings
	 */
	search?: SearchConfig;

	/**
	 * Realtime configuration (outbox + SSE/WS adapters)
	 */
	realtime?: RealtimeConfig;

	/**
	 * Logger configuration
	 */
	logger?: import("../integrated/logger").LoggerConfig;

	/**
	 * KV store configuration
	 */
	kv?: import("../integrated/kv").KVConfig;

	/**
	 * Migration configuration
	 */
	migrations?: {
		/**
		 * Directory where migrations are stored
		 * @default "./migrations"
		 */
		directory?: string;

		/**
		 * Manually defined migrations (optional)
		 * Usually migrations are auto-generated, but you can define custom ones here
		 * Or migrations from modules will be merged here
		 */
		migrations?: Migration[];
	};
}

/**
 * Utility types to extract info from a concrete CMSConfig
 */
export type GetCollections<T extends CMSConfig> = T["collections"];
export type GetGlobals<T extends CMSConfig> = NonNullable<T["globals"]>;
export type GetFunctions<T extends CMSConfig> = NonNullable<T["functions"]>;
export type GetAuth<T extends CMSConfig> = T["auth"];
export type GetDbConfig<T extends CMSConfig> = T["db"];

export interface CMSContextExtensions {
	// To be extended by plugins or user config
	[key: string]: any;
}
