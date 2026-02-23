/**
 * File Discovery
 *
 * Scans the questpie root directory for entity files matching
 * the file convention patterns. Supports both by-type and by-feature layouts.
 *
 * @see RFC §2 (File Convention), §2.4 (Discovery Rules)
 */

import { readdir, stat } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import type { CodegenPlugin, DiscoveredFile } from "./types.js";

// ============================================================================
// Key Derivation
// ============================================================================

/**
 * Convert a kebab-case filename to camelCase key.
 * `send-newsletter.ts` → `sendNewsletter`
 * `site-settings.ts` → `siteSettings`
 *
 * @see RFC §2.4 (Key Derivation)
 */
export function kebabToCamelCase(filename: string): string {
	// Remove extension
	const name = filename.replace(/\.(ts|tsx|js|jsx|mts|mjs)$/, "");
	return name.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Create a safe TypeScript variable name from a key.
 * Prefixed with underscore + category to avoid collisions.
 */
function toVarName(prefix: string, key: string): string {
	// Replace dots and dashes with underscores
	const safe = key.replace(/[.\-/]/g, "_");
	return `_${prefix}_${safe}`;
}

// ============================================================================
// Glob-like directory scanner
// ============================================================================

const TS_EXTENSIONS = new Set([".ts", ".tsx", ".mts"]);
const IGNORE_FILES = new Set(["index.ts", "index.mts", "index.tsx"]);

/** Files starting with _ are considered private/utility and skipped. */
function isPrivateFile(name: string): boolean {
	return name.startsWith("_");
}

/**
 * Recursively scan a directory for TypeScript files.
 * Returns relative paths from the base directory.
 */
async function scanDir(
	dir: string,
	base: string,
	recursive: boolean,
): Promise<string[]> {
	const results: string[] = [];
	let entries: Array<{
		name: string;
		isDirectory(): boolean;
		isFile(): boolean;
	}>;
	try {
		entries = (await readdir(dir, { withFileTypes: true })) as any;
	} catch {
		return results; // Directory doesn't exist
	}
	for (const entry of entries) {
		const name = String(entry.name);
		const fullPath = join(dir, name);
		if (entry.isDirectory() && recursive) {
			const nested = await scanDir(fullPath, base, true);
			results.push(...nested);
		} else if (entry.isFile()) {
			const ext = extname(name);
			if (
				TS_EXTENSIONS.has(ext) &&
				!IGNORE_FILES.has(name) &&
				!isPrivateFile(name)
			) {
				results.push(relative(base, fullPath));
			}
		}
	}
	return results;
}

/**
 * Check if a single file exists.
 */
async function fileExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isFile();
	} catch {
		return false;
	}
}

// ============================================================================
// Core discovery patterns
// ============================================================================

interface DiscoveryCategory {
	/** Category name (e.g. "collections"). */
	category: string;
	/** Glob-like pattern description for logging. */
	patterns: string[];
	/** Directories to scan (relative to root). */
	dirs: string[];
	/** Whether to scan recursively (only for functions). */
	recursive: boolean;
	/** Variable name prefix. */
	prefix: string;
}

const CORE_CATEGORIES: DiscoveryCategory[] = [
	{
		category: "collections",
		patterns: ["collections/*.ts", "features/*/collections/*.ts"],
		dirs: ["collections"],
		recursive: false,
		prefix: "coll",
	},
	{
		category: "globals",
		patterns: ["globals/*.ts", "features/*/globals/*.ts"],
		dirs: ["globals"],
		recursive: false,
		prefix: "glob",
	},
	{
		category: "jobs",
		patterns: ["jobs/*.ts", "features/*/jobs/*.ts"],
		dirs: ["jobs"],
		recursive: false,
		prefix: "job",
	},
	{
		category: "functions",
		patterns: ["functions/**/*.ts", "features/*/functions/**/*.ts"],
		dirs: ["functions"],
		recursive: true,
		prefix: "fn",
	},
	{
		category: "messages",
		patterns: ["messages/*.ts"],
		dirs: ["messages"],
		recursive: false,
		prefix: "msg",
	},
];

