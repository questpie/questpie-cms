/**
 * Codegen Types
 *
 * Types for the file convention codegen system.
 * @see RFC-MODULE-ARCHITECTURE §4 (Plugin Resolution Patterns)
 */

// ============================================================================
// Discovered File
// ============================================================================

/**
 * A file discovered during codegen scanning.
 */
export interface DiscoveredFile {
	/** Absolute file path. */
	absolutePath: string;
	/** Derived key (e.g. "sendNewsletter", "siteSettings"). */
	key: string;
	/** Import path relative to the .generated directory (e.g. "../collections/posts"). */
	importPath: string;
	/** Safe variable name for the generated import statement. */
	varName: string;
	/** Source glob pattern that matched (e.g. "collections/*.ts"). */
	source: string;
	/**
	 * Export type detected in the file.
	 * - "default" — `export default ...`
	 * - "named" — only named exports found (e.g. `export const X = ...`)
	 * - "unknown" — could not determine (file read failed)
	 */
	exportType: "default" | "named" | "unknown";
	/** Name of the first named export found (when exportType is "named"). */
	namedExportName?: string;
	/**
	 * All named exports found in the file.
	 * Populated when resolve is "named" or "all".
	 */
	allNamedExports?: string[];
	/**
	 * When true, the file exports an object bundle (e.g. `export const fns = { fn1, fn2 }`).
	 *
	 * In module mode, categories with `emit: "nested"` spread bundle files
	 * into the parent object (`...varName`) instead of assigning them as leaves.
	 *
	 * Detection: `export const X = {` (object literal value, not a function call).
	 * This allows function files to contain multiple `fn()` definitions plus
	 * a bundle export that aggregates them.
	 */
	isBundle?: boolean;
}

// ============================================================================
// Discover Pattern
// ============================================================================

/**
 * Pattern definition for plugin file discovery.
 *
 * When a string:
 * - If it contains `*` or is a directory pattern (`"blocks/*.ts"`): treated as
 *   directory pattern with `resolve: "auto"`, `keyFrom: "filename"`, `cardinality: "map"`
 * - If it's a single file (`"sidebar.ts"`): treated as single-file pattern with
 *   `resolve: "auto"`, `keyFrom: "filename"`, `cardinality: "single"`
 *
 * @see RFC-MODULE-ARCHITECTURE §4.6 (Plugin Discover API)
 */
export type DiscoverPattern =
	| string
	| {
			/** Glob pattern relative to questpie root. */
			pattern: string;
			/**
			 * How to resolve exports from discovered files.
			 * - "auto" (default): detect from file content — use default import if file
			 *   has default export, named imports otherwise
			 * - "default": always use default import
			 * - "named": always use named imports (all exports)
			 * - "all": collect all exports (both default and named)
			 */
			resolve?: "default" | "named" | "all" | "auto";
			/**
			 * How to derive the key for each discovered entity.
			 * - "filename" (default for directory patterns): derive key from file name (camelCase)
			 * - "exportName" (default for named exports): derive key from the export identifier
			 */
			keyFrom?: "filename" | "exportName";
			/**
			 * Whether this pattern produces a single value or a map of values.
			 * - "map" (default for directory patterns): creates a Record<string, Entity>
			 * - "single" (default for single-file patterns): creates a single value
			 */
			cardinality?: "single" | "map";
			/**
			 * How to merge multiple matching files for `cardinality: "single"` patterns.
			 *
			 * - "replace" (default): only the root-level file wins.
			 * - "spread": collect ALL matching files (root + `features/*\/pattern`)
			 *   and spread them as an array in the generated `createApp()` call.
			 *
			 * Use "spread" for array-shaped singletons (sidebar entries, dashboard widgets)
			 * so every feature module can contribute without a central file importing all.
			 *
			 * @example
			 * ```ts
			 * // admin plugin — collects sidebar.ts from root + every feature:
			 * discover: { sidebar: { pattern: "sidebar.ts", mergeStrategy: "spread" } }
			 * // Generated:
			 * // sidebar: [..._sidebar_root, ..._sidebar_admin, ..._sidebar_audit],
			 * ```
			 */
			mergeStrategy?: "spread";
	  };

// ============================================================================
// Category Declaration
// ============================================================================

