import type {
	AppConfig,
	AppEntities,
	ModuleDefinition,
} from "#questpie/server/config/module-types.js";
import { Questpie } from "#questpie/server/config/questpie.js";
import type { QuestpieConfig } from "#questpie/server/config/types.js";
import {
	mergeMessagesIntoConfig,
	mergeTranslationsConfig,
} from "#questpie/server/i18n/translator.js";
import { mergeAuthOptions } from "#questpie/server/integrated/auth/merge.js";

// ============================================================================
// module() — identity function for type inference
// ============================================================================

/**
 * Define a module as a plain data object.
 * Modules contribute collections, globals, jobs, functions, fields,
 * auth config, migrations, messages, etc.
 *
 * @example
 * ```ts
 * import { module, collection } from "questpie";
 *
 * export const myModule = () => module({
 *   name: "my-module",
 *   collections: { posts: postCollection },
 *   jobs: { sendNewsletter },
 *   messages: { en: { "my.key": "Hello" } },
 * });
 * ```
 *
 * @see RFC §13.1 (Module as Data Object)
 */
export function module<T extends ModuleDefinition>(definition: T): T {
	return definition;
}

// ============================================================================
// config() — identity function for type inference
// ============================================================================

/**
 * Define the application config — the shape of `questpie.config.ts`.
 * Composes modules with runtime settings (db, app url, adapters).
 *
 * @example
 * ```ts
 * import { config } from "questpie";
 * import { admin } from "@questpie/admin/server";
 *
 * export default config({
 *   modules: [admin({ branding: { name: "My App" } })],
 *   app: { url: process.env.APP_URL! },
 *   db: { url: process.env.DATABASE_URL! },
 *   email: { adapter: new ConsoleAdapter() },
 * });
 * ```
 *
 * @see RFC §12 (config() Full API)
 */
export function config<T extends AppConfig>(input: T): T {
	return input;
}

// ============================================================================
// Module resolution — depth-first, left-to-right
// ============================================================================

/**
 * Flatten modules depth-first per RFC §13.7.
 * Dependencies are resolved before the module that depends on them.
 * Duplicate modules (by name) are deduplicated — last occurrence wins.
 */
function resolveModules(modules: ModuleDefinition[]): ModuleDefinition[] {
	const flat: ModuleDefinition[] = [];
	for (const mod of modules) {
		if (mod.modules && mod.modules.length > 0) {
			flat.push(...resolveModules(mod.modules));
		}
		flat.push(mod);
	}
	// Deduplicate by name — keep last occurrence (later wins)
	const seen = new Map<string, number>();
	for (let i = 0; i < flat.length; i++) {
		seen.set(flat[i].name, i);
	}
	return flat.filter((_, i) => {
		const mod = flat[i];
		return seen.get(mod.name) === i;
	});
}

// ============================================================================
// Module merging
// ============================================================================

interface MergedState {
	collections: Record<string, any>;
	globals: Record<string, any>;
	jobs: Record<string, any>;
	functions: Record<string, any>;
	fields: Record<string, any>;
	auth: Record<string, any>;
	migrations: any[];
	seeds: any[];
	messages: Record<string, Record<string, string>>;
	defaultAccess: any;
	hooks: any;
	translations: any;
	// Admin extension keys (stored on Questpie instance as .state)
	[key: string]: any;
}

function emptyMergedState(): MergedState {
	return {
		collections: {},
		globals: {},
		jobs: {},
		functions: {},
		fields: {},
		auth: {},
		migrations: [],
		seeds: [],
		messages: {},
		defaultAccess: undefined,
		hooks: undefined,
		translations: undefined,
	};
}

function mergeMessages(
	a: Record<string, Record<string, string>>,
	b?: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
	if (!b) return a;
	const result: Record<string, Record<string, string>> = { ...a };
	for (const [locale, msgs] of Object.entries(b)) {
		result[locale] = { ...(result[locale] || {}), ...msgs };
	}
	return result;
}

function mergeGlobalHooks(a: any, b: any): any {
	if (!a && !b) return undefined;
	if (!a) return b;
	if (!b) return a;
	return {
		collections: [...(a.collections || []), ...(b.collections || [])],
		globals: [...(a.globals || []), ...(b.globals || [])],
	};
}

/** Known core keys on ModuleDefinition — everything else is an extension. */
const CORE_MODULE_KEYS = new Set([
	"name",
	"modules",
	"collections",
	"globals",
	"jobs",
	"functions",
	"fields",
	"auth",
	"migrations",
	"seeds",
	"messages",
	"defaultAccess",
	"hooks",
	"plugins",
]);

function mergeModuleIntoState(
	state: MergedState,
	mod: ModuleDefinition,
): MergedState {
	const result: MergedState = {
		...state,
		collections: { ...state.collections, ...(mod.collections || {}) },
		globals: { ...state.globals, ...(mod.globals || {}) },
		jobs: { ...state.jobs, ...(mod.jobs || {}) },
		functions: { ...state.functions, ...(mod.functions || {}) },
		fields: { ...state.fields, ...(mod.fields || {}) },
		auth: mergeAuthOptions(state.auth, mod.auth ?? {}),
		migrations: [...state.migrations, ...(mod.migrations || [])],
		seeds: [...state.seeds, ...(mod.seeds || [])],
		messages: mergeMessages(state.messages, mod.messages),
		defaultAccess: mod.defaultAccess ?? state.defaultAccess,
		hooks: mergeGlobalHooks(state.hooks, mod.hooks),
	};

	// Merge extension keys (admin: listViews, editViews, components, blocks, sidebar, dashboard, branding, adminLocale)
	for (const key of Object.keys(mod)) {
		if (!CORE_MODULE_KEYS.has(key)) {
			// Extension key — spread-merge objects, last-wins for primitives
			const existing = state[key];
			const incoming = mod[key];
			if (
				incoming != null &&
				typeof incoming === "object" &&
				!Array.isArray(incoming) &&
				typeof existing === "object" &&
				!Array.isArray(existing) &&
				existing != null
			) {
				result[key] = { ...existing, ...incoming };
			} else if (incoming !== undefined) {
				result[key] = incoming;
			}
		}
	}

	return result;
}