// ============================================================================
// Feature layout discovery
// ============================================================================

/**
 * Scan features/ directory for feature-specific entity files.
 */
async function discoverFeatures(
	rootDir: string,
	category: DiscoveryCategory,
): Promise<Array<{ relPath: string; featureName: string }>> {
	const results: Array<{ relPath: string; featureName: string }> = [];
	const featuresDir = join(rootDir, "features");
	let featureDirs: Array<{ name: string; isDirectory(): boolean }>;
	try {
		featureDirs = (await readdir(featuresDir, { withFileTypes: true })) as any;
	} catch {
		return results;
	}
	for (const fDir of featureDirs) {
		if (!fDir.isDirectory()) continue;
		const featureName = String(fDir.name);
		for (const dir of category.dirs) {
			const scanPath = join(featuresDir, featureName, dir);
			const files = await scanDir(scanPath, scanPath, category.recursive);
			for (const f of files) {
				results.push({
					relPath: join("features", featureName, dir, f),
					featureName,
				});
			}
		}
	}
	return results;
}

// ============================================================================
// Main discovery function
// ============================================================================

export interface DiscoveryResult {
	collections: Map<string, DiscoveredFile>;
	globals: Map<string, DiscoveredFile>;
	jobs: Map<string, DiscoveredFile>;
	functions: Map<string, DiscoveredFile>;
	messages: Map<string, DiscoveredFile>;
	auth: DiscoveredFile | null;
	custom: Map<string, Map<string, DiscoveredFile>>;
}

/**
 * Discover all entity files in the questpie root directory.
 *
 * @param rootDir — Directory containing questpie.config.ts
 * @param outDir — .generated output directory (for computing relative import paths)
 * @param plugins — Optional codegen plugins that register additional discovery patterns
 */
