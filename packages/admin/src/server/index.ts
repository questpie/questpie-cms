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

// Server-side type augmentation for builder states
// This import activates the module augmentation for questpie types
import "./augmentation.js";

// Apply runtime patches to builder prototypes
// This adds admin methods to QuestpieBuilder, CollectionBuilder, GlobalBuilder
import { applyAdminPatches } from "./patch.js";

applyAdminPatches();

// Framework adapters
export * from "./adapters/index.js";
// Export augmentation types for external use
export type {
	ActionReference,
	AdminCollectionConfig,
	AdminGlobalConfig,
	ComponentDefinition,
	ComponentReference,
	EditViewDefinition,
	FieldReference,
	FormSection,
	FormTab,
	FormViewConfig,
	ListViewConfig,
	ListViewDefinition,
	PreviewConfig,
} from "./augmentation.js";
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
	// Preview helpers (server-only, crypto-based)
	// For browser-safe preview utilities, use @questpie/admin/shared
	createPreviewFunctions,
	createPreviewTokenVerifier,
	type FilterOperator,
	type FilterRule,
	isSetupRequired,
	type PreviewTokenPayload,
	type SortConfig,
	// Saved views
	savedViewsCollection,
	// Setup functions
	setupFunctions,
	type ViewConfiguration,
	verifyPreviewTokenDirect,
} from "./modules/admin/index.js";
// Runtime patching (applied automatically when this module is imported)
export {
	applyAdminPatches,
	arePatchesApplied,
	createActionProxy,
	createComponentProxy,
	createFieldProxy,
	createViewProxy,
} from "./patch.js";