/**
 * Declares a directory-pattern category for file discovery and code generation.
 *
 * Categories are the primary unit of the plugin system. Each category
 * (collections, globals, jobs, functions, blocks, views, etc.) is declared
 * by a plugin via `categories` on `CodegenPlugin`.
 *
 * The core plugin declares all built-in categories (collections, globals, etc.).
 * Other plugins (admin, audit) declare their own (blocks, views, components).
 *
 * Category metadata drives both discovery (what files to scan) and emission
 * (how to generate imports, types, and runtime code).
 *
 * @see RFC-PLUGIN-SYSTEM.md
 */
export interface CategoryDeclaration {
	/**
	 * Directories to scan relative to the questpie root.
	 * e.g., `["collections"]` scans `collections/` and `features/{name}/collections/`
	 */
	dirs: string[];

	/** Whether to scan directories recursively (e.g., functions, routes). */
	recursive?: boolean;

	/** Variable name prefix for generated imports (e.g., "coll", "fn", "bloc"). */
	prefix: string;

	// ── Emission metadata ─────────────────────────────────────

	/**
	 * How to emit this category in the `createApp()` call.
	 * - "record" (default): `{ key: varName, ... }` — standard record emission
	 * - "nested": nested object from dot-separated keys (functions)
	 * - "array": flat array `[var1, var2, ...]` (migrations, seeds)
	 *
	 * @default "record"
	 */
	emit?: "record" | "nested" | "array";

	/**
	 * Key separator for recursive categories.
	 * - "." — dot-separated keys (functions: `admin.stats`)
	 * - "/" — slash-separated keys (routes: `webhooks/stripe`)
	 *
	 * Only meaningful when `recursive: true`.
	 */
	keySeparator?: "." | "/";

	/**
	 * Override the key used in `createApp()` call.
	 * By default, the category name (discover key) is used.
	 * e.g., `emails` discovers from `emails/` but emits as `emailTemplates` in createApp.
	 */
	createAppKey?: string;

	/**
	 * Extra type import statements to add when this category has files.
	 * Each string is a complete import statement.
	 *
	 * @example
	 * ```ts
	 * extraTypeImports: ['import type { ServiceInstanceOf } from "questpie";']
	 * ```
	 */
	extraTypeImports?: string[];

	/**
	 * How to generate the `App*` type for this category.
	 *
	 * - "standard" (default): `export type AppX = _ModuleX & { key: typeof varName; ... };`
	 * - "services": like standard but values are `ServiceInstanceOf<typeof varName>`
	 * - "emails": standalone record (no module merge), values are `typeof varName`
	 * - "messages": union type of keys from all files (`AppMessageKeys`)
	 * - "functions": nested type object from dot-separated keys
	 * - "none": no type emitted (migrations, seeds)
	 *
	 * @default "standard"
	 */
	typeEmit?:
		| "standard"
		| "services"
		| "emails"
		| "messages"
		| "functions"
		| "none";

	/**
	 * Whether to extract types from modules for this category.
	 * When true, generates `type _ModuleX = _MP<"x">` and uses it
	 * as the base type for `AppX`.
	 *
	 * @default true
	 */
	extractFromModules?: boolean;

	/**
	 * Whether to include this category in the `Registry` augmentation.
	 * When a string, uses that as the registry key name.
	 * When `true`, uses the category name.
	 * When `false` or undefined, not included.
	 *
	 * @default true for standard categories
	 */
	registryKey?: string | boolean;

	/**
	 * Whether to include this category in the `_AppInternal` state type.
	 * When `true`, adds `categoryName: AppCategoryName;` to the state.
	 * When `false`, omitted.
	 *
	 * @default true for standard categories
	 */
	includeInAppState?: boolean;

	/**
	 * Custom property emission for `AppContext` augmentation.
	 * When set, emits this line in the `AppContext` interface instead of nothing.
	 * Supports `$VAR` placeholder for the variable name.
	 *
	 * @example
	 * ```ts
	 * // services: emit each service as a flat property on AppContext
	 * appContextProperties: "services"
	 * ```
	 */
	appContextEmit?: "services";
}

// ============================================================================
// Codegen Plugin
// ============================================================================

/**
 * A codegen plugin can register additional file patterns to discover
 * and transform the codegen context before code is emitted.
 *
 * Plugins are registered in `questpie.config.ts` via the `plugins` array
 * in `runtimeConfig()`.
 *
 * @example
 * ```ts
 * export function adminPlugin(): CodegenPlugin {
 *   return {
 *     name: "questpie-admin",
 *     discover: {
 *       blocks: "blocks/*.ts",
 *       sidebar: { pattern: "sidebar.ts", mergeStrategy: "spread" },
 *       dashboard: { pattern: "dashboard.ts", mergeStrategy: "spread" },
 *       branding: "branding.ts",
 *       adminLocale: "admin-locale.ts",
 *     },
 *   };
 * }
 * ```
 *
 * @see RFC-MODULE-ARCHITECTURE §4.6 (Plugin Discover API)
 */
