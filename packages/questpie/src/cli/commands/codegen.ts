/**
 * Codegen CLI Commands
 *
 * `questpie generate` — one-shot codegen
 * `questpie dev` — watch mode, regenerate on file add/remove
 *
 * @see RFC §16 (CLI Commands), §16.1 (Watch Mode Granularity)
 */

import { watch } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { runCodegen } from "../codegen/index.js";
import type { CodegenPlugin } from "../codegen/types.js";
import { isPackageConfig, type PackageConfig } from "../config.js";

// ============================================================================
// generate command
// ============================================================================

export interface GenerateOptions {
	/** Path to questpie.config.ts (relative to cwd). */
	configPath: string;
	/** Dry run — show output without writing. */
	dryRun?: boolean;
	/** Verbose output. */
	verbose?: boolean;
}

/**
 * Resolve the entity root directory from a config file path.
 *
 * When `questpie.config.ts` lives at the project root and re-exports from
 * a deeper server directory, codegen must follow the re-export to find entities.
 *
 * Supports two patterns:
 *   1. `export { default } from "./src/questpie/server/questpie.config"` — re-export
 *   2. Direct config (config file IS the entity root) — current behavior
 *
 * @returns { configPath, rootDir } — resolved inner config path and entity root dir
 */
export async function resolveEntityRoot(
	configPath: string,
): Promise<{ configPath: string; rootDir: string }> {
	let content: string;
	try {
		content = await readFile(configPath, "utf-8");
	} catch {
		return { configPath, rootDir: dirname(configPath) };
	}

	// Detect re-export pattern: export { default } from "..."
	const reExportMatch = content.match(
		/^\s*export\s*\{\s*default\s*\}\s*from\s*["']([^"']+)["']/m,
	);
	if (!reExportMatch) {
		return { configPath, rootDir: dirname(configPath) };
	}

	// Resolve the inner config path
	const innerRaw = resolve(dirname(configPath), reExportMatch[1]);
	// Try with and without .ts extension
	for (const candidate of [innerRaw, `${innerRaw}.ts`, `${innerRaw}.mts`]) {
		try {
			await stat(candidate);
			return { configPath: candidate, rootDir: dirname(candidate) };
		} catch {
			// try next
		}
	}

	// Re-export target not found — fall back to config dir
	return { configPath, rootDir: dirname(configPath) };
}

/**
 * Result of loading a questpie.config.ts for codegen.
 */
interface ConfigLoadResult {
	plugins: CodegenPlugin[];
	/** When set, codegen runs in module mode (generates module.ts instead of index.ts). */
	module?: { name: string; outputFile?: string };
	/** When set, config is a PackageConfig — orchestrate multi-module codegen. */
	packageConfig?: PackageConfig;
}

/**
 * Load codegen config from questpie.config.ts.
 *
 * Supports three config shapes:
 * - **Root app config**: `runtimeConfig({ plugins: [...], ... })` → root app mode
 * - **Module config**: `{ module: { name: "..." }, plugins: [...] }` → module mode
 * - **Package config**: `packageConfig({ modulesDir: "...", ... })` → multi-module orchestration
 *
 * The `module` and `packageConfig` fields are only used for package-internal
 * codegen (dev-time only, not distributed). When `packageConfig` is detected,
 * the caller should iterate over module subdirectories.
 *
 * @param configPath — absolute path to the resolved questpie.config.ts
 */
