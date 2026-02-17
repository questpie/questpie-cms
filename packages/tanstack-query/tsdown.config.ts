import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	outDir: "dist",
	format: ["esm"],
	clean: true,
	dts: true,
	shims: true,
	exports: {
		devExports: true,
	},
	external: ["questpie", "questpie/client", "@tanstack/react-query"],
});
