import type {
	Collection,
	CollectionBuilder,
	GlobalBuilder,
	Global,
} from "#questpie/cms/server";
import type {
	LocalizedFields,
	NonLocalizedFields,
	InferTableWithColumns,
} from "#questpie/cms/server/collection/builder/types";
import type {
	AnyCollectionOrBuilder,
	AnyGlobal,
	AnyGlobalBuilder,
	AnyGlobalOrBuilder,
	CollectionNames,
	GetCollection,
	GlobalNames,
	GetGlobal,
} from "#questpie/cms/shared/type-utils.js";
import type { FunctionsMap } from "#questpie/cms/server/functions/types";

// Re-export for convenience (many files import from here)
export type {
	AnyCollectionOrBuilder,
	AnyGlobal,
	AnyGlobalBuilder,
	AnyGlobalOrBuilder,
	CollectionNames,
	GetCollection,
	GlobalNames,
	GetGlobal,
};

import type { drizzle as drizzleBun } from "drizzle-orm/bun-sql";
import type { drizzle as drizzlePgLite } from "drizzle-orm/pglite";
import type { SQL } from "bun";
import type { BetterAuthOptions, Auth } from "better-auth";
import type { MailerConfig } from "../integrated/mailer";
import type {
	QueueConfig as BaseQueueConfig,
	JobDefinition,
} from "../integrated/queue/types";
import type { SearchConfig } from "../integrated/search";
import type { RealtimeConfig } from "../integrated/realtime";
import type { DriverContract } from "flydrive/types";
import type { Migration } from "../migration/types";
import type { PGlite } from "@electric-sql/pglite";

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

export type DbClientType = "postgres" | "pglite";

export type DrizzleClientFromCMSConfig<
	TCollections extends AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[],
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
	TCollections extends AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[],
> = DrizzleClientFromCMSConfig<TCollections, TGlobals>;

export type AccessMode = "user" | "system";

/**
 * Auth configuration for QCMS
 * Can be:
 * 1. BetterAuthOptions object (will be passed to betterAuth() internally)
 * 2. A factory function returning BetterAuthOptions (db) => BetterAuthOptions
 * 3. A Better Auth instance (already instantiated via betterAuth())
 */
export type AuthConfig =
	| BetterAuthOptions
	| Auth
	| ((db: SQL) => BetterAuthOptions | Auth);

/**
 * Infer the Better Auth instance type from AuthConfig
 * If AuthConfig is already an Auth instance, use it as-is
 * Otherwise, create a generic Auth type from BetterAuthOptions
 */
export type InferAuthFromConfig<TAuthConfig> = TAuthConfig extends Auth
	? TAuthConfig
	: TAuthConfig extends BetterAuthOptions
		? Auth
		: TAuthConfig extends (db: SQL) => infer TReturn
			? TReturn extends Auth
				? TReturn
				: TReturn extends BetterAuthOptions
					? Auth
					: Auth
			: Auth;

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

export interface CMSConfig<
	TCollections extends AnyCollectionOrBuilder[] = AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[] = AnyGlobalOrBuilder[],
	TJobs extends JobDefinition<any, any>[] = JobDefinition<any, any>[],
	TEmailTemplates extends any[] = any[],
	TFunctions extends FunctionsMap = FunctionsMap,
	TDbConfig extends CMSDbConfig = CMSDbConfig,
	TAuthConfig extends AuthConfig | undefined = AuthConfig | undefined,
> {
	app: {
		url: string;
	};

	db: TDbConfig;
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
	 * RPC functions (root-level)
	 */
	functions?: TFunctions;

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
	 *
	 * Three patterns supported:
	 *
	 * 1. Callback with defaultQCMSAuth() helper (RECOMMENDED):
	 * ```ts
	 * auth: (db) => defaultQCMSAuth(db, {
	 *   emailPassword: true,
	 *   baseURL: 'http://localhost:3000'
	 * })
	 * ```
	 *
	 * 2. Direct BetterAuthOptions (creates separate connection):
	 * ```ts
	 * auth: defaultQCMSAuth(new SQL({ url: DATABASE_URL }), {
	 *   emailPassword: true,
	 *   baseURL: 'http://localhost:3000'
	 * })
	 * ```
	 *
	 * 3. Full control with custom betterAuth() instance:
	 * ```ts
	 * auth: betterAuth({
	 *   database: { client: db.client, type: 'postgres' },
	 *   plugins: [admin(), twoFactor()],
	 *   // ... full Better Auth config
	 * })
	 * ```
	 */
	auth?: TAuthConfig;

	/**
	 * Storage configuration
	 */
	storage?: StorageConfig;

	/**
	 * Email configuration (Nodemailer + React Email)
	 */
	email?: MailerConfig<TEmailTemplates>;

	/**
	 * Queue configuration (pg-boss)
	 */
	queue?: BaseQueueConfig<TJobs>;

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

export interface CMSContextExtensions {
	// To be extended by plugins or user config
	[key: string]: any;
}
