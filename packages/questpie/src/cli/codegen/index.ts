/**
 * Codegen Orchestrator
 *
 * Main entry point for running codegen. Coordinates:
 * 1. File discovery
 * 2. Plugin execution
 * 3. Template generation
 * 4. File writing
 *
 * @see RFC §15 (Codegen — What Gets Generated)
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { discoverFiles } from "./discover.js";
import { generateTemplate } from "./template.js";
import type {
	CodegenContext,
	CodegenOptions,
	CodegenPlugin,
	CodegenResult,
} from "./types.js";

// ============================================================================
// Admin codegen plugin (built-in)
// ============================================================================

/**
 * Built-in admin codegen plugin.
 * Discovers blocks/ directory when the admin module is used.
 *
 * @see RFC §14.2 (Admin Plugin Example)
 */
export function adminCodegenPlugin(): CodegenPlugin {
	return {
		name: "questpie-admin",
		discover: {
			blocks: "blocks/*.ts",
		},
	};
}

// ============================================================================
// Main codegen function
// ============================================================================

/**
 * Run codegen: discover files, run plugins, generate template, write output.
 */
export async function runCodegen(
	options: CodegenOptions,
): Promise<CodegenResult> {
	const { rootDir, configPath, outDir, plugins = [], dryRun } = options;

	// 1. Discover files
	const discovered = await discoverFiles(rootDir, outDir, plugins);

	// 1b. Warn about files with named exports (not default)
	const allFiles = [
		...discovered.collections.values(),
		...discovered.globals.values(),
		...discovered.jobs.values(),
		...discovered.functions.values(),
		...discovered.messages.values(),
	];
	if (discovered.auth) allFiles.push(discovered.auth);
	for (const customMap of discovered.custom.values()) {
		allFiles.push(...customMap.values());
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
		collections: discovered.collections,
		globals: discovered.globals,
		jobs: discovered.jobs,
		functions: discovered.functions,
		messages: discovered.messages,
		auth: discovered.auth,
		custom: discovered.custom,
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

	// 4. Compute config import path (relative from .generated/ to questpie.config.ts)
	const configImportPath = computeRelativeImport(outDir, configPath);

	// 5. Generate template
	const code = generateTemplate({
		configImportPath,
		discovered,
		extraImports: extraImports.length > 0 ? extraImports : undefined,
		extraTypeDeclarations:
			extraTypeDeclarations.length > 0 ? extraTypeDeclarations : undefined,
		extraRuntimeCode:
			extraRuntimeCode.length > 0 ? extraRuntimeCode : undefined,
		extraEntities: extraEntities.size > 0 ? extraEntities : undefined,
	});

	// 6. Write output
	const outputPath = join(outDir, "index.ts");
	if (!dryRun) {
		await mkdir(outDir, { recursive: true });
		await writeFile(outputPath, code, "utf-8");
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
