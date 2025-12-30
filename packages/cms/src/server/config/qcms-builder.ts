import type {
	BuilderCollectionsMap,
	BuilderGlobalsMap,
	BuilderJobsMap,
	BuilderMapValues,
	EmptyNamedBuilderState,
	QCMSBuilderState,
	QCMSRuntimeConfig,
} from "#questpie/cms/server/config/builder-types";
import type {
	AuthConfig,
	CMSConfig,
	LocaleConfig,
	StorageConfig,
} from "#questpie/cms/server/config/types";
import type {
	QueueAdapter,
} from "#questpie/cms/server/integrated/queue/types";
import type { MailerConfig } from "#questpie/cms/server/integrated/mailer";
import type { SearchConfig } from "#questpie/cms/server/integrated/search";
import type { Migration } from "#questpie/cms/server/migration/types";
import { QCMS } from "#questpie/cms/server/config/cms";

type BuilderCollectionsArray<TState extends QCMSBuilderState> = Array<
	BuilderMapValues<TState["collections"]>
>;
type BuilderGlobalsArray<TState extends QCMSBuilderState> = Array<
	BuilderMapValues<TState["globals"]>
>;
type BuilderJobsArray<TState extends QCMSBuilderState> = Array<
	BuilderMapValues<TState["jobs"]>
>;
type QCMSFromState<TState extends QCMSBuilderState> = QCMS<
	BuilderCollectionsArray<TState>,
	BuilderGlobalsArray<TState>,
	BuilderJobsArray<TState>
>;

/**
 * QCMS Builder - Fluent API for building CMS instances
 *
 * Supports:
 * - Incremental configuration via builder pattern
 * - Module composition via .use()
 * - Type-safe collections, globals, jobs as maps
 * - Override mechanism (last wins)
 * - Separation of definition-time and runtime config
 *
 * @example
 * ```ts
 * const cms = defineQCMS({ name: 'my-app' })
 *   .collections({
 *     posts: postsCollection,
 *     comments: commentsCollection,
 *   })
 *   .jobs({
 *     sendEmail: sendEmailJob,
 *   })
 *   .auth((db) => defaultQCMSAuth(db, { ... }))
 *   .build({
 *     app: { url: process.env.APP_URL },
 *     db: { connection: { url: process.env.DATABASE_URL } },
 *   })
 * ```
 */
export class QCMSBuilder<TState extends QCMSBuilderState = QCMSBuilderState> {
	private state: TState;
	public declare readonly $inferCms: QCMSFromState<TState>;

	constructor(state: TState) {
		this.state = state;
	}

	/**
	 * Define collections (as a map for type-safe access)
	 *
	 * @example
	 * ```ts
	 * .collections({
	 *   posts: postsCollection,
	 *   comments: commentsCollection,
	 * })
	 * ```
	 */
	collections<TNewCollections extends BuilderCollectionsMap>(
		collections: TNewCollections,
	): QCMSBuilder<
		Omit<TState, "collections"> & {
			collections: Omit<TState["collections"], keyof TNewCollections> &
				TNewCollections;
		}
	> {
		return new QCMSBuilder({
			...this.state,
			collections: {
				...this.state.collections,
				...collections,
			},
		} as any);
	}

	/**
	 * Define globals (as a map for type-safe access)
	 *
	 * @example
	 * ```ts
	 * .globals({
	 *   siteSettings: siteSettingsGlobal,
	 * })
	 * ```
	 */
	globals<TNewGlobals extends BuilderGlobalsMap>(
		globals: TNewGlobals,
	): QCMSBuilder<
		Omit<TState, "globals"> & {
			globals: Omit<TState["globals"], keyof TNewGlobals> & TNewGlobals;
		}
	> {
		return new QCMSBuilder({
			...this.state,
			globals: {
				...this.state.globals,
				...globals,
			},
		} as any);
	}

	/**
	 * Define jobs (as a map for type-safe access)
	 *
	 * @example
	 * ```ts
	 * .jobs({
	 *   sendEmail: sendEmailJob,
	 *   processImage: processImageJob,
	 * })
	 * ```
	 */
	jobs<TNewJobs extends BuilderJobsMap>(
		jobs: TNewJobs,
	): QCMSBuilder<
		Omit<TState, "jobs"> & {
			jobs: Omit<TState["jobs"], keyof TNewJobs> & TNewJobs;
		}
	> {
		return new QCMSBuilder({
			...this.state,
			jobs: {
				...this.state.jobs,
				...jobs,
			},
		} as any);
	}

