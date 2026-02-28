/**
 * Codegen Orchestrator
 *
 * Main entry point for running codegen. Coordinates:
 * 1. File discovery
 * 2. Plugin execution
 * 3. Template generation (root app or module)
 * 4. File writing
 *
 * @see RFC-MODULE-ARCHITECTURE §9 (Generated Code)
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { discoverFiles } from "./discover.js";
import { generateFactoryTemplate } from "./factory-template.js";
import { generateModuleTemplate } from "./module-template.js";
import { generateTemplate } from "./template.js";
import type {
	CodegenContext,
	CodegenOptions,
	CodegenPlugin,
	CodegenResult,
} from "./types.js";

// ============================================================================
// Core codegen plugin (always prepended)
// ============================================================================

/**
 * Built-in core codegen plugin.
 *
 * Declares all core categories (collections, globals, jobs, functions, routes,
 * messages, services, emails, migrations, seeds) and core single files
 * (modules, locale, hooks, access, context).
 *
 * Also provides singleton factory functions for core config files.
 *
 * Always prepended to the plugin list in runCodegen().
 */
export function coreCodegenPlugin(): CodegenPlugin {
	return {
		name: "questpie-core",
		categories: {
			collections: {
				dirs: ["collections"],
				prefix: "coll",
				registryKey: true,
				includeInAppState: true,
				extractFromModules: true,
			},
			globals: {
				dirs: ["globals"],
				prefix: "glob",
				registryKey: true,
				includeInAppState: true,
				extractFromModules: true,
			},
			jobs: {
				dirs: ["jobs"],
				prefix: "job",
				registryKey: true,
				includeInAppState: true,
				extractFromModules: true,
			},
			functions: {
				dirs: ["functions"],
				recursive: true,
				prefix: "fn",
				emit: "nested",
				keySeparator: ".",
				typeEmit: "functions",
				registryKey: true,
				includeInAppState: true,
				extractFromModules: true,
			},
			routes: {
				dirs: ["routes"],
				recursive: true,
				prefix: "route",
				keySeparator: "/",
				registryKey: true,
				includeInAppState: true,
				extractFromModules: true,
			},
			messages: {
				dirs: ["messages"],
				prefix: "msg",
				typeEmit: "messages",
				registryKey: false,
				includeInAppState: false,
				extractFromModules: false,
			},
			services: {
				dirs: ["services"],
				prefix: "svc",
				typeEmit: "services",
				extraTypeImports: [
					'import type { ServiceInstanceOf } from "questpie";',
				],
				registryKey: true,
				includeInAppState: true,
				extractFromModules: true,
				appContextEmit: "services",
			},
			emails: {
				dirs: ["emails"],
				prefix: "email",
				typeEmit: "emails",
				createAppKey: "emailTemplates",
				extraTypeImports: ['import type { MailerService } from "questpie";'],
				registryKey: "emails",
				includeInAppState: false,
				extractFromModules: false,
			},
			migrations: {
				dirs: ["migrations"],
				prefix: "mig",
				emit: "array",
				typeEmit: "none",
				registryKey: false,
				includeInAppState: false,
				extractFromModules: false,
			},
			seeds: {
				dirs: ["seeds"],
				prefix: "seed",
				emit: "array",
				typeEmit: "none",
				registryKey: false,
				includeInAppState: false,
				extractFromModules: false,
			},
		},
		discover: {
			modules: "modules.ts",
			fields: "fields.ts",
			locale: "locale.ts",
			hooks: "hooks.ts",
			defaultAccess: "access.ts",
			contextResolver: "context.ts",
		},
		registries: {
			singletonFactories: {
				locale: {
					configType: "LocaleConfig",
					imports: [{ name: "LocaleConfig", from: "questpie" }],
				},
				hooks: {
					configType: "GlobalHooksInput",
					imports: [{ name: "GlobalHooksInput", from: "questpie" }],
				},
				access: {
					configType: "CollectionAccess",
					imports: [{ name: "CollectionAccess", from: "questpie" }],
				},
				context: {
					configType: "ContextResolver",
					imports: [{ name: "ContextResolver", from: "questpie" }],
				},
			},
		},
		callbackParams: {
			f: {
				proxyCode: "new Proxy({}, { get: (_, prop) => String(prop) })",
			},
		},
	};
}

// ============================================================================
// Main codegen function
// ============================================================================

/**
 * Run codegen: discover files, run plugins, generate template, write output.
 *
 * When `options.module` is set, generates a `module.ts` file (static module
 * definition for npm packages). Otherwise generates `index.ts` (root app).
 *
 * @see RFC-MODULE-ARCHITECTURE §9.1 (Root App), §9.2 (Module)
 */
