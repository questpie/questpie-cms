import type { BetterAuthOptions } from "better-auth";
import type {
	BuilderCollectionsMap,
	BuilderEmailTemplatesMap,
	BuilderFunctionsMap,
	BuilderGlobalsMap,
	BuilderJobsMap,
	QuestpieBuilderState,
	QuestpieRuntimeConfig,
} from "#questpie/server/config/builder-types.js";
import { Questpie } from "#questpie/server/config/cms.js";
import type {
	DbConfig,
	LocaleConfig,
	QuestpieConfig,
} from "#questpie/server/config/types.js";
import {
	mergeMessagesIntoConfig,
	mergeTranslationsConfig,
} from "#questpie/server/i18n/translator.js";
import type {
	InferMessageKeys,
	MessagesShape,
	TranslationsConfig,
} from "#questpie/server/i18n/types.js";
import {
	type MergeAuthOptions,
	mergeAuthOptions,
} from "#questpie/server/integrated/auth/config.js";
import type { Migration } from "#questpie/server/migration/types.js";
import type { MailAdapter, QueueAdapter } from "#questpie/exports/index.js";
import type {
	SetProperty,
	TypeMerge,
	UnsetProperty,
	Prettify,
	PrettifiedAnyCollectionOrBuilder,
	PrettifiedAnyGlobalOrBuilder,
} from "#questpie/shared/type-utils.js";

type QuestpieFromState<
	TState extends QuestpieBuilderState<string, any, any, any, any, any, any, any>,
> = Questpie<
	Prettify<
		TypeMerge<
			QuestpieConfig,
			{
				collections: TState["collections"];
				globals: TState["globals"];
				functions: TState["functions"];
				auth: TState["auth"];
				queue: { jobs: TState["jobs"]; adapter: QueueAdapter };
				email: { templates: TState["emailTemplates"]; adapter: MailAdapter };
				db: { url: string }; // lets enforce a bunsql type on inferred cms types from builder
			}
		>
	>
>;

/**
 * Questpie Builder - Fluent API for building CMS instances
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
 * const cms = questpie({ name: 'my-app' })
 *   .locale({ locales: ['en', 'sk'], defaultLocale: 'en' })
 *   .auth(betterAuthOptions)
 *   .collections({
 *     posts: postsCollection,
 *     comments: commentsCollection,
 *   })
 *   .jobs({
 *     sendEmail: sendEmailJob,
 *   })
 *   .emailTemplates({
 *     welcome: welcomeTemplate,
 *   })
 *   .build({
 *     app: { url: process.env.APP_URL },
 *     db: { url: process.env.DATABASE_URL },
 *     storage: { driver: s3Driver(...) },
 *     email: { adapter: smtpAdapter(...) },
 *     queue: { adapter: pgBossAdapter(...) },
 *   })
 * ```
 */
export class QuestpieBuilder<
	TState extends QuestpieBuilderState<
		string,
		any,
		any,
		any,
		any,
		any,
		any,
		any
	> = QuestpieBuilderState,