	/**
	 * Configure authentication (Better Auth)
	 * Override strategy: Last wins
	 *
	 * @example
	 * ```ts
	 * .auth((db) => defaultQCMSAuth(db, {
	 *   emailPassword: true,
	 *   baseURL: 'http://localhost:3000'
	 * }))
	 * ```
	 */
	auth<TAuth extends AuthConfig>(
		auth: TAuth,
	): QCMSBuilder<Omit<TState, "auth"> & { auth: TAuth }> {
		return new QCMSBuilder({
			...this.state,
			auth,
		} as any);
	}

	/**
	 * Configure storage (Flydrive)
	 * Override strategy: Last wins
	 *
	 * @example
	 * ```ts
	 * .storage({ driver: s3Driver })
	 * ```
	 */
	storage(
		storage: StorageConfig,
	): QCMSBuilder<Omit<TState, "storage"> & { storage: StorageConfig }> {
		return new QCMSBuilder({
			...this.state,
			storage,
		} as any);
	}

	/**
	 * Configure email (Nodemailer + React Email)
	 * Override strategy: Last wins
	 *
	 * @example
	 * ```ts
	 * .email({ from: 'noreply@example.com' })
	 * ```
	 */
	email(
		email: MailerConfig,
	): QCMSBuilder<Omit<TState, "email"> & { email: MailerConfig }> {
		return new QCMSBuilder({
			...this.state,
			email,
		} as any);
	}

	/**
	 * Configure search (Postgres 18+ BM25, FTS, Trigrams)
	 * Override strategy: Last wins
	 *
	 * @example
	 * ```ts
	 * .search({ enableBM25: true })
	 * ```
	 */
	search(
		search: SearchConfig,
	): QCMSBuilder<Omit<TState, "search"> & { search: SearchConfig }> {
		return new QCMSBuilder({
			...this.state,
			search,
		} as any);
	}

	/**
	 * Configure localization
	 * Override strategy: Last wins
	 *
	 * @example
	 * ```ts
	 * .locale({
	 *   locales: [{ code: 'en' }, { code: 'sk' }],
	 *   defaultLocale: 'en',
	 * })
	 * ```
	 */
	locale(
		locale: LocaleConfig,
	): QCMSBuilder<Omit<TState, "locale"> & { locale: LocaleConfig }> {
		return new QCMSBuilder({
			...this.state,
			locale,
		} as any);
	}

	/**
	 * Configure queue adapter
	 * Override strategy: Last wins
	 *
	 * @example
	 * ```ts
	 * .queueAdapter(pgBossAdapter({ ... }))
	 * ```
	 */
	queueAdapter(
		adapter: QueueAdapter,
	): QCMSBuilder<Omit<TState, "queueAdapter"> & { queueAdapter: QueueAdapter }> {
		return new QCMSBuilder({
			...this.state,
			queueAdapter: adapter,
		} as any);
	}

	/**
	 * Add migrations
	 * Merges with existing migrations
	 *
	 * @example
	 * ```ts
	 * .migrations([customMigration1, customMigration2])
	 * ```
	 */
	migrations(
		migrations: Migration[],
	): QCMSBuilder<
		Omit<TState, "migrations"> & { migrations: Migration[] }
	> {
		return new QCMSBuilder({
			...this.state,
			migrations: [...(this.state.migrations || []), ...migrations],
		} as any);
	}

