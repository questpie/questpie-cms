/**
 * Admin Config Functions
 *
 * Provides server-defined admin configuration (dashboard, sidebar)
 * to the client via functions API.
 *
 * @example
 * ```ts
 * // Client usage
 * const config = await cms.api.functions.getAdminConfig();
 * // { dashboard: {...}, sidebar: {...} }
 * ```
 */

import { fn, type Questpie } from "questpie";
import { z } from "zod";
import { introspectBlocks } from "../../../block/introspection.js";

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Helper to get typed CMS app from handler context.
 */
function getApp(ctx: { app: unknown }): Questpie<any> {
	return ctx.app as Questpie<any>;
}

// ============================================================================
// Schema Definitions
// ============================================================================

const getAdminConfigSchema = z.object({}).optional();

// Output schema is flexible since dashboard/sidebar configs are complex
const getAdminConfigOutputSchema = z.object({
	dashboard: z.unknown().optional(),
	sidebar: z.unknown().optional(),
	blocks: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// Functions
// ============================================================================

/**
 * Get admin configuration including dashboard, sidebar, and blocks.
 *
 * This function exposes server-defined admin config to the client,
 * allowing the admin UI to render based on server configuration.
 *
 * @example
 * ```ts
 * // In your CMS
 * const cms = q({ name: "my-app" })
 *   .use(adminModule)
 *   .dashboard(({ d }) => d.dashboard({
 *     title: { en: "Dashboard" },
 *     items: [...],
 *   }))
 *   .sidebar(({ s }) => s.sidebar({
 *     sections: [...],
 *   }))
 *   .build({ ... });
 *
 * // Client fetches config
 * const config = await cms.api.functions.getAdminConfig();
 * ```
 */
export const getAdminConfig = fn({
	type: "query",
	schema: getAdminConfigSchema,
	outputSchema: getAdminConfigOutputSchema,
	handler: async (ctx) => {
		const cms = getApp(ctx);
		const state = (cms as any).state || {};

		const response: {
			dashboard?: unknown;
			sidebar?: unknown;
			blocks?: Record<string, unknown>;
		} = {};

		// Include dashboard config if defined
		if (state.dashboard) {
			response.dashboard = state.dashboard;
		}

		// Include sidebar config if defined
		if (state.sidebar) {
			response.sidebar = state.sidebar;
		}

		// Include block schemas if blocks are registered
		if (state.blocks && Object.keys(state.blocks).length > 0) {
			response.blocks = introspectBlocks(state.blocks);
		}

		return response;
	},
});

// ============================================================================
// Export Bundle
// ============================================================================

/**
 * Admin config functions group.
 * Add to your CMS via `.functions(adminConfigFunctions)`.
 */
export const adminConfigFunctions = {
	getAdminConfig,
} as const;