export async function runCodegen(
	options: CodegenOptions,
): Promise<CodegenResult> {
	const { rootDir, configPath, outDir, dryRun } = options;
	// Always prepend core plugin for singleton factories (locale, hooks, access, context)
	const plugins = [coreCodegenPlugin(), ...(options.plugins ?? [])];

	// 1. Discover files
	const discovered = await discoverFiles(rootDir, outDir, plugins);

	// 1b. Warn about files with named exports (not default)
	const allFiles: import("./types.js").DiscoveredFile[] = [];
	for (const catMap of discovered.categories.values()) {
		for (const file of catMap.values()) {
			allFiles.push(file);
		}
	}
	if (discovered.auth) allFiles.push(discovered.auth);
	for (const singleFile of discovered.singles.values()) {
		allFiles.push(singleFile);
	}
	for (const file of allFiles) {
		if (file.exportType === "named") {
			console.warn(
				`⚠  ${file.source}: no default export found, using named export "${file.namedExportName}". ` +
					`Consider: export default ${file.namedExportName};`,
			);
		}
	}

	// 2. Build codegen context for plugins
	const extraImports: Array<{ name: string; path: string }> = [];
	const extraTypeDeclarations: string[] = [];
	const extraRuntimeCode: string[] = [];
	const extraEntities = new Map<string, string>();

	const ctx: CodegenContext = {
		categories: discovered.categories,
		auth: discovered.auth,
		singles: discovered.singles,
		spreads: discovered.spreads,
		addImport(name, path) {
			extraImports.push({ name, path });
		},
		addTypeDeclaration(code) {
			extraTypeDeclarations.push(code);
		},
		addRuntimeCode(code) {
			extraRuntimeCode.push(code);
		},
		set(key, value) {
			extraEntities.set(key, value);
		},
	};

	// 3. Run plugin transforms
	for (const plugin of plugins) {
		if (plugin.transform) {
			plugin.transform(ctx);
		}
	}

	// 3b. Rewrite self-package imports in module mode
	// When generating modules within a package, plugin transforms may add
	// imports referencing the package's own name (e.g. "@questpie/admin/server").
	// TypeScript resolves these via the "types" export condition to stale dist/
	// types. Rewrite to internal aliases (e.g. "#questpie/admin/server/index.js").
	if (options.module?.importRewriteMap) {
		const rewriteMap = options.module.importRewriteMap;
		for (const imp of extraImports) {
			for (const [from, to] of Object.entries(rewriteMap)) {
				if (imp.path === from || imp.path.startsWith(`${from}/`)) {
					const suffix = imp.path.slice(from.length);
					// Append /index.js for bare subpath imports (e.g. "/server" → "/server/index.js")
					const resolvedSuffix =
						suffix && !suffix.endsWith(".js") && !suffix.endsWith(".ts")
							? `${suffix}/index.js`
							: suffix;
					imp.path = `${to}${resolvedSuffix}`;
				}
			}
		}
	}

	// 4. Generate template — module or root app
	let code: string;
	let outputFile: string;

	if (options.module) {
		// Module mode: generate module.ts (static module definition)
		outputFile = options.module.outputFile ?? "module.ts";

		// Build merged category metadata from all plugins
		const categoryMeta = new Map<
			string,
			import("./types.js").CategoryDeclaration
		>();
		for (const plugin of plugins) {
			if (!plugin.categories) continue;
			for (const [name, decl] of Object.entries(plugin.categories)) {
				categoryMeta.set(name, decl);
			}
		}

		code = generateModuleTemplate({
			moduleName: options.module.name,
			discovered,
			categoryMeta,
			extraImports: extraImports.length > 0 ? extraImports : undefined,
			extraTypeDeclarations:
				extraTypeDeclarations.length > 0 ? extraTypeDeclarations : undefined,
			extraModuleProperties:
				extraRuntimeCode.length > 0 ? extraRuntimeCode : undefined,
		});
	} else {
		// Root app mode: generate index.ts (app with createApp)
		outputFile = "index.ts";
		const configImportPath = computeRelativeImport(outDir, configPath);
		code = generateTemplate({
			configImportPath,
			discovered,
			plugins,
			extraImports: extraImports.length > 0 ? extraImports : undefined,
			extraTypeDeclarations:
				extraTypeDeclarations.length > 0 ? extraTypeDeclarations : undefined,
			extraRuntimeCode:
				extraRuntimeCode.length > 0 ? extraRuntimeCode : undefined,
			extraEntities: extraEntities.size > 0 ? extraEntities : undefined,
		});
	}

	// 5. Generate factories if plugins declare registries (root app only)
	let factoriesCode: string | null = null;
	if (!options.module) {
		const hasModules = discovered.singles.has("modules");
		factoriesCode = generateFactoryTemplate({
			plugins,
			hasModules,
		});
	}

	// 6. Write output
	const outputPath = join(outDir, outputFile);
	if (!dryRun) {
		await mkdir(outDir, { recursive: true });
		await writeFile(outputPath, code, "utf-8");

		// Write factories.ts if generated
		if (factoriesCode) {
			const factoriesPath = join(outDir, "factories.ts");
			await writeFile(factoriesPath, factoriesCode, "utf-8");
		}
	}

	return {
		code,
		outputPath,
		discovered,
	};
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compute a relative import path between two absolute paths,
 * stripping the .ts extension.
 */
function computeRelativeImport(fromDir: string, toFile: string): string {
	let rel = relative(fromDir, toFile);
	// Remove .ts extension
	rel = rel.replace(/\.(ts|tsx|mts|mjs|js|jsx)$/, "");
	if (!rel.startsWith(".")) {
		rel = `./${rel}`;
	}
	return rel;
}