	/**
	 * Use (compose) another QCMS builder (module composition)
	 * Override strategy: Last wins for all properties
	 *
	 * @example
	 * ```ts
	 * // Simple module composition
	 * const blogModule = defineQCMS({ name: 'blog' })
	 *   .collections({
	 *     posts: postsCollection,
	 *     categories: categoriesCollection,
	 *   })
	 *   .jobs({
	 *     publishPost: publishPostJob,
	 *   })
	 *
	 * const cms = defineQCMS({ name: 'app' })
	 *   .use(blogModule)
	 *   .collections({
	 *     products: productsCollection,
	 *   })
	 *   .build({ ... })
	 * ```
	 *
	 * @example
	 * ```ts
	 * // Override/extend collection from module using .merge()
	 * const blogModule = defineQCMS({ name: 'blog' })
	 *   .collections({ posts: postsCollection })
	 *
	 * const cms = defineQCMS({ name: 'app' })
	 *   .use(blogModule)
	 *   .collections({
	 *     // Override posts collection with custom fields
	 *     posts: blogModule.state.collections.posts.merge(
	 *       defineCollection("posts").fields({
	 *         featured: boolean("featured").default(false),
	 *         viewCount: integer("view_count").default(0),
	 *       })
	 *     )
	 *   })
	 * ```
	 */
	use<TOtherState extends QCMSBuilderState>(
		other: QCMSBuilder<TOtherState>,
	): QCMSBuilder<{
		name: TState["name"];
		collections: Omit<TState["collections"], keyof TOtherState["collections"]> &
			TOtherState["collections"];
		globals: Omit<TState["globals"], keyof TOtherState["globals"]> &
			TOtherState["globals"];
		jobs: Omit<TState["jobs"], keyof TOtherState["jobs"]> &
			TOtherState["jobs"];
		auth: TOtherState["auth"] extends undefined
			? TState["auth"]
			: TOtherState["auth"];
		storage: TOtherState["storage"] extends undefined
			? TState["storage"]
			: TOtherState["storage"];
		email: TOtherState["email"] extends undefined
			? TState["email"]
			: TOtherState["email"];
		search: TOtherState["search"] extends undefined
			? TState["search"]
			: TOtherState["search"];
		locale: TOtherState["locale"] extends undefined
			? TState["locale"]
			: TOtherState["locale"];
		queueAdapter: TOtherState["queueAdapter"] extends undefined
			? TState["queueAdapter"]
			: TOtherState["queueAdapter"];
		migrations: Migration[];
	}> {
		const otherState = (other as any).state as TOtherState;

		return new QCMSBuilder({
			name: this.state.name, // Keep current name
			collections: {
				...this.state.collections,
				...otherState.collections,
			},
			globals: {
				...this.state.globals,
				...otherState.globals,
			},
			jobs: {
				...this.state.jobs,
				...otherState.jobs,
			},
			// Override strategy: Last wins (module overrides if defined)
			auth: otherState.auth ?? this.state.auth,
			storage: otherState.storage ?? this.state.storage,
			email: otherState.email ?? this.state.email,
			search: otherState.search ?? this.state.search,
			locale: otherState.locale ?? this.state.locale,
			queueAdapter: otherState.queueAdapter ?? this.state.queueAdapter,
			migrations: [
				...(this.state.migrations || []),
				...(otherState.migrations || []),
			],
		} as any);
	}

	/**
	 * Build the final QCMS instance
	 * Requires runtime configuration (app.url, db.connection, etc.)
	 *
	 * @example
	 * ```ts
	 * .build({
	 *   app: { url: process.env.APP_URL },
	 *   db: { connection: { url: process.env.DATABASE_URL } },
	 *   secret: process.env.SECRET,
	 * })
	 * ```
	 */
	build(runtimeConfig: QCMSRuntimeConfig): QCMSFromState<TState> {
		// Convert maps to arrays for CMSConfig
		const collections = Object.values(
			this.state.collections,
		) as BuilderCollectionsArray<TState>;
		const globals = Object.values(
			this.state.globals,
		) as BuilderGlobalsArray<TState>;

		// Convert jobs map to array
		const jobs = Object.values(this.state.jobs) as BuilderJobsArray<TState>;

		// Merge storage config
		const storage = this.state.storage
			? { ...this.state.storage, ...runtimeConfig.storage }
			: runtimeConfig.storage;

		// Merge email config
		const email = this.state.email
			? { ...this.state.email, ...runtimeConfig.email }
			: runtimeConfig.email;

		// Queue adapter: runtime overrides builder
		const queueAdapter =
			runtimeConfig.queueAdapter ?? this.state.queueAdapter;

		// Build CMSConfig compatible with current QCMS constructor
		const cmsConfig: CMSConfig<
			BuilderCollectionsArray<TState>,
			BuilderGlobalsArray<TState>,
			BuilderJobsArray<TState>
		> = {
			app: runtimeConfig.app,
			db: runtimeConfig.db,
			secret: runtimeConfig.secret,
			collections,
			globals,
			locale: this.state.locale,
			auth: this.state.auth,
			storage: storage as StorageConfig | undefined,
			email: email as MailerConfig | undefined,
			queue:
				jobs.length > 0 || queueAdapter
					? {
							jobs,
							adapter: queueAdapter!,
						}
					: undefined,
			search: this.state.search,
			migrations: {
				directory: runtimeConfig.migrations?.directory,
				migrations: this.state.migrations,
			},
		};

		return new QCMS(cmsConfig);
	}
}

/**
 * Helper function to start building a QCMS instance
 *
 * @example
 * ```ts
 * const cms = defineQCMS({ name: 'my-app' })
 *   .collections({ ... })
 *   .build({ ... })
 * ```
 */
export function defineQCMS<TName extends string>(config: {
	name: TName;
}): QCMSBuilder<EmptyNamedBuilderState<TName>> {
	return new QCMSBuilder({
		name: config.name,
		collections: {},
		globals: {},
		jobs: {},
		auth: undefined,
		storage: undefined,
		email: undefined,
		search: undefined,
		locale: undefined,
		queueAdapter: undefined,
		migrations: undefined,
	} as EmptyNamedBuilderState<TName>);
}
