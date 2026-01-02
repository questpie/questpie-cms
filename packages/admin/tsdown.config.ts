import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/config/index.ts", "src/hooks/index.ts", "src/utils/index.ts"],
	outDir: "dist",
	format: ["esm"],
	clean: true,
	dts: true,
	shims: true,
	// Copy CSS files
	onSuccess: async () => {
		await import("node:fs/promises").then(async (fs) => {
			await fs.mkdir("./dist/styles", { recursive: true });
			await fs.copyFile("./src/styles/index.css", "./dist/styles/index.css");
		});
	},
});
