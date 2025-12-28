import { QCMS, type ElysiaAdapterConfig } from "#questpie/core/exports/server";
import { createRoutes } from "#questpie/core/server/elysia/routes";
import type { Elysia } from "elysia";

export const questpie = (config: ElysiaAdapterConfig) => (app: Elysia) => {
	// Initialize CMS instance
	const cms = new QCMS(config);

	return app
		.decorate("cms", cms)
		.derive(async (ctx) => {
			// Extract locale from headers
			const locale =
				ctx.headers["accept-language"]?.split(",")[0] ||
				config.locale?.defaultLocale ||
				"en";

			// Extract user from context if available (set by auth middleware)
			const user = (ctx as any).user;

			// Create CMS context
			// db is from CMS config, user from Elysia context (if available)
			const cmsContext = await cms.createContext({
				user,
				locale,
			});

			return {
				cmsContext,
			};
		})
		.use(createRoutes(cms));
};
