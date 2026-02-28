/**
 * Admin Codegen Plugin
 *
 * Declares admin-specific file conventions and builder extensions.
 * Register in questpie.config.ts:
 *
 * ```ts
 * import { runtimeConfig } from "questpie";
 * import { adminPlugin } from "@questpie/admin/server";
 *
 * export default runtimeConfig({
 *   plugins: [adminPlugin()],
 *   db: { url: process.env.DATABASE_URL! },
 * });
 * ```
 *
 * @see RFC-PLUGIN-SYSTEM.md
 */

import type { CodegenPlugin } from "questpie";
import { generateAdminClientTemplate } from "./codegen/admin-client-template.js";

/**
 * Admin codegen plugin.
 *
 * Discovers admin-specific file conventions:
 * - `views/*.ts` — custom view definitions (list, edit, etc.)
 * - `components/*.ts` — component definitions with typed props
 * - `blocks/*.ts` — visual block editor blocks
 * - `sidebar.ts` — sidebar contribution
 * - `dashboard.ts` — dashboard contribution
 * - `branding.ts` — admin branding config
 * - `admin-locale.ts` — admin UI locale config
 *
 * Extends collection/global builders with:
 * - `.admin()` — admin config (label, icon, group, etc.)
 * - `.list()` — list view config (columns, sort, filter, etc.)
 * - `.form()` — form view config (fields, sidebar, tabs, etc.)
 * - `.preview()` — live preview config
 * - `.actions()` — custom actions config
 */