> {
	public readonly state: TState;
	/**
	 * Note: Public for module composition purposes
	 * No value at runtime - purely for type inference.
	 */
	public declare readonly $inferCms: QuestpieFromState<TState>;

	static empty<TName extends string>(name: TName) {
		return new QuestpieBuilder({
			name,
			collections: {},
			globals: {},
			jobs: {},
			emailTemplates: {},
			functions: {},
			auth: {},
			locale: undefined,
			migrations: undefined,
			translations: undefined,
			"~messageKeys": undefined,
		});
	}

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
	): QuestpieBuilder<
		SetProperty<
			TState,
			"collections",
			Prettify<
				TypeMerge<
					UnsetProperty<TState["collections"], keyof TNewCollections>,
					{
						[K in keyof TNewCollections]: PrettifiedAnyCollectionOrBuilder<
							TNewCollections[K]
						>;
					}
				>
			>
		>
	> {
		return new QuestpieBuilder({
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
	): QuestpieBuilder<
		SetProperty<
			TState,
			"globals",
			Prettify<
				TypeMerge<
					UnsetProperty<TState["globals"], keyof TNewGlobals>,
					{
						[K in keyof TNewGlobals]: PrettifiedAnyGlobalOrBuilder<
							TNewGlobals[K]
						>;
					}
				>
			>
		>
	> {
		return new QuestpieBuilder({
			...this.state,
			globals: {
				...this.state.globals,
				...globals,
			},
		} as any);
	}

	/**
	 * Define root RPC functions (as a map for type-safe access)
	 *
	 * @example
	 * ```ts
	 * .functions({
	 *   ping: pingFunction,
	 * })
	 * ```
	 */
	functions<TNewFunctions extends BuilderFunctionsMap>(
		functions: TNewFunctions,
	): QuestpieBuilder<
		SetProperty<
			TState,
			"functions",
			Prettify<
				TypeMerge<
					UnsetProperty<TState["functions"], keyof TNewFunctions>,
					TNewFunctions
				>
			>
		>
	> {
		return new QuestpieBuilder({
			...this.state,
			functions: {
				...this.state.functions,
				...functions,
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
	): QuestpieBuilder<
		SetProperty<
			TState,
			"jobs",
			Prettify<
				TypeMerge<UnsetProperty<TState["jobs"], keyof TNewJobs>, TNewJobs>
			>
		>
	> {
		return new QuestpieBuilder({
			...this.state,
			jobs: {
				...this.state.jobs,
				...jobs,
			},
		} as any);
	}

	/**
	 * Define email templates (as a map for type-safe access)
	 *
	 * @example
	 * ```ts
	 * .emailTemplates({
	 *   welcome: welcomeTemplate,
	 *   resetPassword: resetPasswordTemplate,
	 * })
	 * ```
	 */
	emailTemplates<TNewEmailTemplates extends BuilderEmailTemplatesMap>(
		emailTemplates: TNewEmailTemplates,
	): QuestpieBuilder<
		SetProperty<
			TState,
			"emailTemplates",
			Prettify<
				TypeMerge<
					UnsetProperty<TState["emailTemplates"], keyof TNewEmailTemplates>,
					TNewEmailTemplates
				>
			>
		>
	> {
		return new QuestpieBuilder({
			...this.state,
			emailTemplates: {
				...this.state.emailTemplates,
				...emailTemplates,
			},
		} as any);
	}

	/**
	 * Configure authentication (Better Auth)
	 * Type-inferrable - affects auth instance type
	 * Override strategy: Last wins
	 *
	 * @example
	 * ```ts
	 * // With BetterAuthOptions (merged with core auth defaults)
	 * .auth({
	 *   emailAndPassword: { enabled: true, requireEmailVerification: false },
	 *   baseURL: "http://localhost:3000",
	 *   secret: process.env.BETTER_AUTH_SECRET,
	 * })
	 * ```
	 *
	 * @example
	 * ```ts
	 * // With factory function (full control over DB wiring)
	 * .auth((db) =>
	 *   withAuthDatabase(mergeAuthOptions(coreAuthOptions, {
	 *     emailAndPassword: { enabled: true, requireEmailVerification: false },
	 *     baseURL: "http://localhost:3000",
	 *     secret: process.env.BETTER_AUTH_SECRET,
	 *   }), db)
	 * )
	 * ```
	 *
	 * @example
	 * ```ts
	 * // With Better Auth instance
	 * .auth(betterAuth({
	 *   database: drizzleAdapter(db, { provider: "pg" }),
	 *   emailAndPassword: { enabled: true },
	 *   baseURL: 'http://localhost:3000',
	 * }))
	 * ```
	 */
	auth<const TNewAuth extends BetterAuthOptions>(
		auth: TNewAuth | ((oldAuth: TState["auth"]) => TNewAuth),
	): QuestpieBuilder<
		Prettify<
			QuestpieBuilderState<
				TState["name"],
				TState["collections"],
				TState["globals"],
				TState["jobs"],
				TState["emailTemplates"],
				TState["functions"],
				MergeAuthOptions<TState["auth"], TNewAuth>
			>
		>
	> {
		return new QuestpieBuilder({
			...this.state,
			auth: mergeAuthOptions(
				this.state.auth,
				typeof auth === "function" ? auth(this.state.auth) : auth,
			),
		} as any);
	}

	/**
	 * Configure localization
	 * Type-inferrable - affects i18n table generation
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
	): QuestpieBuilder<SetProperty<TState, "locale", LocaleConfig>> {
		return new QuestpieBuilder({
			...this.state,
			locale,
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
	): QuestpieBuilder<SetProperty<TState, "migrations", Migration[]>> {
		return new QuestpieBuilder({
			...this.state,
			migrations: [...(this.state.migrations || []), ...migrations],
		} as any);
	}

	/**
	 * Add translated messages for backend (simple API)
	 *
	 * Messages are merged with existing messages from modules.
	 * Custom messages override defaults with same key.
	 * Message keys are tracked in the type system for type-safe access via cms.t().
	 *
	 * @example
	 * ```ts
	 * const messages = {
	 *   en: {
	 *     "booking.created": "Booking created for {{date}}",
	 *     "booking.cancelled": "Booking was cancelled",
	 *   },
	 *   sk: {
	 *     "booking.created": "Rezervácia vytvorená na {{date}}",
	 *     "booking.cancelled": "Rezervácia bola zrušená",
	 *   },
	 * } as const;
	 *
	 * const cms = q({ name: "app" })
	 *   .messages(messages)
	 *   .build({ ... });
	 *
	 * // cms.t("booking.created") is type-safe!
	 * ```
	 */
	messages<TMessages extends MessagesShape>(
		messages: TMessages,
		options?: { fallbackLocale?: string },
	): QuestpieBuilder<
		Prettify<
			TypeMerge<
				UnsetProperty<TState, "translations" | "~messageKeys">,
				{
					translations: TranslationsConfig;
					"~messageKeys":
						| Extract<TState["~messageKeys"], string>
						| InferMessageKeys<TMessages>;
				}
			>
		>
	> {
		return new QuestpieBuilder({
			...this.state,
			translations: mergeMessagesIntoConfig(
				this.state.translations,
				messages,
				options?.fallbackLocale,
			),
		} as any);
	}

	/**
	 * Use (compose) another Questpie builder (module composition)
	 * Override strategy: Last wins for all properties
	 *
	 * @example
	 * ```ts
	 * // Simple module composition
	 * const blogModule = questpie({ name: 'blog' })
	 *   .collections({
	 *     posts: postsCollection,
	 *     categories: categoriesCollection,
	 *   })
	 *   .jobs({
	 *     publishPost: publishPostJob,
	 *   })
	 *
	 * const cms = questpie({ name: 'app' })
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
	 * const blogModule = questpie({ name: 'blog' })
	 *   .collections({ posts: postsCollection })
	 *
	 * const cms = questpie({ name: 'app' })
	 *   .use(blogModule)
	 *   .collections({
	 *     // Override posts collection with custom fields
	 *     posts: blogModule.state.collections.posts.merge(
	 *       collection("posts").fields({
	 *         featured: boolean("featured").default(false),
	 *         viewCount: integer("view_count").default(0),
	 *       })
	 *     )
	 *   })
	 * ```
	 */
	use<
		TOtherName extends string,
		TOtherCollections extends BuilderCollectionsMap,
		TOtherGlobals extends BuilderGlobalsMap,
		TOtherJobs extends BuilderJobsMap,
		TOtherEmailTemplates extends BuilderEmailTemplatesMap,
		TOtherFunctions extends BuilderFunctionsMap,
		TOtherAuth extends BetterAuthOptions | Record<never, never>,
		TOtherMessageKeys extends string,
	>(
		other: QuestpieBuilder<
			QuestpieBuilderState<
				TOtherName,
				TOtherCollections,
				TOtherGlobals,
				TOtherJobs,
				TOtherEmailTemplates,
				TOtherFunctions,
				TOtherAuth,
				TOtherMessageKeys
			>
		>,
	): QuestpieBuilder<
		Prettify<
			QuestpieBuilderState<
				TState["name"],
				TypeMerge<
					UnsetProperty<TState["collections"], keyof TOtherCollections>,
					TOtherCollections
				>,
				TypeMerge<
					UnsetProperty<TState["globals"], keyof TOtherGlobals>,
					TOtherGlobals
				>,
				TypeMerge<UnsetProperty<TState["jobs"], keyof TOtherJobs>, TOtherJobs>,
				TypeMerge<
					UnsetProperty<TState["emailTemplates"], keyof TOtherEmailTemplates>,
					TOtherEmailTemplates
				>,
				TypeMerge<
					UnsetProperty<TState["functions"], keyof TOtherFunctions>,
					TOtherFunctions
				>,
				MergeAuthOptions<TState["auth"], TOtherAuth>,
				| Extract<TState["~messageKeys"], string>
				| Extract<TOtherMessageKeys, string>
			>
		>
	> {
		const otherState = (other as any).state as QuestpieBuilderState<
			TOtherName,
			TOtherCollections,
			TOtherGlobals,
			TOtherJobs,
			TOtherEmailTemplates,
			TOtherFunctions,
			TOtherAuth,
			TOtherMessageKeys
		>;

		return new QuestpieBuilder({
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
			emailTemplates: {
				...this.state.emailTemplates,
				...otherState.emailTemplates,
			},
			functions: {
				...this.state.functions,
				...otherState.functions,
			},
			auth: mergeAuthOptions(this.state.auth, otherState.auth),

			locale: otherState.locale ?? this.state.locale,
			migrations: [
				...(this.state.migrations || []),
				...(otherState.migrations || []),
			],
			translations: mergeTranslationsConfig(
				this.state.translations,
				otherState.translations,
			),
		} as any);
	}

	/**
	 * Build the final Questpie instance
	 * Requires runtime configuration (app.url, db.url, etc.)
	 *
	 * @example
	 * ```ts
	 * .build({
	 *   app: { url: process.env.APP_URL },
	 *   db: { url: process.env.DATABASE_URL },
	 *   secret: process.env.SECRET,
	 *   storage: { driver: s3Driver(...) },
	 *   email: { adapter: smtpAdapter(...) },
	 *   queue: { adapter: pgBossAdapter(...) },
	 * })
	 * ```
	 */
	build<TDbConfig extends DbConfig = DbConfig>(
		runtimeConfig: QuestpieRuntimeConfig<TDbConfig>,
	): QuestpieFromState<Prettify<TState>> {
		// Build QuestpieConfig with object-based collections, globals, jobs, templates
		const cmsConfig: QuestpieConfig = {
			app: runtimeConfig.app,
			db: runtimeConfig.db,
			secret: runtimeConfig.secret,
			collections: this.state.collections,
			globals: this.state.globals,
			functions: this.state.functions,
			locale: this.state.locale,
			auth: this.state.auth,
			storage: runtimeConfig.storage,
			email: runtimeConfig.email
				? {
						...runtimeConfig.email,
						templates: this.state.emailTemplates,
					}
				: undefined,
			queue:
				Object.keys(this.state.jobs).length > 0 && runtimeConfig.queue
					? {
							jobs: this.state.jobs,
							adapter: runtimeConfig.queue.adapter,
						}
					: undefined,
			search: runtimeConfig.search,
			realtime: runtimeConfig.realtime,
			logger: runtimeConfig.logger,
			kv: runtimeConfig.kv,
			migrations: {
				migrations: this.state.migrations,
			},
			translations: this.state.translations,
		};

		return new Questpie(cmsConfig) as any;
	}
}

/**
 * Helper function to start building a Questpie instance
 *
 * Returns an empty builder - use .use(starterModule) to include
 * auth collections and file upload support.
 *
 * @example
 * ```ts
 * // Minimal setup (no auth, no file uploads)
 * const cms = questpie({ name: 'my-app' })
 *   .collections({ posts: postsCollection })
 *   .build({ db: { url: '...' } })
 * ```
 *
 * @example
 * ```ts
 * // With starter module (auth + file uploads)
 * import { questpie, starterModule } from "@questpie/server";
 *
 * const cms = questpie({ name: 'my-app' })
 *   .use(starterModule)
 *   .collections({ posts: postsCollection })
 *   .build({
 *     db: { url: '...' },
 *     storage: { driver: s3Driver(...) },
 *   })
 * ```
 *
 * @example
 * ```ts
 * // Custom upload collection without starter module
 * const cms = questpie({ name: 'my-app' })
 *   .collections({
 *     media: collection("media")
 *       .fields({ alt: varchar("alt", { length: 500 }) })
 *       .upload({ visibility: "public", maxSize: 10_000_000 }),
 *   })
 *   .build({ db: { url: '...' }, storage: { driver: fsDriver(...) } })
 * ```
 */
export function questpie<TName extends string>(config: { name: TName }) {
	return QuestpieBuilder.empty(config.name);
}
