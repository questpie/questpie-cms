/**
 * Admin Module
 *
 * Complete backend module for running the QUESTPIE admin panel.
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
 * import { config } from "questpie";
 * import { admin } from "@questpie/admin/server";
 *
 * export default config({
 *   modules: [admin()],
 *   app: { url: process.env.APP_URL! },
 *   db: { url: process.env.DATABASE_URL! },
 * });
 * ```
 */

import { module, starter } from "questpie";

// Get starter collections for admin UI configuration.
// These are raw CollectionBuilder instances that carry a coreBuilder reference
// with defaultFields, so .admin()/.list()/.form()/.actions() methods work on them.
// Cast needed: ModuleDefinition.collections is Record<string, AnyCollectionOrBuilder>,
// but these are all CollectionBuilder instances at runtime.
const {
	user: usersCollection,
	assets: assetsCollection,
	session: sessionsCollection,
	account: accountsCollection,
	verification: verificationsCollection,
	apikey: apiKeysCollection,
} = starter().collections as any;

// Side-effect imports: apply runtime patches and type augmentation
import "../../augmentation.js";
import "../../patch.js";
import { adminFields } from "../../fields/index.js";
import {
	component,
	createComponentProxy,
	editView,
	listView,
} from "../../patch.js";
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
// Re-export locks collection
// Re-export saved views types
export {
	type FilterOperator,
	type FilterRule,
	type SortConfig,
	savedViewsCollection,
	type ViewConfiguration,
} from "../admin-preferences/collections/saved-views.collection.js";
// Re-export admin config functions
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
// Re-export server-only preview functions (crypto-based token verification)
// For browser-safe utilities (isDraftMode, createDraftModeCookie, etc.), use @questpie/admin/shared
export {
	createPreviewFunctions,
	createPreviewTokenVerifier,
	type PreviewTokenPayload,
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
// Re-export widget data functions
export {
	fetchWidgetData,
	widgetDataFunctions,
} from "./functions/widget-data.js";

/**
 * Admin RPC functions — plain object of all admin function definitions.
 * Register these on your app via `.functions({ ...adminRpc })` or via `config()`.
 */
export const adminRpc = {
	...setupFunctions,
	...localeFunctions,
	...previewFunctions,
	...adminConfigFunctions,
	...actionFunctions,
	...translationFunctions,
	...widgetDataFunctions,
	...reactiveFunctions,
};

// ============================================================================
// Admin-configured collections
// ============================================================================
// Built directly from raw starter collections. The .admin()/.list()/.form()/.actions()
// methods work because the raw collections carry a ~questpieApp reference to the
// coreBuilder which has defaultFields registered.

const adminUserCollection = usersCollection
	.admin(({ c }: any) => ({
		label: { key: "defaults.users.label" },
		icon: c.icon("ph:users"),
		description: { key: "defaults.users.description" },
		group: "administration",
	}))
	.list(({ v, f, a }: any) =>
		v.table({
			columns: [f.name, f.email, f.role, f.banned],
			searchable: [f.name, f.email],
			defaultSort: { field: f.name, direction: "asc" },
			actions: {
				header: { primary: [], secondary: [] },
				row: [a.delete],
				bulk: [a.deleteMany],
			},
		}),
	)
	.form(({ v, f }: any) =>
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
									fields: [
										f.name,
										{
											field: f.email,
											readOnly: ({ data }: any) => Boolean((data as any)?.id),
										},
									],
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
									fields: [
										f.banned,
										{
											field: f.banReason,
											hidden: ({ data }: any) => !(data as any)?.banned,
										},
										{
											field: f.banExpires,
											hidden: ({ data }: any) => !(data as any)?.banned,
										},
									],
								},
							],
						},
					],
				},
			],
		}),
	)
	.actions(({ a, c, f }: any) => ({
		builtin: [a.save(), a.delete(), a.deleteMany(), a.duplicate()],
		custom: [
			a.headerAction({
				id: "createUser",
				label: { key: "defaults.users.actions.createUser.label" },
				icon: c.icon("ph:user-plus"),
				form: {
					title: { key: "defaults.users.actions.createUser.title" },
					description: {
						key: "defaults.users.actions.createUser.description",
					},
					submitLabel: { key: "defaults.users.actions.createUser.submit" },
					fields: {
						name: f.text({
							label: { key: "defaults.users.fields.name.label" },
							required: true,
						}),
						email: f.email({
							label: { key: "defaults.users.fields.email.label" },
							required: true,
						}),
						password: f.text({
							label: {
								key: "defaults.users.actions.createUser.fields.password.label",
							},
							required: true,
							type: "password",
							autoComplete: "new-password",
						}),
						role: f.select({
							label: { key: "defaults.users.fields.role.label" },
							options: [
								{
									value: "admin",
									label: {
										key: "defaults.users.fields.role.options.admin",
									},
								},
								{
									value: "user",
									label: { key: "defaults.users.fields.role.options.user" },
								},
							],
							defaultValue: "user",
						}),
					},
				},
				handler: async ({ data, app, session }: any) => {
					const authApi = (app as any)?.auth?.api;
					if (!authApi?.createUser) {
						return {
							type: "error",
							toast: {
								message:
									"Auth admin API is not configured. Cannot create user.",
							},
						};
					}

					const token = (session as any)?.session?.token;
					const headers = token
						? new Headers({ authorization: `Bearer ${token}` })
						: undefined;

					const result = await authApi.createUser({
						body: {
							email: String((data as any).email || ""),
							password: String((data as any).password || ""),
							name: String((data as any).name || ""),
							role: (data as any).role ? String((data as any).role) : undefined,
						},
						...(headers ? { headers } : {}),
					});

					const createdUserId = (result as any)?.user?.id;
					const createdUserEmail = (result as any)?.user?.email;

					if (!createdUserId) {
						return {
							type: "error",
							toast: {
								message: "Failed to create user",
							},
						};
					}

					return {
						type: "success",
						toast: {
							message: `User ${createdUserEmail || ""} created successfully`,
						},
						effects: {
							invalidate: ["user"],
							redirect: `/admin/collections/user/${createdUserId}`,
						},
					};
				},
			}),
			a.action({
				id: "resetPassword",
				label: { key: "defaults.users.actions.resetPassword.label" },
				icon: c.icon("ph:key"),
				variant: "outline",
				form: {
					title: { key: "defaults.users.actions.resetPassword.title" },
					description: {
						key: "defaults.users.actions.resetPassword.description",
					},
					submitLabel: {
						key: "defaults.users.actions.resetPassword.submit",
					},
					fields: {
						newPassword: f.text({
							label: {
								key: "defaults.users.actions.resetPassword.fields.newPassword.label",
							},
							required: true,
							type: "password",
							autoComplete: "new-password",
						}),
						confirmPassword: f.text({
							label: {
								key: "defaults.users.actions.resetPassword.fields.confirmPassword.label",
							},
							required: true,
							type: "password",
							autoComplete: "new-password",
						}),
					},
				},
				handler: async ({ data, itemId, app, session }: any) => {
					if (!itemId) {
						return {
							type: "error",
							toast: { message: "User ID is required" },
						};
					}

					const newPassword = String((data as any).newPassword || "");
					const confirmPassword = String((data as any).confirmPassword || "");

					if (newPassword !== confirmPassword) {
						return {
							type: "error",
							toast: {
								message: "Passwords do not match",
							},
						};
					}

					const authApi = (app as any)?.auth?.api;
					if (!authApi?.setUserPassword) {
						return {
							type: "error",
							toast: {
								message:
									"Auth admin API is not configured. Cannot reset password.",
							},
						};
					}

					const token = (session as any)?.session?.token;
					const headers = token
						? new Headers({ authorization: `Bearer ${token}` })
						: undefined;

					await authApi.setUserPassword({
						body: {
							userId: itemId,
							newPassword,
						},
						...(headers ? { headers } : {}),
					});

					return {
						type: "success",
						toast: { message: "Password reset successfully" },
						effects: { invalidate: ["user"] },
					};
				},
			}),
		],
	}));