export interface CodegenPlugin {
	/** Unique plugin name. */
	name: string;

	/**
	 * Declare directory-pattern categories for file discovery.
	 * Key = category name (e.g. "collections", "blocks"), value = category metadata.
	 *
	 * Categories drive the full pipeline: file scanning, import generation,
	 * type emission, and runtime code in createApp().
	 *
	 * The core plugin declares built-in categories (collections, globals, etc.).
	 * Other plugins declare their own (blocks, views, components).
	 */
	categories?: Record<string, CategoryDeclaration>;

	/**
	 * Register file patterns to discover.
	 * Key = state key (e.g. "blocks"), value = pattern definition.
	 *
	 * Supports both string shorthand and full DiscoverPattern objects.
	 *
	 * Use `categories` for directory-pattern categories that need full
	 * type/emission control. Use `discover` for simpler patterns like
	 * single files or directory patterns that follow the default behavior.
	 */
	discover?: Record<string, DiscoverPattern>;

	/**
	 * Called after all files are discovered, before code is generated.
	 * Can modify the context (add imports, type declarations, runtime code).
	 */
	transform?: (ctx: CodegenContext) => void;

	/**
	 * Registry declarations for codegen-generated typed factories.
	 * Each entry describes an extension method that should appear on
	 * collection(), global(), or block() factories.
	 *
	 * Codegen reads these registries and generates typed wrapper methods
	 * that call `builder.set(stateKey, value)` under the hood. No monkey-patching.
	 *
	 * @see RFC-CONTEXT-FIRST §6.4 (Third-Party Plugin Extensions)
	 *
	 * @example
	 * ```ts
	 * registries: {
	 *   collectionExtensions: {
	 *     admin: {
	 *       stateKey: "admin",
	 *       imports: [{ name: "AdminCollectionConfig", from: "@questpie/admin/server" }],
	 *     },
	 *     list: {
	 *       stateKey: "adminList",
	 *       imports: [{ name: "ListViewConfig", from: "@questpie/admin/server" }],
	 *     },
	 *   },
	 * }
	 * ```
	 */
	registries?: {
		/** Extension methods for collection() factory. */
		collectionExtensions?: Record<string, RegistryExtension>;
		/** Extension methods for global() factory. */
		globalExtensions?: Record<string, RegistryExtension>;
		/** Singleton factory functions (branding, sidebar, locale, etc.). */
		singletonFactories?: Record<string, SingletonFactory>;
		/** Module-level type registries that modules can contribute to (e.g., listViews, editViews, components). */
		moduleRegistries?: Record<string, ModuleRegistryConfig>;
	};

	/**
	 * Callback parameter definitions for extension methods.
	 *
	 * Replaces the hardcoded `f/v/c/a` switch in `emitCallbackContext()` with
	 * plugin-contributed inline proxy factory code.
	 *
	 * When an extension's `callbackContextParams` lists `["v", "f"]`, codegen
	 * looks up each key in the merged callback params from all plugins and
	 * emits the corresponding `proxyCode` inline.
	 *
	 * @example
	 * ```ts
	 * callbackParams: {
	 *   f: {
	 *     proxyCode: "new Proxy({}, { get: (_, prop) => String(prop) })",
	 *   },
	 *   c: {
	 *     proxyCode: 'new Proxy({}, { get: (_, prop) => (...args) => ({ type: String(prop), props: typeof args[0] === "string" ? { name: args[0] } : args[0] ?? {} }) })',
	 *   },
	 * }
	 * ```
	 */
	callbackParams?: Record<string, CallbackParamDefinition>;
}

/**
 * Defines how to emit a callback context parameter at codegen time.
 * Used by `emitCallbackContext()` to generate runtime proxy objects.
 */
export interface CallbackParamDefinition {
	/**
	 * Inline JavaScript expression that creates the runtime proxy for this param.
	 * This code is emitted directly into the generated factories.ts file.
	 *
	 * @example
	 * ```ts
	 * // Field ref proxy: f.title → "title"
	 * proxyCode: "new Proxy({}, { get: (_, prop) => String(prop) })"
	 * ```
	 */
	proxyCode: string;
}

