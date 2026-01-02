import type {
	AnyCollectionOrBuilder,
	AnyGlobalOrBuilder,
	AuthConfig,
	CMSDbConfig,
} from "#questpie/cms/server/config/types";
import type { FunctionDefinition } from "#questpie/cms/server/functions/types";
import type {
	JobDefinition,
	QueueAdapter,
} from "#questpie/cms/server/integrated/queue/types";
import type {
	EmailTemplateDefinition,
	MailerConfig,
} from "#questpie/cms/server/integrated/mailer";
import type { StorageConfig } from "#questpie/cms/server/config/types";
import type { SearchConfig } from "#questpie/cms/server/integrated/search";
import type { RealtimeConfig } from "#questpie/cms/server/integrated/realtime";
import type { Migration } from "#questpie/cms/server/migration/types";
import type { LocaleConfig } from "#questpie/cms/server/config/types";
import type { LoggerConfig } from "#questpie/cms/server/integrated/logger";
import type { KVConfig } from "#questpie/cms/server/integrated/kv";
import type { assetsCollection } from "#questpie/cms/server/collection/defaults/assets";
import type {
	accountsCollection,
	sessionsCollection,
	usersCollection,
	verificationsCollection,
} from "#questpie/cms/server/collection/defaults/auth";

export type BuilderCollectionsMap = Record<string, AnyCollectionOrBuilder>;
export type BuilderGlobalsMap = Record<string, AnyGlobalOrBuilder>;
export type BuilderJobsMap = Record<string, JobDefinition<any, any>>;
export type BuilderEmailTemplatesMap = Record<
	string,
	EmailTemplateDefinition<any, any>
>;
export type BuilderFunctionsMap = Record<string, FunctionDefinition>;
export type BuilderMapValues<TMap extends Record<PropertyKey, any>> =
	TMap[keyof TMap];
export type EmptyBuilderMap = Record<never, never>;

/**
 * Core collections that are always available in every QCMS instance
 */
export type CoreCollectionsMap = BuilderCollectionsMap & {
	questpie_assets: typeof assetsCollection;
	user: typeof usersCollection;
	session: typeof sessionsCollection;
	account: typeof accountsCollection;
	verification: typeof verificationsCollection;
};

/**
 * Core collections as an array (for type constraints)
 */
export type CoreCollectionsArray = [
	typeof assetsCollection,
	typeof usersCollection,
	typeof sessionsCollection,
	typeof accountsCollection,
	typeof verificationsCollection,
];

/**
 * Builder state - definition-time configuration (type-inferrable)
 * Only includes things that affect type inference
 */
export interface QCMSBuilderState<
	TName extends string = string,
	TCollections extends BuilderCollectionsMap = BuilderCollectionsMap,
	TGlobals extends BuilderGlobalsMap = BuilderGlobalsMap,
	TJobs extends BuilderJobsMap = BuilderJobsMap,
	TEmailTemplates extends BuilderEmailTemplatesMap = BuilderEmailTemplatesMap,
	TFunctions extends BuilderFunctionsMap = BuilderFunctionsMap,
	TAuth extends AuthConfig | undefined = AuthConfig | undefined,
> {
	name: TName;
	collections: TCollections;
	globals: TGlobals;
	jobs: TJobs;
	emailTemplates: TEmailTemplates;
	functions: TFunctions;

	// Type-inferrable configurations (affect types)
	auth?: TAuth;
	locale?: LocaleConfig;

	// Migrations from modules
	migrations?: Migration[];
}

/**
 * Runtime configuration - provided at .build() time
 * This is what requires environment variables and runtime values
 */
export interface QCMSRuntimeConfig<
	TDbConfig extends CMSDbConfig = CMSDbConfig,
> {
	/**
	 * Application settings
	 */
	app: {
		url: string;
	};

	/**
	 * Database connection
	 */
	db: TDbConfig;

	/**
	 * Secret key for signing tokens, etc.
	 */
	secret?: string;

	/**
	 * Storage configuration (driver, etc.)
	 */
	storage?: StorageConfig;

	/**
	 * Email adapter configuration (SMTP, console, etc.)
	 */
	email?: Pick<MailerConfig, "adapter" | "defaults">;

	/**
	 * Queue adapter configuration
	 */
	queue?: {
		adapter: QueueAdapter;
	};

	/**
	 * Search configuration (BM25, embeddings, etc.)
	 */
	search?: SearchConfig;

	/**
	 * Realtime adapter configuration
	 */
	realtime?: RealtimeConfig;

	/**
	 * Logger configuration
	 */
	logger?: LoggerConfig;

	/**
	 * KV adapter configuration
	 */
	kv?: KVConfig;

	/**
	 * Migration directory
	 */
	migrations?: {
		directory?: string;
	};
}

/**
 * Initial builder state with core collections
 * Core collections (assets, auth tables) are always included
 */
export type EmptyNamedBuilderState<TName extends string> = QCMSBuilderState<
	TName,
	CoreCollectionsMap,
	EmptyBuilderMap,
	EmptyBuilderMap,
	EmptyBuilderMap,
	EmptyBuilderMap,
	undefined
> & {
	auth: undefined;
	locale: undefined;
	migrations: undefined;
};

export type EmptyBuilderState = EmptyNamedBuilderState<"">;