const adminAssetsCollection = assetsCollection
	.admin(({ c }: any) => ({
		label: { key: "defaults.assets.label" },
		icon: c.icon("ph:image"),
		description: { key: "defaults.assets.description" },
		group: "administration",
	}))
	.list(({ v, f, a }: any) =>
		v.table({
			// Note: filename, mimeType, size, createdAt are upload fields (added by .upload())
			// so we use string literals instead of f.* proxy
			columns: ["preview", "filename", "mimeType", "size"],
			searchable: ["filename", f.alt],
			defaultSort: { field: "createdAt", direction: "desc" },
			actions: {
				header: { primary: [], secondary: [] },
				row: [a.delete],
				bulk: [a.deleteMany],
			},
		}),
	)
	.form(({ v, f }: any) =>
		v.form({
			sidebar: {
				position: "right",
				fields: [
					{
						type: "section",
						label: { key: "defaults.assets.sections.fileInfo" },
						// Note: filename, mimeType, size, visibility are upload fields
						fields: ["preview", "filename", "mimeType", "size", "visibility"],
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
	);

/**
 * All admin-configured collections, ready for use in `module({...})`.
 * Includes both starter overrides (with admin UI) and admin-internal collections.
 */
const adminCollections = {
	// Override auth collections with admin UI config
	user: adminUserCollection,
	assets: adminAssetsCollection,
	// Hide internal auth collections (audit: false to skip audit logging)
	session: sessionsCollection.admin({ hidden: true, audit: false }),
	account: accountsCollection.admin({ hidden: true, audit: false }),
	verification: verificationsCollection.admin({ hidden: true, audit: false }),
	apikey: apiKeysCollection.admin({ hidden: true, audit: false }),
	// Admin-specific collections (hidden from sidebar)
	adminSavedViews: savedViewsCollection.admin({ hidden: true, audit: false }),
	adminPreferences: adminPreferencesCollection.admin({
		hidden: true,
		audit: false,
	}),
	adminLocks: locksCollection.admin({ hidden: true, audit: false }),
};

// ============================================================================
// admin() — module() factory for use with config() + createApp()
// ============================================================================

/**
 * Options for the admin module when used via `config({ modules: [admin({...})] })`.
 */
export interface AdminOptions {
	/** Branding — app name, logo, etc. */
	branding?: { name?: unknown; logo?: unknown };
	/** Sidebar config — callback or static object. */
	sidebar?: ((ctx: any) => any) | Record<string, any>;
	/** Dashboard config — callback or static object. */
	dashboard?: ((ctx: any) => any) | Record<string, any>;
	/** Admin UI locale config. */
	adminLocale?: { locales: string[]; defaultLocale: string };
}

/**
 * Default sidebar provided by the admin module.
 * Shows an "administration" section with users and assets.
 */
const defaultAdminSidebar = {
	sections: [
		{
			id: "administration",
			title: { key: "defaults.sidebar.administration" },
			items: [
				{
					type: "collection",
					collection: "user",
					icon: { type: "icon", props: { name: "ph:users" } },
				},
				{
					type: "collection",
					collection: "assets",
					icon: { type: "icon", props: { name: "ph:image" } },
				},
			],
		},
	],
};

/**
 * Admin module for use with `config({ modules: [admin()] })`.
 *
 * The complete backend for the QUESTPIE admin panel:
 * - User authentication (Better Auth) — from starter dependency
 * - File uploads (assets) — from starter dependency
 * - Saved views for collection filters (named configurations)
 * - User preferences (view state synced across devices)
 * - Setup flow for first admin creation
 *
 * @example
 * ```ts
 * import { config } from "questpie";
 * import { admin } from "@questpie/admin/server";
 *
 * export default config({
 *   modules: [admin({ branding: { name: "My App" } })],
 *   app: { url: process.env.APP_URL! },
 *   db: { url: process.env.DATABASE_URL! },
 *   email: { adapter: new ConsoleAdapter() },
 * });
 * ```
 *
 * @see RFC §13.3 (Admin Module)
 */
export function admin(options?: AdminOptions) {
	// Resolve sidebar callback if needed
	let resolvedSidebar = options?.sidebar ?? defaultAdminSidebar;
	if (typeof resolvedSidebar === "function") {
		const sProxy = {
			sidebar: (cfg: any) => cfg,
			section: (cfg: any) => ({ items: [], ...cfg }),
		};
		// Create a permissive component proxy for sidebar callbacks
		const cProxy = createComponentProxy({} as any);
		resolvedSidebar = resolvedSidebar({ s: sProxy, c: cProxy });
	}

	// Resolve dashboard callback if needed
	let resolvedDashboard = options?.dashboard;
	if (typeof resolvedDashboard === "function") {
		const dProxy = {
			dashboard: (cfg: any) => cfg,
			stats: (cfg: any) => ({ type: "stats" as const, ...cfg }),
			recentItems: (cfg: any) => ({ type: "recentItems" as const, ...cfg }),
			chart: (cfg: any) => ({ type: "chart" as const, ...cfg }),
			value: (cfg: any) => ({ type: "value" as const, ...cfg }),
			table: (cfg: any) => ({ type: "table" as const, ...cfg }),
			timeline: (cfg: any) => ({ type: "timeline" as const, ...cfg }),
			progress: (cfg: any) => ({ type: "progress" as const, ...cfg }),
		};
		const cProxy = createComponentProxy({} as any);
		const aProxy = {
			action: (cfg: any) => cfg,
			link: (cfg: any) => cfg,
			create: ({ collection, ...cfg }: any) => ({
				...cfg,
				href: `/admin/collections/${collection}/create`,
			}),
			global: ({ global: g, ...cfg }: any) => ({
				...cfg,
				href: `/admin/globals/${g}`,
			}),
		};
		resolvedDashboard = resolvedDashboard({
			d: dProxy,
			c: cProxy,
			a: aProxy,
		});
	}

	return module({
		name: "questpie-admin",
		modules: [starter()],
		collections: adminCollections,
		fields: adminFields,
		functions: {
			...setupFunctions,
			...localeFunctions,
			...previewFunctions,
			...adminConfigFunctions,
			...actionFunctions,
			...translationFunctions,
			...widgetDataFunctions,
			...reactiveFunctions,
		},
		listViews: { table: listView("table") },
		editViews: { form: editView("form") },
		components: {
			icon: component("icon"),
			badge: component("badge"),
		},
		sidebar: resolvedSidebar,
		dashboard: resolvedDashboard,
		branding: options?.branding,
		adminLocale: options?.adminLocale,
	});
}