export async function discoverFiles(
	rootDir: string,
	outDir: string,
	plugins?: CodegenPlugin[],
): Promise<DiscoveryResult> {
	const result: DiscoveryResult = {
		collections: new Map(),
		globals: new Map(),
		jobs: new Map(),
		functions: new Map(),
		messages: new Map(),
		auth: null,
		custom: new Map(),
	};

	// Discover core categories
	for (const category of CORE_CATEGORIES) {
		const map = result[
			category.category as keyof Omit<DiscoveryResult, "auth" | "custom">
		] as Map<string, DiscoveredFile>;

		// Scan by-type layout
		for (const dir of category.dirs) {
			const scanPath = join(rootDir, dir);
			const files = await scanDir(scanPath, scanPath, category.recursive);
			for (const relFile of files) {
				const file = processFile(rootDir, outDir, join(dir, relFile), category);
				checkConflict(map, file, category.category);
				map.set(file.key, file);
			}
		}

		// Scan by-feature layout
		const featureFiles = await discoverFeatures(rootDir, category);
		for (const { relPath } of featureFiles) {
			const file = processFile(rootDir, outDir, relPath, category);
			checkConflict(map, file, category.category);
			map.set(file.key, file);
		}
	}

	// Discover auth.ts (single file)
	for (const authFile of ["auth.ts", "auth.mts"]) {
		const authPath = join(rootDir, authFile);
		if (await fileExists(authPath)) {
			const importPath = relativeImport(outDir, join(rootDir, authFile));
			result.auth = {
				absolutePath: authPath,
				key: "auth",
				importPath,
				varName: "_auth",
				source: authFile,
			};
			break;
		}
	}

	// Discover plugin patterns
	if (plugins) {
		for (const plugin of plugins) {
			if (!plugin.discover) continue;
			for (const [stateKey, patterns] of Object.entries(plugin.discover)) {
				const patternList = Array.isArray(patterns) ? patterns : [patterns];
				const pluginMap = new Map<string, DiscoveredFile>();

				for (const pattern of patternList) {
					// Parse pattern: "blocks/*.ts" → dir="blocks", recursive=false
					// "blocks/**/*.ts" → dir="blocks", recursive=true
					const parts = pattern.split("/");
					const baseDir = parts[0];
					const recursive = pattern.includes("**");

					// By-type scan
					const scanPath = join(rootDir, baseDir);
					const files = await scanDir(scanPath, scanPath, recursive);
					for (const relFile of files) {
						const file = processFile(rootDir, outDir, join(baseDir, relFile), {
							category: stateKey,
							patterns: [pattern],
							dirs: [baseDir],
							recursive,
							prefix: stateKey.slice(0, 4),
						});
						checkConflict(pluginMap, file, stateKey);
						pluginMap.set(file.key, file);
					}

					// By-feature scan
					const featuresDir = join(rootDir, "features");
					let featureDirs: Array<{ name: string; isDirectory(): boolean }>;
					try {
						featureDirs = (await readdir(featuresDir, {
							withFileTypes: true,
						})) as any;
					} catch {
						continue;
					}
					for (const fDir of featureDirs) {
						if (!fDir.isDirectory()) continue;
						const fDirName = String(fDir.name);
						const featureScanPath = join(featuresDir, fDirName, baseDir);
						const featureFiles = await scanDir(
							featureScanPath,
							featureScanPath,
							recursive,
						);
						for (const relFile of featureFiles) {
							const file = processFile(
								rootDir,
								outDir,
								join("features", fDirName, baseDir, relFile),
								{
									category: stateKey,
									patterns: [pattern],
									dirs: [baseDir],
									recursive,
									prefix: stateKey.slice(0, 4),
								},
							);
							checkConflict(pluginMap, file, stateKey);
							pluginMap.set(file.key, file);
						}
					}
				}

				if (pluginMap.size > 0) {
					result.custom.set(stateKey, pluginMap);
				}
			}
		}
	}

	return result;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Process a discovered file into a DiscoveredFile object.
 */
function processFile(
	rootDir: string,
	outDir: string,
	relPath: string,
	category: DiscoveryCategory,
): DiscoveredFile {
	const absolutePath = join(rootDir, relPath);
	const importPath = relativeImport(outDir, absolutePath);

	// Derive key based on category
	let key: string;
	if (category.recursive) {
		// Functions: path segments become nested keys
		// functions/admin/stats.ts → "admin.stats"
		// functions/search.ts → "search"
		const dir = category.dirs[0];
		// Get the relative path within the category dir
		let innerPath: string;
		if (relPath.startsWith("features/")) {
			// features/blog/functions/search.ts → search.ts
			const parts = relPath.split("/");
			const dirIdx = parts.indexOf(dir);
			innerPath = parts.slice(dirIdx + 1).join("/");
		} else {
			// functions/admin/stats.ts → admin/stats.ts
			innerPath = relPath.slice(dir.length + 1);
		}
		const segments = innerPath
			.replace(/\.(ts|tsx|mts|mjs|js|jsx)$/, "")
			.split("/")
			.map(kebabToCamelCase);
		key = segments.join(".");
	} else {
		// Simple: filename → camelCase key
		key = kebabToCamelCase(basename(relPath));
	}

	const varName = toVarName(category.prefix, key);

	return {
		absolutePath,
		key,
		importPath,
		varName,
		source: relPath,
	};
}

/**
 * Compute a relative import path from the output directory to a target file.
 * Strips the .ts extension and ensures it starts with "../".
 */
function relativeImport(fromDir: string, toFile: string): string {
	let rel = relative(fromDir, toFile);
	// Remove extension
	rel = rel.replace(/\.(ts|tsx|mts|mjs|js|jsx)$/, "");
	// Ensure it starts with ./ or ../
	if (!rel.startsWith(".")) {
		rel = `./${rel}`;
	}
	return rel;
}

/**
 * Check for duplicate key conflicts and throw an error if found.
 * @see RFC §2.4 — "Conflict resolution: duplicate key → error"
 */
function checkConflict(
	map: Map<string, DiscoveredFile>,
	file: DiscoveredFile,
	category: string,
): void {
	const existing = map.get(file.key);
	if (existing) {
		throw new Error(
			`Codegen conflict: duplicate ${category} key "${file.key}" found in:\n` +
				`  - ${existing.source}\n` +
				`  - ${file.source}\n` +
				`Each key must be unique across by-type and by-feature layouts.`,
		);
	}
}
