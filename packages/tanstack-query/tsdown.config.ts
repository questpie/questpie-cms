import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts", "src/db.ts"],
	outDir: "dist",
	format: ["esm"],
	clean: true,
	dts: true,
	shims: true,
});