/**
 * Extension method declaration for codegen-generated factories.
 * Describes how to generate a typed wrapper method on collection()/global()/block().
 */
export interface RegistryExtension {
	/** State key stored on the builder via .set(). */
	stateKey: string;

	/**
	 * Import declarations needed for this extension's types.
	 * These will be added to the generated factories file.
	 */
	imports?: Array<{ name: string; from: string }>;

	/**
	 * TypeScript type signature for the config parameter.
	 * If not provided, the extension accepts `any`.
	 */
	configType?: string;

	/**
	 * Whether the config is a callback function receiving a context object.
	 * If true, codegen generates proxy helpers (field ref, view proxy, etc.).
	 */
	isCallback?: boolean;

	/**
	 * Context parameter names for callback-style extensions.
	 * e.g. ["v", "f", "a"] for list(), ["f"] for form().
	 */
	callbackContextParams?: string[];

	/**
	 * Placeholder → category mapping for module-driven type extraction.
	 * Codegen replaces placeholders in configType with type aliases
	 * extracted from the module tree.
	 *
	 * @example
	 * ```ts
	 * configType: "AdminCollectionConfig | ((ctx: AdminConfigContext<$COMPONENT_NAMES>) => ...)",
	 * configTypePlaceholders: { "$COMPONENT_NAMES": "components" },
	 * ```
	 */
	configTypePlaceholders?: Record<string, string>;
}

// ============================================================================
// Singleton Factory
// ============================================================================

/**
 * Declaration for a singleton factory function generated in factories.ts.
 * Singleton factories provide typed identity wrappers for config files
 * like branding.ts, sidebar.ts, locale.ts, etc.
 *
 * @example
 * ```ts
 * // Generated: export function branding<T extends ServerBrandingConfig>(config: T): T { return config; }
 * // Usage:     export default branding({ name: "My App" });
 * ```
 */
/**
 * Module registry — describes a typed record that modules can contribute to.
 * Codegen extracts keys from all modules and makes them available as type names.
 *
 * @example
 * ```ts
 * // Admin plugin declares:
 * moduleRegistries: {
 *   listViews: {
 *     placeholder: "$LIST_VIEW_NAMES",
 *     registryKey: "listViews",
 *   },
 * }
 * // → factory-template generates: type _ListViewNames = _ExtractKeys<"listViews"> | (string & {});
 * // → Registry gets: interface Registry { listViews: Record<_ListViewNames, unknown>; }
 * ```
 */
export interface ModuleRegistryConfig {
	/** Placeholder token used in configType strings (e.g., "$LIST_VIEW_NAMES") — resolves to string union of keys. */
	placeholder?: string;
	/**
	 * Placeholder token that resolves to the **full merged record** from all modules,
	 * not just a string union of keys. Used when the consumer needs the actual
	 * definitions (e.g., to extract per-item config types).
	 *
	 * @example
	 * ```ts
	 * recordPlaceholder: "$LIST_VIEWS"
	 * // → resolves to `_ListViewsRecord` in configType strings
	 * // → type _ListViewsRecord = _ExtractRegistry<"listViews">;
	 * // → { table: ViewDefinition<"table","list",ListViewConfig>, ... }
	 * ```
	 */
	recordPlaceholder?: string;
	/** If set, add extracted names to this Registry key for autocomplete */
	registryKey?: string;
	/**
	 * If set, codegen generates a `declare module` augmentation that extends
	 * the specified interface with the extracted strict name keys.
	 *
	 * This enables plugin-extensible discriminant types like `ComponentType`
	 * that narrow to exact literals when modules are loaded but fall back
	 * to `string` when the registry is empty.
	 *
	 * @example
	 * ```ts
	 * typeRegistry: {
	 *   module: "@questpie/admin/server",
	 *   interface: "ComponentTypeRegistry",
	 * }
	 * // → generates:
	 * // declare module "@questpie/admin/server" {
	 * //   interface ComponentTypeRegistry extends Record<_ComponentsNames_Strict, {}> {}
	 * // }
	 * ```
	 */
	typeRegistry?: {
		/** Module specifier for the `declare module` block (e.g., "questpie", "@questpie/admin/server"). */
		module: string;
		/** Interface name to augment (e.g., "FieldTypeRegistry", "ComponentTypeRegistry"). */
		interface: string;
	};
}

