/**
 * QA Namespace
 *
 * Main entry point for admin builder API.
 */

import { AdminBuilder } from "./admin-builder";
import { block } from "./block/block-builder";
import { collection } from "./collection/collection";
import { field } from "./field/field";
import { global } from "./global/global";
import { page } from "./page/page";
import {
	type SidebarBuilder,
	sidebar as sidebarBuilder,
} from "./sidebar/sidebar-builder";
import type {
	BrandingConfig,
	DashboardConfig,
	SidebarConfig,
} from "./types/ui-config";
import { editView, listView } from "./view/view";
import { widget } from "./widget/widget";

/**
 * Create admin builder (starts empty)
 *
 * @example
 * ```ts
 * // Without backend types
 * const admin = qa().use(coreAdminModule);
 *
 * // With backend types for autocomplete
 * import type { AppCMS } from './server/cms';
 * const admin = qa<AppCMS>().use(coreAdminModule);
 * ```
 */
function qaFactory<TApp = any>() {
	return AdminBuilder.empty<TApp>();
}

// ============================================================================
// Config Helper Functions
// ============================================================================

/**
 * Create a sidebar builder or validate a sidebar config
 *
 * @example
 * ```ts
 * // Builder pattern (recommended)
 * const sidebar = qa.sidebar()
 *   .section("content", s => s
 *     .title("Content")
 *     .items([
 *       { type: "collection", collection: "posts" },
 *     ])
 *   )
 *
 * // Config object pattern (simpler cases)
 * const sidebar = qa.sidebar({
 *   sections: [
 *     { id: "content", title: "Content", items: [...] }
 *   ]
 * })
 * ```
 */
function sidebar<TApp = any>(): SidebarBuilder<never, TApp>;
function sidebar<T extends SidebarConfig>(config: T): T;
function sidebar<TApp = any, T extends SidebarConfig = SidebarConfig>(
	config?: T,
): SidebarBuilder<never, TApp> | T {
	if (config === undefined) {
		return sidebarBuilder<TApp>();
	}
	return config;
}

/**
 * Define dashboard configuration with type safety
 *
 * @example
 * ```ts
 * import { qa } from "@questpie/admin/builder";
 *
 * export const dashboardConfig = qa.dashboard({
 *   layout: "grid",
 *   widgets: [],
 * });
 * ```
 */
function dashboard<T extends DashboardConfig>(config: T): T {
	return config;
}

/**
 * Define branding configuration with type safety
 *
 * @example
 * ```ts
 * import { qa } from "@questpie/admin/builder";
 *
 * export const brandingConfig = qa.branding({
 *   name: "My Admin",
 *   primaryColor: "#3b82f6",
 * });
 * ```
 */
function branding<T extends BrandingConfig>(config: T): T {
	return config;
}

/**
 * QA namespace with helpers
 */
export const qa = Object.assign(qaFactory, {
	// Primitive definition helpers (for advanced use)
	field,
	listView,
	editView,
	widget,
	page,

	// Standalone factories (for use outside builder context)
	collection,
	global,
	block,

	// Config helpers
	sidebar,
	dashboard,
	branding,
});
