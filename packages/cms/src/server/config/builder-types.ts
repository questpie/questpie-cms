import type {
	AnyCollectionOrBuilder,
	AnyGlobalOrBuilder,
	AuthConfig,
} from "#questpie/cms/server/config/types";
import type {
	JobDefinition,
	QueueAdapter,
} from "#questpie/cms/server/integrated/queue/types";
import type { MailerConfig } from "#questpie/cms/server/integrated/mailer";
import type { StorageConfig } from "#questpie/cms/server/config/types";
import type { SearchConfig } from "#questpie/cms/server/integrated/search";
import type { RealtimeConfig } from "#questpie/cms/server/integrated/realtime";
import type { Migration } from "#questpie/cms/server/migration/types";
import type { LocaleConfig } from "#questpie/cms/server/config/types";

export type BuilderCollectionsMap = Record<string, AnyCollectionOrBuilder>;
export type BuilderGlobalsMap = Record<string, AnyGlobalOrBuilder>;
export type BuilderJobsMap = Record<string, JobDefinition<any, any>>;
export type BuilderMapValues<TMap extends Record<PropertyKey, any>> =
	TMap[keyof TMap];
export type EmptyBuilderMap = Record<never, never>;

/**
 * Builder state - definition-time configuration
 * This is what modules and main CMS define (no runtime config)
 */
export interface QCMSBuilderState<
	TName extends string = string,
	TCollections extends BuilderCollectionsMap = BuilderCollectionsMap,
	TGlobals extends BuilderGlobalsMap = BuilderGlobalsMap,
	TJobs extends BuilderJobsMap = BuilderJobsMap,
> {
	name: TName;
	collections: TCollections;
	globals: TGlobals;
	jobs: TJobs;

	// Optional service configurations (can be overridden)
	auth?: AuthConfig;
	storage?: StorageConfig;
	email?: MailerConfig;
	search?: SearchConfig;
	realtime?: RealtimeConfig;
	locale?: LocaleConfig;

	// Queue adapter (required if jobs are defined)
	queueAdapter?: QueueAdapter;

	// Migrations from modules
	migrations?: Migration[];
}

/**
 * Runtime configuration - provided at .build() time
 * This is what requires environment variables and runtime values
 */
export interface QCMSRuntimeConfig {
	/**
	 * Application settings
	 */
	app: {
		url: string;
	};

	/**
	 * Database connection
	 */
	db: {
		connection: Bun.SQL.Options;
	};

	/**
	 * Secret key for signing tokens, etc.
	 */
	secret?: string;

	/**
	 * Optional: Override storage runtime config
	 * (if storage is already defined in builder, this merges runtime params)
	 */
	storage?: Partial<StorageConfig>;

	/**
	 * Optional: Override email runtime config
	 * (if email is already defined in builder, this merges runtime params)
	 */
	email?: Partial<MailerConfig>;

	/**
	 * Optional: Migration directory override
	 */
	migrations?: {
		directory?: string;
	};

	/**
	 * Optional: Override queue adapter at runtime
	 * (if not provided in builder)
	 */
	queueAdapter?: QueueAdapter;
}

/**
 * Empty builder state
 */
export type EmptyNamedBuilderState<TName extends string> = QCMSBuilderState<
	TName,
	EmptyBuilderMap,
	EmptyBuilderMap,
	EmptyBuilderMap
> & {
	auth: undefined;
	storage: undefined;
	email: undefined;
	search: undefined;
	realtime: undefined;
	locale: undefined;
	queueAdapter: undefined;
	migrations: undefined;
};

export type EmptyBuilderState = EmptyNamedBuilderState<"">;
