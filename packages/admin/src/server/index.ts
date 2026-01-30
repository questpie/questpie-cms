/**
 * @questpie/admin server exports
 *
 * Server-side modules for the admin panel.
 * These have no React dependencies and can be used in Node.js environments.
 *
 * @example
 * ```ts
 * import { adminModule } from "@questpie/admin/server";
 *
 * const cms = q({ name: "my-app" })
 *   .use(adminModule)
 *   .build({ ... });
 * ```
 */

// Framework adapters
export * from "./adapters/index.js";

// Auth helpers for SSR
export {
	type AuthSession,
	type GetAdminSessionOptions,
	getAdminSession,
	isAdminUser,
	type RequireAdminAuthOptions,
	requireAdminAuth,
} from "./auth-helpers.js";
// Main admin module - the complete backend for admin panel
export {
	adminModule,
	createFirstAdmin,
	type FilterOperator,
	type FilterRule,
	isSetupRequired,
	// Preview helpers (server-only, crypto-based)
	// For browser-safe preview utilities, use @questpie/admin/shared
	createPreviewFunctions,
	createPreviewTokenVerifier,
	type PreviewTokenPayload,
	verifyPreviewTokenDirect,
	// Saved views
	savedViewsCollection,
	type SortConfig,
	// Setup functions
	setupFunctions,
	type ViewConfiguration,
} from "./modules/admin/index.js";
