/**
 * Admin Module
 *
 * Complete backend module for running the QuestPie admin panel.
 * This is the main entry point for setting up the admin backend.
 *
 * Includes:
 * - Auth collections (users, sessions, accounts, verifications, apikeys)
 * - Assets collection with file upload support
 * - Admin saved views collection (named view configurations)
 * - Admin preferences collection (user-specific view state)
 * - Setup functions for bootstrapping first admin
 * - Core auth options (Better Auth configuration)
 *
 * @example
 * ```ts
 * import { q } from "questpie";
 * import { adminModule } from "@questpie/admin/server";
 *
 * const cms = q({ name: "my-app" })
 *   .use(adminModule)
 *   .collections({
 *     posts: postsCollection,
 *   })
 *   .build({
 *     db: { url: process.env.DATABASE_URL },
 *     storage: { driver: s3Driver(...) },
 *   });
 * ```
 */

import { CollectionBuilder, q, rpc, starterModule } from "questpie";
// Side-effect imports: apply runtime patches and type augmentation
import "../../augmentation.js";
import "../../patch.js";
import { adminFields } from "../../fields/index.js";
import { adminPreferencesCollection } from "../admin-preferences/collections/admin-preferences.collection.js";
import { locksCollection } from "../admin-preferences/collections/locks.collection.js";
import { savedViewsCollection } from "../admin-preferences/collections/saved-views.collection.js";
import { adminConfigFunctions } from "./functions/admin-config.js";
import { actionFunctions } from "./functions/execute-action.js";
import { localeFunctions } from "./functions/locales.js";
import { previewFunctions } from "./functions/preview.js";
import { reactiveFunctions } from "./functions/reactive.js";
import { setupFunctions } from "./functions/setup.js";
import { translationFunctions } from "./functions/translations.js";
import { widgetDataFunctions } from "./functions/widget-data.js";

// Re-export admin preferences collection
export { adminPreferencesCollection } from "../admin-preferences/collections/admin-preferences.collection.js";
// Re-export locks collection
export { locksCollection } from "../admin-preferences/collections/locks.collection.js";
// Re-export saved views types
export {
	type FilterOperator,
	type FilterRule,
	type SortConfig,
	savedViewsCollection,
	type ViewConfiguration,
} from "../admin-preferences/collections/saved-views.collection.js";
// Re-export admin config functions
export {
	adminConfigFunctions,
	getAdminConfig,
} from "./functions/admin-config.js";
// Re-export action functions
export {
	actionFunctions,
	type ExecuteActionRequest,
	type ExecuteActionResponse,
	executeAction,
	executeActionFn,
	getActionsConfig,
	getActionsConfigFn,
} from "./functions/execute-action.js";
// Re-export locale functions for individual use
export { getContentLocales, localeFunctions } from "./functions/locales.js";
// Re-export server-only preview functions (crypto-based token verification)
// For browser-safe utilities (isDraftMode, createDraftModeCookie, etc.), use @questpie/admin/shared
export {
	createPreviewFunctions,
	createPreviewTokenVerifier,
	getPreviewUrl,
	type PreviewTokenPayload,
	previewFunctions,
	verifyPreviewTokenDirect,
} from "./functions/preview.js";
// Re-export reactive field functions
export {
	batchReactive,
	fieldOptions,
	reactiveFunctions,
} from "./functions/reactive.js";
// Re-export setup functions for individual use
export {
	createFirstAdmin,
	isSetupRequired,
	setupFunctions,
} from "./functions/setup.js";
// Re-export translation functions for individual use
export {
	getAdminLocales,
	getAdminTranslations,
	translationFunctions,
} from "./functions/translations.js";
// Re-export widget data functions
export {
	fetchWidgetData,
	widgetDataFunctions,
} from "./functions/widget-data.js";

const r = rpc();

export const adminRpc = r.router({
	...setupFunctions,
	...localeFunctions,
	...previewFunctions,
	...adminConfigFunctions,
	...actionFunctions,
	...translationFunctions,
	...widgetDataFunctions,
	...reactiveFunctions,
});

function bindCollectionToBuilder<TCollection extends CollectionBuilder<any>>(
	collection: TCollection,
	builder: unknown,
): TCollection {
	const rebound = new CollectionBuilder({
		...(collection.state as any),
		"~questpieApp": builder,
	} as any);

	if ((collection as any)._indexesFn) {
		(rebound as any)._indexesFn = (collection as any)._indexesFn;
	}

	return rebound as TCollection;
}

const adminBaseBuilder = q({ name: "questpie-admin" })
	// Include all starterModule functionality (auth, assets)
	.use(starterModule)
	// Register default server-side view/component registries.
	// These must exist so server config builders (`c.*`, `v.*`) resolve from registry.
	.listViews({
		table: q.listView("table"),
	})
	.editViews({
		form: q.editView("form"),
	})
	.components({
		icon: q.component("icon"),
		badge: q.component("badge"),
	});

