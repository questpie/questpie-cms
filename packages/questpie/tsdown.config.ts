import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/exports/*.ts"],
	outDir: "dist",
	format: ["esm"],
	clean: true,
	dts: {
		sourcemap: false,
	},
	shims: true,
	external: ["bun"],
	unbundle: true,
	exports: {
		// Export all files including internal chunks so TypeScript can resolve
		// type references from internal .d.mts files
		all: true,
		devExports: true,
		customExports: async (generatedExports) => {
			const exportsWithTypes: Record<
				string,
				string | { types: string; default: string }
			> = {
				...generatedExports,
			};

			const typedEntries: Record<string, string> = {
				".": "./dist/index.d.mts",
				"./cli": "./dist/cli.d.mts",
				"./client": "./dist/client.d.mts",
				"./drizzle": "./dist/drizzle.d.mts",
				"./drizzle-pg-core": "./dist/drizzle-pg-core.d.mts",
				"./shared": "./dist/shared.d.mts",
			};

			for (const [entry, typesPath] of Object.entries(typedEntries)) {
				const current = generatedExports[entry];
				if (typeof current === "string") {
					exportsWithTypes[entry] = {
						types: typesPath,
						default: current,
					};
				}
			}

			return exportsWithTypes;
		},
	},
	onSuccess: async () => {
		// Make CLI executable
		const { chmod } = await import("node:fs/promises");
		try {
			await chmod("dist/cli.mjs", 0o755);
			console.log("✅ Made CLI executable");
		} catch (error) {
			console.warn("⚠️  Could not make CLI executable:", error);
		}
	},
});