export function adminPlugin(): CodegenPlugin {
	return {
		name: "questpie-admin",
		targets: {
			server: {
				root: ".",
				outputFile: "index.ts",
				discover: {
					views: "views/*.ts",
					components: "components/*.ts",
					blocks: "blocks/*.ts",
					sidebar: "sidebar.ts",
					dashboard: "dashboard.ts",
					branding: "branding.ts",
					adminLocale: "admin-locale.ts",
				},
				registries: {
					moduleRegistries: {
						views: {
							placeholder: "$VIEW_NAMES",
							registryKey: "views",
						},
						listViews: {
							placeholder: "$LIST_VIEW_NAMES",
							recordPlaceholder: "$LIST_VIEWS",
							registryKey: "listViews",
						},
						editViews: {
							placeholder: "$EDIT_VIEW_NAMES",
							recordPlaceholder: "$EDIT_VIEWS",
							registryKey: "editViews",
						},
						components: {
							placeholder: "$COMPONENT_NAMES",
							recordPlaceholder: "$COMPONENTS",
							registryKey: "components",
							typeRegistry: {
								module: "@questpie/admin/server",
								interface: "ComponentTypeRegistry",
							},
						},
					},
					collectionExtensions: {
						admin: {
							stateKey: "admin",
							imports: [
								{
									name: "AdminCollectionConfig",
									from: "@questpie/admin/server",
								},
								{
									name: "AdminConfigContext",
									from: "@questpie/admin/server",
								},
								{
									name: "createComponentProxy",
									from: "@questpie/admin/server",
								},
							],
							configType:
								"AdminCollectionConfig | ((ctx: AdminConfigContext<$COMPONENTS>) => AdminCollectionConfig)",
							isCallback: true,
							callbackContextParams: ["c"],
						},
						list: {
							stateKey: "adminList",
							imports: [
								{
									name: "ListViewConfig",
									from: "@questpie/admin/server",
								},
								{
									name: "ListViewConfigContext",
									from: "@questpie/admin/server",
								},
								{
									name: "createViewProxy",
									from: "@questpie/admin/server",
								},
								{
									name: "createFieldProxy",
									from: "@questpie/admin/server",
								},
								{
									name: "createActionProxy",
									from: "@questpie/admin/server",
								},
							],
							configType:
								"(ctx: ListViewConfigContext<TState extends { fieldDefinitions: infer F extends Record<string, any> } ? F : Record<string, any>, $LIST_VIEWS>) => ListViewConfig",
							isCallback: true,
							callbackContextParams: ["v", "f", "a"],
						},
						form: {
							stateKey: "adminForm",
							imports: [
								{
									name: "FormViewConfig",
									from: "@questpie/admin/server",
								},
								{
									name: "FormViewConfigContext",
									from: "@questpie/admin/server",
								},
							],
							configType:
								"(ctx: FormViewConfigContext<TState extends { fieldDefinitions: infer F extends Record<string, any> } ? F : Record<string, any>, $EDIT_VIEWS>) => FormViewConfig",
							isCallback: true,
							callbackContextParams: ["v", "f"],
						},
						preview: {
							stateKey: "adminPreview",
							imports: [
								{
									name: "PreviewConfig",
									from: "@questpie/admin/server",
								},
							],
							configType: "PreviewConfig",
						},
						actions: {
							stateKey: "adminActions",
							imports: [
								{
									name: "ServerActionsConfig",
									from: "@questpie/admin/server",
								},
								{
									name: "ActionsConfigContext",
									from: "@questpie/admin/server",
								},
							],
							configType:
								"(ctx: ActionsConfigContext<Record<string, unknown>, $COMPONENTS>) => ServerActionsConfig",
							isCallback: true,
							callbackContextParams: ["a", "c", "f"],
						},
					},
					globalExtensions: {
						admin: {
							stateKey: "admin",
							imports: [
								{
									name: "AdminGlobalConfig",
									from: "@questpie/admin/server",
								},
								{
									name: "AdminConfigContext",
									from: "@questpie/admin/server",
								},
							],
							configType:
								"AdminGlobalConfig | ((ctx: AdminConfigContext<$COMPONENTS>) => AdminGlobalConfig)",
							isCallback: true,
							callbackContextParams: ["c"],
						},
						form: {
							stateKey: "adminForm",
							imports: [
								{
									name: "FormViewConfig",
									from: "@questpie/admin/server",
								},
								{
									name: "FormViewConfigContext",
									from: "@questpie/admin/server",
								},
							],
							configType:
								"(ctx: FormViewConfigContext<TState extends { fieldDefinitions: infer F extends Record<string, any> } ? F : Record<string, any>, $EDIT_VIEWS>) => FormViewConfig",
							isCallback: true,
							callbackContextParams: ["v", "f"],
						},
					},
					singletonFactories: {
						branding: {
							configType: "ServerBrandingConfig",
							imports: [
								{
									name: "ServerBrandingConfig",
									from: "@questpie/admin/server",
								},
							],
						},
						adminLocale: {
							configType: "AdminLocaleConfig",
							imports: [
								{
									name: "AdminLocaleConfig",
									from: "@questpie/admin/server",
								},
							],
						},
						sidebar: {
							configType: "SidebarContribution",
							imports: [
								{
									name: "SidebarContribution",
									from: "@questpie/admin/server",
								},
							],
							isCallback: true,
						},
						dashboard: {
							configType: "DashboardContribution",
							imports: [
								{
									name: "DashboardContribution",
									from: "@questpie/admin/server",
								},
							],
							isCallback: true,
						},
					},
				},
				transform(ctx) {
					// Derive listViews/editViews from discovered views.
					const viewFiles = ctx.categories.get("views");
					if (viewFiles && viewFiles.size > 0) {
						ctx.addImport("{ filterViewsByKind }", "@questpie/admin/server");

						const viewVarNames = [...viewFiles.values()]
							.sort((a, b) => a.key.localeCompare(b.key))
							.map((f) => `${f.key}: ${f.varName}`);
						const viewsObj = `{ ${viewVarNames.join(", ")} }`;

						ctx.addRuntimeCode(
							`listViews: filterViewsByKind(${viewsObj}, "list"),`,
						);
						ctx.addRuntimeCode(
							`editViews: filterViewsByKind(${viewsObj}, "edit"),`,
						);
					}

					// Ensure dashboard exists as empty array when no dashboard.ts found
					if (!ctx.singles.has("dashboard")) {
						ctx.addRuntimeCode("dashboard: [] as const,");
					}
				},
				callbackParams: {
					v: {
						proxyCode:
							"new Proxy({}, { get: (_, prop) => (config: any) => ({ view: String(prop), ...config }) })",
					},
					c: {
						proxyCode:
							'new Proxy({}, { get: (_, prop) => (...args: any[]) => ({ type: String(prop), props: typeof args[0] === "string" ? { name: args[0] } : args[0] ?? {} }) })',
					},
					a: {
						proxyCode:
							"new Proxy({ custom: (name: string, config: any) => ({ id: name, ...config }) }, { get: (target, prop) => (target as any)[prop] ?? String(prop) })",
					},
				},
			},

			// ── admin-client target ──────────────────────────────────
			// Discovers client-side admin files (blocks, views, components,
			// fields, pages, widgets) and generates a pre-built admin config.
			"admin-client": {
				root: "../admin",
				outputFile: "client.ts",

				categories: {
					blocks: {
						dirs: ["blocks"],
						prefix: "block",
						registryKey: false,
						includeInAppState: false,
						extractFromModules: false,
					},
					views: {
						dirs: ["views"],
						prefix: "view",
						registryKey: false,
						includeInAppState: false,
						extractFromModules: false,
					},
					components: {
						dirs: ["components"],
						prefix: "comp",
						registryKey: false,
						includeInAppState: false,
						extractFromModules: false,
					},
					fields: {
						dirs: ["fields"],
						prefix: "fld",
						registryKey: false,
						includeInAppState: false,
						extractFromModules: false,
					},
					pages: {
						dirs: ["pages"],
						prefix: "pg",
						registryKey: false,
						includeInAppState: false,
						extractFromModules: false,
					},
					widgets: {
						dirs: ["widgets"],
						prefix: "wgt",
						registryKey: false,
						includeInAppState: false,
						extractFromModules: false,
					},
				},

				discover: {
					locale: "locale.ts",
					translations: "translations.ts",
					defaults: "defaults.ts",
				},

				generate: (ctx) => generateAdminClientTemplate(ctx),
			},
		},
	};
}
