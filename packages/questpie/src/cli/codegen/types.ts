/**
 * Codegen Types
 *
 * Types for the file convention codegen system.
 * @see RFC §14 (Codegen Plugins), §2.4 (Discovery Rules)
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
}

// ============================================================================
// Codegen Plugin
// ============================================================================

/**
 * A codegen plugin can register additional directories to scan
 * and transform the codegen context before code is emitted.
 *
 * @see RFC §14.1 (Plugin Interface)
 */
export interface CodegenPlugin {
	/** Unique plugin name. */
	name: string;

	/**
	 * Register additional directories to scan.
	 * Key = state key (e.g. "blocks"), value = glob pattern(s) relative to questpie root.
	 */
	discover?: Record<string, string | string[]>;

	/**
	 * Called after all files are discovered, before code is generated.
	 * Can modify the context (add imports, type declarations, runtime code).
	 */
	transform?: (ctx: CodegenContext) => void;
}

// ============================================================================
// Codegen Context
// ============================================================================

/**
 * Context passed to codegen plugins.
 * Provides access to all discovered files and methods to modify generated output.
 *
 * @see RFC §14.1 (Plugin Interface)
 */
export interface CodegenContext {
	/** Discovered collections. */
	collections: Map<string, DiscoveredFile>;
	/** Discovered globals. */
	globals: Map<string, DiscoveredFile>;
	/** Discovered jobs. */
	jobs: Map<string, DiscoveredFile>;
	/** Discovered functions. */
	functions: Map<string, DiscoveredFile>;
	/** Discovered message locales. */
	messages: Map<string, DiscoveredFile>;
	/** Discovered auth file (at most one). */
	auth: DiscoveredFile | null;

	/** Plugin-discovered items keyed by stateKey from discover. */
	custom: Map<string, Map<string, DiscoveredFile>>;

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
	/** Absolute path to the questpie.config.ts file. */
	configPath: string;
	/** Absolute path to the output directory (e.g. rootDir/.generated). */
	outDir: string;
	/** Codegen plugins to run (from config modules). */
	plugins?: CodegenPlugin[];
	/** If true, don't write files — just return the generated code. */
	dryRun?: boolean;
}

/**
 * Result of running codegen.
 */
export interface CodegenResult {
	/** Generated file content. */
	code: string;
	/** Absolute path of the generated file. */
	outputPath: string;
	/** All discovered files keyed by category. */
	discovered: {
		collections: Map<string, DiscoveredFile>;
		globals: Map<string, DiscoveredFile>;
		jobs: Map<string, DiscoveredFile>;
		functions: Map<string, DiscoveredFile>;
		messages: Map<string, DiscoveredFile>;
		auth: DiscoveredFile | null;
		custom: Map<string, Map<string, DiscoveredFile>>;
	};
}