export interface SingletonFactory {
	/** TypeScript type for the config parameter. */
	configType: string;
	/** Import declarations needed for the config type. */
	imports: Array<{ name: string; from: string }>;
	/**
	 * Whether the config can also be a callback function.
	 * If true, generates overloaded identity that accepts both
	 * plain config and callback form.
	 */
	isCallback?: boolean;
}

// ============================================================================
// Codegen Context
// ============================================================================

/**
 * Context passed to codegen plugins.
 * Provides access to all discovered files and methods to modify generated output.
 */
export interface CodegenContext {
	/**
	 * All discovered categories (collections, globals, blocks, etc.).
	 * Key = category name, value = map of discovered files.
	 */
	categories: Map<string, Map<string, DiscoveredFile>>;

	/** Discovered auth file (at most one). */
	auth: DiscoveredFile | null;

	/** Discovered single-file items keyed by stateKey. */
	singles: Map<string, DiscoveredFile>;

	/**
	 * Discovered spread items keyed by stateKey.
	 * Each entry is an ordered list: root file first, then feature files.
	 */
	spreads: Map<string, DiscoveredFile[]>;

	/** Add an import statement to the generated file. */
	addImport(name: string, path: string): void;
	/** Add a type declaration to the generated file. */
	addTypeDeclaration(code: string): void;
	/** Add runtime code to the generated file. */
	addRuntimeCode(code: string): void;
	/** Set a key on the entities passed to createApp(). */
	set(key: string, value: string): void;
}

// ============================================================================
// Codegen Options
// ============================================================================

/**
 * Options for running codegen.
 */
export interface CodegenOptions {
	/** Absolute path to the questpie root (directory containing questpie.config.ts). */
	rootDir: string;
	/** Absolute path to the questpie.config.ts file (required for root app mode). */
	configPath: string;
	/** Absolute path to the output directory (e.g. rootDir/.generated). */
	outDir: string;
	/** Codegen plugins to run (from config modules). */
	plugins?: CodegenPlugin[];
	/** If true, don't write files — just return the generated code. */
	dryRun?: boolean;

	/**
	 * Module codegen mode.
	 * When set, generates a `module.ts` file (static module definition)
	 * instead of an `index.ts` file (root app with createApp).
	 *
	 * @see RFC-MODULE-ARCHITECTURE §9.2 (Module — .generated/module.ts)
	 */
	module?: {
		/** Module name (e.g. "questpie-admin", "questpie-audit"). */
		name: string;
		/** Output filename. @default "module.ts" */
		outputFile?: string;
		/**
		 * Self-package import rewriting for module-within-package codegen.
		 *
		 * When a plugin's transform() adds imports referencing the same package
		 * (e.g. `@questpie/admin/server` inside the `@questpie/admin` package),
		 * TypeScript resolves the `"types"` export condition to stale `dist/` types.
		 *
		 * This map rewrites external package specifiers to internal aliases that
		 * resolve to source files via tsconfig paths.
		 *
		 * @example { "@questpie/admin": "#questpie/admin" }
		 * → `@questpie/admin/server` becomes `#questpie/admin/server/index.js`
		 */
		importRewriteMap?: Record<string, string>;
	};
}

/**
 * Result of running codegen.
 */
export interface CodegenResult {
	/** Generated file content. */
	code: string;
	/** Absolute path of the generated file. */
	outputPath: string;
	/** All discovered files. */
	discovered: DiscoveryResult;
}

// ============================================================================
// Discovery Result
// ============================================================================

/**
 * Unified result of file discovery.
 *
 * All directory-pattern categories (collections, globals, blocks, etc.) are
 * stored in the generic `categories` map. Singles and spreads come from
 * plugin `discover` patterns.
 *
 * The `auth` field is a special single-file pattern that predates the plugin
 * system and is kept for backward compatibility.
 */
export interface DiscoveryResult {
	/**
	 * All directory-pattern categories.
	 * Key = category name (e.g., "collections", "blocks"), value = map of discovered files.
	 * Ordered: core categories first (in declaration order), then plugin categories.
	 */
	categories: Map<string, Map<string, DiscoveredFile>>;

	/** Discovered auth file (at most one). */
	auth: DiscoveredFile | null;

	/** Single-file items keyed by stateKey (locale, hooks, branding, etc.). */
	singles: Map<string, DiscoveredFile>;

	/**
	 * Spread items keyed by stateKey (sidebar, dashboard, etc.).
	 * Each entry is an ordered list: root file first, then feature files alphabetically.
	 */
	spreads: Map<string, DiscoveredFile[]>;
}
