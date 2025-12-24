import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import type { PgTable } from "drizzle-orm/pg-core";
import {
	type AnyCollectionOrBuilder,
	type AnyGlobal,
	type AnyGlobalBuilder,
	type AnyGlobalOrBuilder,
	type CMSConfig,
	type CmsContext,
	type Collection,
	CollectionBuilder,
	type JobDefinition,
	type CollectionNames,
	type CRUD,
	type DrizzleClientFromCMSConfig,
	type Global,
	GlobalBuilder,
	type GlobalNames,
	type Locale,
	createQueueClient,
	type QueueClient,
	startJobWorkerForJobs,
	type WorkerOptions,
} from "#questpie/core/exports/server";
import type { AnyCollectionState } from "#questpie/core/server/collection/builder/types";
import { assetsCollection } from "../collection/defaults/assets";
import { AuthService } from "#questpie/core/server/integrated/auth";
import {
	accountsCollection,
	sessionsCollection,
	usersCollection,
	verificationsCollection,
} from "#questpie/core/server/collection/defaults/auth";
import { KVService } from "#questpie/core/server/integrated/kv";
import { LoggerService } from "#questpie/core/server/integrated/logger";
import { MailerService } from "#questpie/core/server/integrated/mailer";
import { Disk } from "flydrive";
import { createDiskDriver } from "#questpie/core/server/integrated/storage/drivers/fs-driver";

// Helper type to extract collection from builder or collection
type ExtractCollection<T> =
	T extends CollectionBuilder<infer TState> ? Collection<TState> : T;

// Helper type to find a collection by name in the tuple
type GetCollection<
	T extends AnyCollectionOrBuilder[],
	Name extends string,
> = ExtractCollection<Extract<T[number], { name: Name }>>;

// Helper type to extract global from builder or global
type ExtractGlobal<T> =
	T extends GlobalBuilder<infer TState> ? Global<TState> : T;

// Helper type to find a global by name in the tuple
type GetGlobal<
	T extends (AnyGlobal | AnyGlobalBuilder)[],
	Name extends string,
> = ExtractGlobal<Extract<T[number], { name: Name }>>;

export class QCMS<
	TCollections extends AnyCollectionOrBuilder[] = AnyCollectionOrBuilder[],
	TGlobals extends AnyGlobalOrBuilder[] = AnyGlobalOrBuilder[],
	TJobs extends JobDefinition<any, any>[] = JobDefinition<any, any>[],
