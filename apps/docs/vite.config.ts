import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const startPlugin = tanstackStart({
	prerender: {
		enabled: process.env.DISABLE_PRERENDER !== "true",
		// Only prerender landing page, docs are rendered on-demand
		routes: ["/"],
		crawlLinks: false,
	},
	sitemap: {
		host: "https://questpie.com",
	},
} as any);

export default defineConfig({
	server: {
		port: 3000,
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes("node_modules")) return;

					if (id.includes("@phosphor-icons") || id.includes("lucide-react")) {
						return "vendor-icons";
					}
				},
			},
		},
	},
	plugins: [
		mdx(await import("./source.config")),
		tailwindcss(),
		tsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		startPlugin,
		nitro({ preset: "bun" }) as any,
		react(),
	],
});