/**
 * Admin Module - the complete backend for QuestPie admin panel.
 *
 * This module provides everything needed to run the admin panel:
 * - User authentication (Better Auth) - from starterModule
 * - File uploads (assets) - from starterModule
 * - Saved views for collection filters (named configurations)
 * - User preferences (view state synced across devices)
 * - Setup flow for first admin creation
 *
 * @example
 * ```ts
 * import { q } from "questpie";
 * import { adminModule } from "@questpie/admin/server";
 *
 * const cms = q({ name: "my-app" })
 *   .use(adminModule)
 *   .collections({
 *     posts: postsCollection,
 *   })
 *   .build({
 *     db: { url: process.env.DATABASE_URL },
 *   });
 * ```
 *
 * @example
 * ```ts
 * // Extend assets collection with custom fields
 * import { q, collection, varchar } from "questpie";
 * import { adminModule } from "@questpie/admin/server";
 *
 * const cms = q({ name: "my-app" })
 *   .use(adminModule)
 *   .collections({
 *     // Override assets with additional fields
 *     assets: adminModule.state.collections.assets.merge(
 *       collection("assets").fields({
 *         folder: varchar("folder", { length: 255 }),
 *         tags: varchar("tags", { length: 1000 }),
 *       })
 *     ),
 *   })
 *   .build({ ... });
 * ```
 */
export const adminModule = adminBaseBuilder
	// Register admin-specific field types (richText, blocks)
	.fields(adminFields)
	// Add admin-specific collections with admin UI config
	.collections({
		// Override auth collections with admin UI config
		user: bindCollectionToBuilder(
			starterModule.state.collections.user,
			adminBaseBuilder,
		)
			.admin(({ c }) => ({
				label: { key: "defaults.users.label" },
				icon: c.icon("ph:users"),
				description: { key: "defaults.users.description" },
				group: "administration",
			}))
			.list(({ v, f, a }) =>
				v.table({
					columns: [f.name, f.email, f.role, f.banned],
					searchable: [f.name, f.email],
					defaultSort: { field: f.name, direction: "asc" },
					actions: {
						header: { primary: [a.create], secondary: [] },
						row: [a.delete],
						bulk: [a.deleteMany],
					},
				}),
			)
			.form(({ v, f }) =>
				v.form({
					sidebar: {
						position: "right",
						fields: [f.image, f.role, f.emailVerified],
					},
					fields: [
						{
							type: "tabs",
							tabs: [
								{
									id: "profile",
									label: { key: "defaults.users.tabs.profile" },
									fields: [
										{
											type: "section",
											label: { key: "defaults.users.sections.basicInfo" },
											layout: "grid",
											columns: 2,
											fields: [f.name, f.email],
										},
									],
								},
								{
									id: "security",
									label: { key: "defaults.users.tabs.security" },
									fields: [
										{
											type: "section",
											label: { key: "defaults.users.sections.accessControl" },
											fields: [f.banned, f.banReason, f.banExpires],
										},
									],
								},
							],
						},
					],
				}),
			),

		assets: bindCollectionToBuilder(
			starterModule.state.collections.assets,
			adminBaseBuilder,
		)
			.admin(({ c }) => ({
				label: { key: "defaults.assets.label" },
				icon: c.icon("ph:image"),
				description: { key: "defaults.assets.description" },
				group: "administration",
			}))
			.list(({ v, f, a }) =>
				v.table({
					// Note: filename, mimeType, size, createdAt are upload fields (added by .upload())
					// so we use string literals instead of f.* proxy
					columns: ["filename", "mimeType", "size"],
					searchable: ["filename", f.alt],
					defaultSort: { field: "createdAt", direction: "desc" },
					actions: {
						header: { primary: [], secondary: [] },
						row: [a.delete],
						bulk: [a.deleteMany],
					},
				}),
			)
			.form(({ v, f }) =>
				v.form({
					sidebar: {
						position: "right",
						fields: [
							{
								type: "section",
								label: { key: "defaults.assets.sections.fileInfo" },
								// Note: filename, mimeType, size, visibility are upload fields
								fields: ["filename", "mimeType", "size", "visibility"],
							},
						],
					},
					fields: [
						{
							type: "section",
							label: { key: "defaults.assets.sections.dimensions" },
							layout: "grid",
							columns: 2,
							fields: [f.width, f.height],
						},
						{
							type: "section",
							label: { key: "defaults.assets.sections.metadata" },
							fields: [f.alt, f.caption],
						},
					],
				}),
			),

		// Hide internal auth collections
		session: starterModule.state.collections.session.admin({ hidden: true }),
		account: starterModule.state.collections.account.admin({ hidden: true }),
		verification: starterModule.state.collections.verification.admin({
			hidden: true,
		}),
		apikey: starterModule.state.collections.apikey.admin({ hidden: true }),

		// Admin-specific collections (hidden from sidebar)
		adminSavedViews: savedViewsCollection.admin({ hidden: true }),
		adminPreferences: adminPreferencesCollection.admin({ hidden: true }),
		adminLocks: locksCollection.admin({ hidden: true }),
	})
	// Default sidebar
	.sidebar(({ s, c }) =>
		s.sidebar({
			sections: [
				s.section({
					id: "administration",
					title: { key: "defaults.sidebar.administration" },
					items: [
						{
							type: "collection",
							collection: "user",
							icon: c.icon("ph:users"),
						},
						{
							type: "collection",
							collection: "assets",
							icon: c.icon("ph:image"),
						},
					],
				}),
			],
		}),
	);