> {
	private collections = new Map<string, Collection<AnyCollectionState>>();
	private globals = new Map<string, AnyGlobal>();
	public readonly config: CMSConfig<TCollections, TGlobals, TJobs>;
	private resolvedLocales: string[] | null = null;

	public auth: AuthService;
	public storage: Disk;
	public queue: QueueClient<TJobs>;
	public email: MailerService;
	public kv: KVService;
	public logger: LoggerService;

	public db: {
		client: SQL;
		drizzle: DrizzleClientFromCMSConfig<TCollections, TGlobals>;
	};

	constructor(config: CMSConfig<TCollections, TGlobals, TJobs>) {
		this.config = config;
		this.registerCollections([
			assetsCollection,
			usersCollection,
			sessionsCollection,
			accountsCollection,
			verificationsCollection,
			...config.collections,
		]);

		if (config.globals) {
			this.registerGlobals(config.globals);
		}

		const client = new SQL(config.db.connection);
		this.db = {
			client,
			drizzle: drizzle({
				client: client,
				schema: this.getSchema(),
			}) as DrizzleClientFromCMSConfig<TCollections, TGlobals>,
		};

		// Batteries Included - Guaranteed Initialization with sensible defaults or explicit errors
		this.kv = new KVService();
		this.logger = new LoggerService();

		// Initialize queue if configured
		if (config.queue?.jobs) {
			if (!config.queue.adapter) {
				throw new Error(
					"QUESTPIE: Queue adapter is required when jobs are defined. Example: adapter: pgBossAdapter(options)",
				);
			}
			this.queue = createQueueClient(
				config.queue.jobs,
				config.queue.adapter,
			) as any;
		} else {
			// Queue is required if defined in config
			throw new Error(
				"QUESTPIE: 'queue' configuration is required. Define jobs using defineJobs().",
			);
		}

		// For critical infrastructure, we currently require config or throw
		// In the future, we could provide safe "dev" defaults (e.g. local storage, console mail)

		if (config.auth) {
			this.auth = new AuthService(config.auth);
		} else {
			// TODO: Auto-configure using config.db if available for simple cases?
			throw new Error("QUESTPIE: 'auth' configuration is required.");
		}

		if (config.storage) {
			this.storage = new Disk(createDiskDriver(config));
		} else {
			throw new Error("QUESTPIE: 'storage' configuration is required.");
		}

		if (config.email) {
			this.email = new MailerService(config.email);
		} else {
			throw new Error("QUESTPIE: 'email' configuration is required.");
		}
	}

	private registerCollections(collections: AnyCollectionOrBuilder[]) {
		for (const item of collections) {
			// Auto-build if it's a CollectionBuilder
			const collection =
				item instanceof CollectionBuilder ? item.build() : item;

			if (this.collections.has(collection.name)) {
				throw new Error(
					`Collection "${collection.name}" is already registered.`,
				);
			}
			this.collections.set(collection.name, collection);
		}
	}

	private registerGlobals(globals: (AnyGlobal | AnyGlobalBuilder)[]) {
		for (const item of globals) {
			// Auto-build if it's a GlobalBuilder
			const global = item instanceof GlobalBuilder ? item.build() : item;

			if (this.globals.has(global.name)) {
				throw new Error(`Global "${global.name}" is already registered.`);
			}
			this.globals.set(global.name, global);
		}
	}

	public collection<TName extends CollectionNames<TCollections>>(
		name: TName,
	): GetCollection<TCollections, TName> {
		const collection = this.collections.get(name);
		if (!collection) {
			throw new Error(`Collection "${name}" not found.`);
		}
		return collection as GetCollection<TCollections, TName>;
	}

	public global<TName extends GlobalNames<TGlobals>>(
		name: TName,
	): GetGlobal<TGlobals, TName> {
		const global = this.globals.get(name);
		if (!global) {
			throw new Error(`Global "${name}" not found.`);
		}
		return global as GetGlobal<TGlobals, TName>;
	}

	public crud<
		Name extends CollectionNames<TCollections>,
		TCollection extends GetCollection<TCollections, Name> = GetCollection<
			TCollections,
			Name
		>,
	>(
		name: Name,
		context: CmsContext,
	): CRUD<
		TCollection["$infer"]["select"],
		TCollection["$infer"]["insert"],
		TCollection["$infer"]["update"]
	> {
		const collection = this.collection(name);
		// Pass the context db to generateCRUD
		return collection.generateCRUD(context.db, this) as any;
	}

	public async getLocales(): Promise<string[]> {
		if (this.resolvedLocales) return this.resolvedLocales;

		if (!this.config.locale) {
			this.resolvedLocales = ["en"];
			return this.resolvedLocales;
		}

		let locales: Locale[];
		if (Array.isArray(this.config.locale.locales)) {
			locales = this.config.locale.locales;
		} else {
			locales = await this.config.locale.locales();
		}

		// Extract locale codes from Locale objects
		this.resolvedLocales = locales.map((l) =>
			typeof l === "string" ? l : l.code,
		);

		return this.resolvedLocales;
	}

	public async createContext(
		_elysiaCtx: any,
		userCtx: any,
	): Promise<CmsContext> {
		const defaultLocale = this.config.locale?.defaultLocale || "en";
		let locale = userCtx.locale || defaultLocale;

		// Validate locale if provided
		if (userCtx.locale) {
			const locales = await this.getLocales();
			if (!locales.includes(userCtx.locale)) {
				// Fallback logic
				if (this.config.locale?.fallbacks?.[userCtx.locale]) {
					locale = this.config.locale.fallbacks[userCtx.locale];
				} else {
					locale = defaultLocale;
				}
			}
		}

		// Create child logger with request context
		const requestLogger = this.logger.child({
			// reqId: _elysiaCtx.request?.headers?.get('x-request-id') // Example
		});

		return {
			db: this.config.db, // Or elysiaCtx.db if provided there
			qcms: this,
			...userCtx,
			user: userCtx.user,
			locale,
			defaultLocale,
			auth: this.auth,
			storage: this.storage,
			queue: this.queue,
			email: this.email,
			kv: this.kv,
			logger: requestLogger,
		};
	}

	public getCollections(): Collection<AnyCollectionState>[] {
		return Array.from(this.collections.values());
	}

	public getGlobals(): AnyGlobal[] {
		return Array.from(this.globals.values());
	}

	public getTables(): Record<string, PgTable> {
		const tables: Record<string, PgTable> = {};
		for (const [name, collection] of this.collections) {
			tables[name] = collection.table as unknown as PgTable;
			if (collection.i18nTable) {
				tables[`${name}_i18n`] = collection.i18nTable as unknown as PgTable;
			}
			if (collection.versionsTable) {
				tables[`${name}_versions`] =
					collection.versionsTable as unknown as PgTable;
			}
		}
		for (const [name, global] of this.globals) {
			tables[name] = global.table as unknown as PgTable;
			if (global.i18nTable) {
				tables[`${name}_i18n`] = global.i18nTable as unknown as PgTable;
			}
			if (global.versionsTable) {
				tables[`${name}_versions`] = global.versionsTable as unknown as PgTable;
			}
		}
		return tables;
	}

	public getSchema(): Record<string, unknown> {
		const schema: Record<string, unknown> = {};

		// 1. Add tables
		for (const [name, collection] of this.collections) {
			schema[name] = collection.table;
			if (collection.i18nTable) {
				schema[`${name}_i18n`] = collection.i18nTable;
			}
			if (collection.versionsTable) {
				schema[`${name}_versions`] = collection.versionsTable;
			}
		}
		for (const [name, global] of this.globals) {
			schema[name] = global.table;
			if (global.i18nTable) {
				schema[`${name}_i18n`] = global.i18nTable;
			}
			if (global.versionsTable) {
				schema[`${name}_versions`] = global.versionsTable;
			}
		}

		// 2. Add relations (Placeholder)
		// To enable, import { relations } from 'drizzle-orm' and uncomment logic

		return schema;
	}

	/**
	 * Start listening to jobs (worker mode)
	 *
	 * This method starts the queue workers and begins processing jobs.
	 * Call this in your worker instances, not in your web server.
	 *
	 * @example
	 * ```ts
	 * // worker.ts
	 * const cms = new QCMS({ ... });
	 * await cms._listenToJobs();
	 * ```
	 *
	 * @example
	 * ```ts
	 * // Listen to specific jobs only
	 * await cms._listenToJobs(['send-email', 'process-image']);
	 * ```
	 *
	 * @example
	 * ```ts
	 * // With custom options
	 * await cms._listenToJobs({ teamSize: 20, batchSize: 10 });
	 * ```
	 */
	public async listenToJobs(options?: WorkerOptions): Promise<void> {
		if (!this.config.queue?.jobs) {
			throw new Error(
				"Cannot start job workers: No jobs configured. Add 'queue.jobs' to your QCMS config.",
			);
		}

		// Create context factory for workers
		const createContext = async (): Promise<CmsContext> => {
			return this.createContext({}, {});
		};

		await startJobWorkerForJobs(
			this.queue,
			this.config.queue.jobs,
			createContext,
			options,
		);
	}
}