async function loadConfigForCodegen(
	configPath: string,
): Promise<ConfigLoadResult> {
	try {
		const configModule = await import(/* @vite-ignore */ configPath);
		const config = configModule.default || configModule.config || configModule;

		// PackageConfig mode: iterate over modulesDir subdirectories
		if (isPackageConfig(config)) {
			return {
				plugins: Array.isArray(config.plugins) ? config.plugins : [],
				packageConfig: config,
			};
		}

		const plugins: CodegenPlugin[] =
			config && Array.isArray(config.plugins) ? config.plugins : [];

		// Module mode: config has { module: { name: "..." } }
		const moduleOpt =
			config?.module && typeof config.module.name === "string"
				? {
						name: config.module.name as string,
						outputFile: config.module.outputFile as string | undefined,
					}
				: undefined;

		return { plugins, module: moduleOpt };
	} catch (error) {
		// Config import failed (missing deps, syntax error, etc.)
		// Fall back gracefully — codegen can still run without config-defined plugins
		console.warn(
			`Warning: Could not load plugins from config (${configPath}).`,
		);
		if (error instanceof Error) {
			console.warn(`  ${error.message}`);
		}
		return { plugins: [] };
	}
}

/**
 * Run codegen once — produces .generated/index.ts (root app) or .generated/module.ts (module).
 *
 * Mode is determined by the config file:
 * - Root app: `runtimeConfig({ ... })` → generates index.ts + factories.ts
 * - Module: `{ module: { name: "..." } }` → generates module.ts only
 * - Package: `packageConfig({ modulesDir: "..." })` → iterates module subdirectories
 */
export async function generateCommand(options: GenerateOptions): Promise<void> {
	const rawConfigPath = resolve(process.cwd(), options.configPath);
	const { configPath, rootDir } = await resolveEntityRoot(rawConfigPath);

	// Load plugins + module/package config from questpie.config.ts
	const {
		plugins,
		module: moduleOpt,
		packageConfig: pkgConfig,
	} = await loadConfigForCodegen(configPath);

	// ── Package mode: iterate over modulesDir subdirectories ──
	if (pkgConfig) {
		await generatePackageModules(rootDir, configPath, pkgConfig, options);
		return;
	}

	// ── Single mode: root app or single module ──
	const outDir = join(rootDir, ".generated");
	const isModuleMode = !!moduleOpt;
	const outputFile = isModuleMode
		? (moduleOpt.outputFile ?? "module.ts")
		: "index.ts";

	console.log(
		isModuleMode
			? `Discovering files for module "${moduleOpt.name}"...`
			: "Discovering files...",
	);
	if (options.verbose) {
		console.log(`  Root: ${rootDir}`);
		console.log(`  Config: ${configPath}`);
		console.log(`  Output: ${outDir}/${outputFile}`);
		if (isModuleMode) console.log(`  Mode: module`);
	}

	const result = await runCodegen({
		rootDir,
		configPath,
		outDir,
		plugins,
		dryRun: options.dryRun,
		module: moduleOpt,
	});

	printCodegenResult(result, options);
}

/**
 * Orchestrate multi-module codegen for a PackageConfig.
 *
 * Scans `modulesDir` for subdirectories, derives module names from
 * `${modulePrefix}-${dirName}`, and runs `runCodegen()` in module mode
 * for each one.
 */
async function generatePackageModules(
	configRootDir: string,
	configPath: string,
	pkgConfig: PackageConfig,
	options: GenerateOptions,
): Promise<void> {
	const modulesDir = resolve(configRootDir, pkgConfig.modulesDir);

	// Scan modulesDir for subdirectories
	let entries: import("node:fs").Dirent[];
	try {
		entries = await readdir(modulesDir, { withFileTypes: true });
	} catch {
		console.error(
			`Package modulesDir not found: ${modulesDir}\n` +
				`Check the 'modulesDir' path in your packageConfig().`,
		);
		return;
	}

	const moduleDirs = entries
		.filter((e) => e.isDirectory() && !e.name.startsWith("."))
		.sort((a, b) => a.name.localeCompare(b.name));

	if (moduleDirs.length === 0) {
		console.log(`No module directories found in ${modulesDir}`);
		return;
	}

	const prefix = pkgConfig.modulePrefix ?? "questpie";
	const plugins = Array.isArray(pkgConfig.plugins) ? pkgConfig.plugins : [];

	// Build import rewrite map from package.json
	// When plugin transforms add imports like "@questpie/admin/server", they
	// must be rewritten to the internal subpath alias (e.g. "#questpie/admin/server/index.js")
	// because TypeScript resolves the "types" export condition to stale dist/ types.
	const importRewriteMap = await buildImportRewriteMap(configRootDir);

	console.log(
		`Package mode: generating ${moduleDirs.length} module(s) from ${pkgConfig.modulesDir}/`,
	);

	for (const dir of moduleDirs) {
		const moduleRootDir = join(modulesDir, dir.name);
		const moduleOutDir = join(moduleRootDir, ".generated");
		const moduleName = `${prefix}-${dir.name}`;

		console.log(`\n  Module: ${moduleName}`);
		if (options.verbose) {
			console.log(`    Root: ${moduleRootDir}`);
			console.log(`    Output: ${moduleOutDir}/module.ts`);
		}

		const result = await runCodegen({
			rootDir: moduleRootDir,
			configPath,
			outDir: moduleOutDir,
			plugins,
			dryRun: options.dryRun,
			module: { name: moduleName, importRewriteMap },
		});

		printCodegenResult(result, options, "    ");
	}

	console.log(`\nDone: ${moduleDirs.length} module(s) generated.`);
}