// ============================================================================
// createApp() — the main entry point
// ============================================================================

/**
 * Create a Questpie app instance from config + discovered entities.
 *
 * Resolves modules depth-first (RFC §13.7), merges contributions,
 * applies user entities on top, then creates the Questpie instance.
 *
 * @example
 * ```ts
 * // .generated/index.ts (or hand-written)
 * import { createApp } from "questpie";
 * import config from "../questpie.config";
 * import * as collections from "../collections";
 * import * as globals from "../globals";
 * import * as jobs from "../jobs";
 * import * as functions from "../functions";
 *
 * export const app = createApp(config, {
 *   collections,
 *   globals,
 *   jobs,
 *   functions,
 * });
 * export type App = typeof app;
 * ```
 *
 * @see RFC §15.1 (Complete .generated/index.ts Example)
 */
export function createApp(appConfig: AppConfig, entities?: AppEntities) {
	// 1. Resolve modules depth-first
	const flatModules = resolveModules(appConfig.modules ?? []);

	// 2. Merge all module contributions
	let merged = emptyMergedState();
	for (const mod of flatModules) {
		merged = mergeModuleIntoState(merged, mod);
	}

	// 3. Merge user entities on top (user always wins over modules)
	if (entities) {
		merged = mergeModuleIntoState(merged, {
			name: "user",
			collections: entities.collections,
			globals: entities.globals,
			jobs: entities.jobs,
			functions: entities.functions,
			auth: entities.auth,
			migrations: entities.migrations,
			seeds: entities.seeds,
			messages: entities.messages,
		});

		// Copy extension keys from entities (e.g. blocks from admin plugin)
		for (const key of Object.keys(entities)) {
			if (!CORE_MODULE_KEYS.has(key) && key !== "name" && key !== "modules") {
				const incoming = entities[key];
				const existing = merged[key];
				if (
					incoming != null &&
					typeof incoming === "object" &&
					!Array.isArray(incoming) &&
					typeof existing === "object" &&
					!Array.isArray(existing) &&
					existing != null
				) {
					merged[key] = { ...existing, ...incoming };
				} else if (incoming !== undefined) {
					merged[key] = incoming;
				}
			}
		}
	}

	// 4. Convert messages to translations config
	const mergedTranslations = mergeMessagesIntoConfig(
		merged.translations,
		merged.messages,
	);
	// Also merge with any config-level translations
	const finalTranslations = appConfig.translations
		? mergeTranslationsConfig(mergedTranslations, appConfig.translations)
		: mergedTranslations;

	// 5. Build QuestpieConfig
	const allJobs = merged.jobs;
	const hasJobs = Object.keys(allJobs).length > 0;

	const cmsConfig: QuestpieConfig = {
		app: appConfig.app,
		db: appConfig.db,
		secret: appConfig.secret,
		collections: merged.collections,
		globals: merged.globals,
		locale: appConfig.locale,
		auth: mergeAuthOptions(merged.auth, appConfig.auth ?? {}),
		storage: appConfig.storage,
		email: appConfig.email,
		queue:
			hasJobs && appConfig.queue
				? {
						jobs: allJobs,
						adapter: appConfig.queue.adapter,
					}
				: undefined,
		functions:
			Object.keys(merged.functions).length > 0 ? merged.functions : undefined,
		search: appConfig.search,
		realtime: appConfig.realtime,
		logger: appConfig.logger,
		kv: appConfig.kv,
		migrations: {
			migrations: [...merged.migrations, ...(appConfig.migrations || [])],
		},
		seeds: {
			seeds: [...merged.seeds, ...(appConfig.seeds || [])],
		},
		autoMigrate: appConfig.autoMigrate,
		autoSeed: appConfig.autoSeed,
		translations: finalTranslations,
		contextResolver: appConfig.contextResolver,
		globalHooks: mergeGlobalHooks(merged.hooks, appConfig.hooks),
		defaultAccess: appConfig.defaultAccess ?? merged.defaultAccess,
	};

	// 6. Create Questpie instance
	const instance = new Questpie(cmsConfig);

	// 7. Store admin-specific extension state for getAdminConfig
	// The admin module's patched .build() does the same — stores extension
	// keys on instance.state so the admin RPC functions can read them.
	const extensionState: Record<string, any> = {};
	const EXTENSION_KEYS = [
		"listViews",
		"editViews",
		"components",
		"blocks",
		"sidebar",
		"dashboard",
		"branding",
		"adminLocale",
	];
	for (const key of EXTENSION_KEYS) {
		const configValue = (appConfig as any)[key];
		const mergedValue = merged[key];
		if (configValue !== undefined || mergedValue !== undefined) {
			// Config-level overrides module-level
			extensionState[key] = configValue ?? mergedValue;
		}
	}
	if (Object.keys(extensionState).length > 0) {
		(instance as any).state = extensionState;
	}

	return instance;
}