/**
 * Build an import rewrite map for self-package imports.
 *
 * Reads `package.json` to find the package name and `tsconfig.json` to find
 * the internal subpath alias. Maps the external package name to the internal
 * alias so generated modules don't reference stale dist/ types.
 *
 * @example
 * package.json: { "name": "@questpie/admin" }
 * tsconfig.json: { "paths": { "#questpie/admin/*": ["./src/*"] } }
 * → { "@questpie/admin": "#questpie/admin" }
 */
async function buildImportRewriteMap(
	packageDir: string,
): Promise<Record<string, string> | undefined> {
	try {
		const pkgJsonPath = join(packageDir, "package.json");
		const pkgJsonContent = await readFile(pkgJsonPath, "utf-8");
		const pkgJson = JSON.parse(pkgJsonContent);
		const pkgName = pkgJson.name;
		if (!pkgName) return undefined;

		// Try to find matching tsconfig paths alias
		const tsconfigPath = join(packageDir, "tsconfig.json");
		let tsconfigContent: string;
		try {
			tsconfigContent = await readFile(tsconfigPath, "utf-8");
		} catch {
			return undefined;
		}

		// Parse tsconfig (strip JSON comments — single-line and block)
		// The regex avoids stripping // inside string values (e.g. URLs)
		const stripped = tsconfigContent.replace(
			/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
			(match, stringLiteral) => stringLiteral ?? "",
		);
		const tsconfig = JSON.parse(stripped);
		const paths = tsconfig?.compilerOptions?.paths;
		if (!paths || typeof paths !== "object") return undefined;

		// Look for a path alias that maps to the package source
		// e.g. "#questpie/admin/*" → ["./src/*"]
		for (const alias of Object.keys(paths)) {
			// Strip trailing /* from alias to get the prefix
			const aliasPrefix = alias.replace(/\/\*$/, "");
			// Check if this alias could be a rewrite target for the package name
			// Convention: "#<scope>/<name>/*" for "@<scope>/<name>"
			// or "#<name>/*" for "<name>"
			if (
				aliasPrefix.startsWith("#") &&
				(pkgName.replace("@", "#") === aliasPrefix ||
					pkgName.replace("@", "") ===
						aliasPrefix.replace("#", "").replace("/", "-"))
			) {
				return { [pkgName]: aliasPrefix };
			}
		}

		return undefined;
	} catch {
		return undefined;
	}
}

/**
 * Print codegen result summary.
 */
function printCodegenResult(
	result: import("../codegen/types.js").CodegenResult,
	options: GenerateOptions,
	indent = "",
): void {
	const d = result.discovered;
	const counts: string[] = [];
	for (const [catName, fileMap] of d.categories) {
		if (fileMap.size > 0) counts.push(`${fileMap.size} ${catName}`);
	}
	if (d.auth) counts.push("auth");

	if (counts.length === 0) {
		console.log(
			`${indent}No entity files found. Make sure your files are in the correct directories.`,
		);
		return;
	}

	console.log(`${indent}Found: ${counts.join(", ")}`);

	if (options.dryRun) {
		console.log(`\n${indent}--- Generated code (dry run) ---\n`);
		console.log(result.code);
	} else {
		console.log(`${indent}Generated: ${result.outputPath}`);
	}

	if (options.verbose) {
		printDiscovered(d);
	}
}

// ============================================================================
// dev (watch) command
// ============================================================================

export interface DevOptions {
	/** Path to questpie.config.ts (relative to cwd). */
	configPath: string;
	/** Verbose output. */
	verbose?: boolean;
}

/**
 * Watch mode — regenerate .generated/index.ts on file add/remove.
 *
 * Per RFC §16.1:
 * - File added/removed → regenerate
 * - File content modified → NO regeneration (typeof import is stable)
 * - Config modified → full regeneration
 *
 * @see RFC §16.1 (Watch Mode Granularity)
 */
export async function devCommand(options: DevOptions): Promise<void> {
	// Run initial generation
	await generateCommand({
		configPath: options.configPath,
		verbose: options.verbose,
	});

	const rawConfigPath = resolve(process.cwd(), options.configPath);
	const { configPath, rootDir } = await resolveEntityRoot(rawConfigPath);
	const {
		plugins,
		module: moduleOpt,
		packageConfig: pkgConfig,
	} = await loadConfigForCodegen(configPath);

	// For package mode, we watch the entire modulesDir and regenerate all modules
	// when any file changes. This is simpler and handles cross-module changes.
	if (pkgConfig) {
		await watchPackageModules(rootDir, configPath, pkgConfig, options);
		return;
	}

	const outDir = join(rootDir, ".generated");

	// Directories to watch for file add/remove
	// Start with core directories, then add plugin-discovered directory patterns
	const watchDirs = new Set([
		"collections",
		"globals",
		"jobs",
		"functions",
		"messages",
		"migrations",
		"seeds",
		"features",
	]);

	// Add directories from plugin discover patterns (e.g. "blocks/*.ts" → "blocks")
	for (const plugin of plugins) {
		if (!plugin.discover) continue;
		for (const pattern of Object.values(plugin.discover)) {
			const patternStr =
				typeof pattern === "string" ? pattern : pattern.pattern;
			// Extract directory name from glob (e.g. "blocks/*.ts" → "blocks")
			const dirMatch = patternStr.match(/^([^/*]+)\//);
			if (dirMatch) {
				watchDirs.add(dirMatch[1]);
			}
		}
	}

	console.log("\nWatching for file changes...");
	console.log("  (Press Ctrl+C to stop)\n");

	// Track file sets per directory to detect add/remove
	const fileSets = new Map<string, Set<string>>();

	// Initialize file sets
	for (const dir of watchDirs) {
		const dirPath = join(rootDir, dir);
		const files = await listFilesRecursive(dirPath);
		fileSets.set(dir, new Set(files));
	}

	// Debounce timer
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const scheduleRegenerate = (reason: string) => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			console.log(`Regenerating... (${reason})`);
			try {
				const result = await runCodegen({
					rootDir,
					configPath,
					outDir,
					plugins,
					module: moduleOpt,
				});
				console.log(`Updated: ${result.outputPath}`);
			} catch (error) {
				console.error("Codegen error:", error);
			}
		}, 100);
	};

	// Watch config file for any change
	const configWatcher = watch(configPath, () => {
		scheduleRegenerate("config changed");
	});

	// Watch entity directories for file add/remove
	const watchers: ReturnType<typeof watch>[] = [configWatcher];

	for (const dir of watchDirs) {
		const dirPath = join(rootDir, dir);
		try {
			await stat(dirPath);
		} catch {
			continue; // Directory doesn't exist, skip
		}

		const watcher = watch(
			dirPath,
			{ recursive: true },
			async (_event, filename) => {
				if (!filename) return;
				// Ignore .generated directory and non-TS files
				if (filename.includes(".generated")) return;
				if (!/\.(ts|tsx|mts)$/.test(filename)) return;

				// Check if file set changed (add/remove)
				const currentFiles = await listFilesRecursive(dirPath);
				const currentSet = new Set(currentFiles);
				const previousSet = fileSets.get(dir) || new Set();

				const added = [...currentSet].filter((f) => !previousSet.has(f));
				const removed = [...previousSet].filter((f) => !currentSet.has(f));

				if (added.length > 0 || removed.length > 0) {
					fileSets.set(dir, currentSet);
					const changes: string[] = [];
					for (const f of added) changes.push(`+ ${f}`);
					for (const f of removed) changes.push(`- ${f}`);
					scheduleRegenerate(changes.join(", "));
				}
				// Content-only changes → skip (typeof import is stable)
			},
		);

		watchers.push(watcher);
	}

	// Keep process alive
	process.on("SIGINT", () => {
		for (const w of watchers) w.close();
		console.log("\nStopped watching.");
		process.exit(0);
	});

	// Prevent Node from exiting
	await new Promise(() => {});
}

/**
 * Watch mode for PackageConfig — watches the modulesDir and regenerates
 * all module definitions on file add/remove.
 */
async function watchPackageModules(
	configRootDir: string,
	configPath: string,
	pkgConfig: PackageConfig,
	options: DevOptions,
): Promise<void> {
	const modulesDir = resolve(configRootDir, pkgConfig.modulesDir);
	const prefix = pkgConfig.modulePrefix ?? "questpie";
	const plugins = Array.isArray(pkgConfig.plugins) ? pkgConfig.plugins : [];

	console.log(`\nWatching ${pkgConfig.modulesDir}/ for file changes...`);
	console.log("  (Press Ctrl+C to stop)\n");

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	const scheduleRegenerate = (reason: string) => {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			console.log(`Regenerating all modules... (${reason})`);
			try {
				await generatePackageModules(configRootDir, configPath, pkgConfig, {
					configPath: options.configPath,
					verbose: options.verbose,
				});
			} catch (error) {
				console.error("Codegen error:", error);
			}
		}, 100);
	};

	// Watch config file
	const configWatcher = watch(configPath, () => {
		scheduleRegenerate("config changed");
	});

	// Watch entire modulesDir recursively
	const modulesWatcher = watch(
		modulesDir,
		{ recursive: true },
		async (_event, filename) => {
			if (!filename) return;
			if (filename.includes(".generated")) return;
			if (!/\.(ts|tsx|mts)$/.test(filename)) return;
			scheduleRegenerate(filename);
		},
	);

	process.on("SIGINT", () => {
		configWatcher.close();
		modulesWatcher.close();
		console.log("\nStopped watching.");
		process.exit(0);
	});

	await new Promise(() => {});
}

// ============================================================================
// Helpers
// ============================================================================

function printDiscovered(
	d: import("../codegen/types.js").DiscoveryResult,
): void {
	const printMap = (label: string, map: Map<string, any>) => {
		if (map.size === 0) return;
		console.log(`\n  ${label}:`);
		for (const [key, file] of map) {
			console.log(`    ${key} <- ${file.source}`);
		}
	};

	for (const [catName, fileMap] of d.categories) {
		const label = catName.charAt(0).toUpperCase() + catName.slice(1);
		printMap(label, fileMap);
	}
	if (d.auth) {
		console.log(`\n  Auth:`);
		console.log(`    ${d.auth.source}`);
	}
	for (const [key, file] of d.singles) {
		console.log(`\n  ${key}: ${file.source}`);
	}
}

/**
 * List all .ts files in a directory recursively.
 */
async function listFilesRecursive(dir: string): Promise<string[]> {
	const results: string[] = [];
	try {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				results.push(...(await listFilesRecursive(fullPath)));
			} else if (/\.(ts|tsx|mts)$/.test(entry.name)) {
				results.push(fullPath);
			}
		}
	} catch {
		// Directory doesn't exist
	}
	return results;
}
