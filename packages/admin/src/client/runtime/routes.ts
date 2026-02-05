/**
 * Type-Safe Route Builder
 *
 * Generates type-safe route helpers from admin configuration
 */

import type { Questpie } from "questpie";
import type { CollectionNames, GlobalNames, IconComponent } from "../builder";
import type { Admin } from "../builder/admin";
import type { I18nText } from "../i18n/types";
import { formatLabel } from "../lib/utils";

// ============================================================================
// Route Types
// ============================================================================

/**
 * Collection route helpers
 */
export type CollectionRoutes<TName extends string> = {
	list: () => string;
	create: () => string;
	edit: (id: string) => string;
	view: (id: string) => string;
};

/**
 * Global route helpers
 */
export type GlobalRoutes = {
	edit: () => string;
};

/**
 * Page route helpers
 */
export type PageRoutes = {
	view: () => string;
};

/**
 * All routes for an admin instance
 */
export type AdminRoutes<TApp extends Questpie<any>> = {
	dashboard: () => string;
	collections: {
		[K in CollectionNames<TApp> & string]: CollectionRoutes<K>;
	};
	globals: {
		[K in GlobalNames<TApp> & string]: GlobalRoutes;
	};
	pages: Record<string, PageRoutes>;
	auth: {
		login: () => string;
		logout: () => string;
		forgotPassword: () => string;
		resetPassword: (token: string) => string;
	};
};

// ============================================================================
// Route Builder
// ============================================================================

/**
 * Options for building routes
 */
export type BuildRoutesOptions = {
	/**
	 * Base path for admin routes (default: "/admin")
	 */
	basePath?: string;
};

/**
 * Build type-safe routes from admin configuration
 *
 * @example
 * ```ts
 * import { buildRoutes } from "@questpie/admin/runtime";
 * import { appAdmin } from "./admin";
 *
 * const routes = buildRoutes(appAdmin);
 *
 * // Type-safe route generation
 * routes.dashboard(); // "/admin"
 * routes.collections.posts.list(); // "/admin/collections/posts"
 * routes.collections.posts.edit("123"); // "/admin/collections/posts/123/edit"
 * routes.globals.settings.edit(); // "/admin/globals/settings"
 * ```
 */
export function buildRoutes<TApp extends Questpie<any>>(
	admin: Admin,
	options: BuildRoutesOptions = {},
): AdminRoutes<TApp> {
	const { basePath = "/admin" } = options;

	// Helper to build path
	const path = (...segments: string[]) =>
		[basePath, ...segments].filter(Boolean).join("/");

	// Build collection routes
	const collectionNames = admin.getCollectionNames();
	const collections = {} as AdminRoutes<TApp>["collections"];

	for (const name of collectionNames) {
		(collections as Record<string, CollectionRoutes<string>>)[name] = {
			list: () => path("collections", name),
			create: () => path("collections", name, "create"),
			edit: (id: string) => path("collections", name, id, "edit"),
			view: (id: string) => path("collections", name, id),
		};
	}

	// Build global routes
	const globalNames = admin.getGlobalNames();
	const globals = {} as AdminRoutes<TApp>["globals"];

	for (const name of globalNames) {
		(globals as Record<string, GlobalRoutes>)[name] = {
			edit: () => path("globals", name),
		};
	}

	// Build page routes
	const pageConfigs = admin.getPages();
	const pages: Record<string, PageRoutes> = {};

	for (const [name, config] of Object.entries(pageConfigs)) {
		const pagePath = (config as any).path ?? name;
		pages[name] = {
			view: () =>
				pagePath.startsWith("/") ? pagePath : path("pages", pagePath),
		};
	}

	return {
		dashboard: () => basePath,
		collections,
		globals,
		pages,
		auth: {
			login: () => path("auth", "login"),
			logout: () => path("auth", "logout"),
			forgotPassword: () => path("auth", "forgot-password"),
			resetPassword: (token: string) => path("auth", "reset-password", token),
		},
	};
}

// ============================================================================
// Navigation Builder
// ============================================================================

/**
 * Navigation item (clickable link)
 */
export type NavigationItem = {
	id: string;
	label: I18nText;
	href: string;
	icon?: IconComponent;
	group?: string;
	order?: number;
	type: "collection" | "global" | "page" | "dashboard" | "link";
};

/**
 * Navigation divider (visual separator)
 */
export type NavigationDivider = {
	type: "divider";
};

/**
 * Any navigation element (item or divider)
 */
export type NavigationElement = NavigationItem | NavigationDivider;

/**
 * Navigation group/section
 */
export type NavigationGroup = {
	id?: string;
	label?: I18nText;
	icon?: IconComponent;
	collapsed?: boolean;
	items: NavigationElement[];
};

/**
 * Build navigation structure from admin configuration
 *
 * @example
 * ```ts
 * import { buildNavigation } from "@questpie/admin/runtime";
 * import { appAdmin } from "./admin";
 *
 * const navigation = buildNavigation(appAdmin);
 * // Returns grouped navigation items for sidebar rendering
 * ```
 */
export function buildNavigation<TApp extends Questpie<any>>(
	admin: Admin,
	options: BuildRoutesOptions = {},
): NavigationGroup[] {
	const routes = buildRoutes(admin, options);
	const items: NavigationItem[] = [];

	// Add dashboard
	items.push({
		id: "dashboard",
		label: "Dashboard",
		href: routes.dashboard(),
		icon: undefined, // Icon should be provided via sidebar config
		type: "dashboard",
		order: -1000,
	});

	// Add collections
	for (const [name, config] of Object.entries(admin.getCollections())) {
		// Access meta for new builder state structure
		const meta = config.meta ?? config;
		if ((meta as any).hidden) continue;

		const collectionRoutes = (
			routes.collections as Record<string, CollectionRoutes<string>>
		)[name];
		if (!collectionRoutes) continue;

		items.push({
			id: `collection:${name}`,
			label: resolveLabel((meta as any).label, name),
			href: collectionRoutes.list(),
			icon: resolveIcon((meta as any).icon),
			group: (meta as any).group,
			order: (meta as any).order ?? 0,
			type: "collection",
		});
	}

	// Add globals
	for (const [name, config] of Object.entries(admin.getGlobals())) {
		// Access meta for new builder state structure
		const meta = config.meta ?? config;
		if ((meta as any).hidden) continue;

		const globalRoutes = (routes.globals as Record<string, GlobalRoutes>)[name];
		if (!globalRoutes) continue;

		items.push({
			id: `global:${name}`,
			label: resolveLabel((meta as any).label, name),
			href: globalRoutes.edit(),
			icon: resolveIcon((meta as any).icon),
			group: (meta as any).group,
			order: (meta as any).order ?? 0,
			type: "global",
		});
	}

	// Add pages
	for (const [name, config] of Object.entries(admin.getPages())) {
		if ((config as any).showInNav === false) continue;

		items.push({
			id: `page:${name}`,
			label: resolveLabel((config as any).label, name),
			href: routes.pages[name].view(),
			icon: resolveIcon((config as any).icon),
			group: (config as any).group,
			order: (config as any).order ?? 0,
			type: "page",
		});
	}

	// Group items
	return groupNavigationItems(items, admin);
}

/**
 * Resolve label - passes through I18nText for runtime resolution
 */
function resolveLabel(label: unknown, fallback: string): I18nText {
	// Plain string
	if (typeof label === "string") return label;

	// I18nText object (locale map or translation key) - pass through for runtime resolution
	if (typeof label === "object" && label !== null) {
		return label as I18nText;
	}

	// Capitalize and format fallback
	return formatLabel(fallback);
}

/**
 * Resolve icon to IconComponent
 * Only accepts React components, not strings
 */
function resolveIcon(icon: unknown): IconComponent | undefined {
	// IconComponent is a React component type, not a string
	if (
		typeof icon === "function" ||
		(typeof icon === "object" && icon !== null)
	) {
		return icon as IconComponent;
	}
	return undefined;
}

/**
 * Group navigation items based on sidebar configuration
 */
function groupNavigationItems<TApp extends Questpie<any>>(
	items: NavigationItem[],
	admin: Admin,
): NavigationGroup[] {
	const sidebarConfig = admin.getSidebar();

	// New format: sections with typed items
	if (sidebarConfig.sections?.length) {
		return sidebarConfig.sections.map((section: any) => ({
			id: section.id,
			label: resolveLabel(section.title, ""),
			icon: resolveIcon(section.icon),
			collapsed: section.collapsed,
			items: section.items
				.map((item: any): NavigationElement | undefined => {
					// Handle different item types
					switch (item.type) {
						case "collection": {
							const found = items.find(
								(i) => i.id === `collection:${item.collection}`,
							);
							if (!found) return undefined;
							// Apply overrides from sidebar config
							return {
								...found,
								label: item.label ?? found.label,
								icon: resolveIcon(item.icon) ?? found.icon,
							};
						}

						case "global": {
							const found = items.find((i) => i.id === `global:${item.global}`);
							if (!found) return undefined;
							// Apply overrides from sidebar config
							return {
								...found,
								label: item.label ?? found.label,
								icon: resolveIcon(item.icon) ?? found.icon,
							};
						}

						case "page": {
							const found = items.find((i) => i.id === `page:${item.pageId}`);
							if (!found) return undefined;
							// Apply overrides from sidebar config
							return {
								...found,
								label: item.label ?? found.label,
								icon: resolveIcon(item.icon) ?? found.icon,
							};
						}

						case "link":
							return {
								id: `link:${item.href}`,
								label: resolveLabel(item.label, ""),
								href: item.href,
								icon: resolveIcon(item.icon),
								type: "link" as const,
								order: 0,
							};

						case "divider":
							return { type: "divider" } as NavigationDivider;

						default:
							return undefined;
					}
				})
				.filter(
					(i: NavigationElement | undefined): i is NavigationElement =>
						i !== undefined,
				),
		}));
	}

	// Legacy format: groups (backward compatibility)
	if ((sidebarConfig as any).groups?.length) {
		return (sidebarConfig as any).groups.map((group: any) => ({
			label: resolveLabel(group.label, ""),
			items: group.items
				.map((item: any): NavigationElement | undefined => {
					if (typeof item === "string") {
						// Find by collection/global/page name
						return items.find(
							(i) =>
								i.id === `collection:${item}` ||
								i.id === `global:${item}` ||
								i.id === `page:${item}` ||
								i.id === item,
						);
					}
					// Custom item
					return {
						id: item.id,
						label: resolveLabel(item.label, item.id),
						href: item.href ?? "#",
						icon: resolveIcon(item.icon),
						type: "link" as const,
						order: (item as any).order ?? 0,
					};
				})
				.filter(
					(i: NavigationElement | undefined): i is NavigationElement =>
						i !== undefined,
				),
		}));
	}

	// Auto-group by group property (fallback)
	const groups = new Map<string | undefined, NavigationItem[]>();

	// Sort items by order
	const sortedItems = [...items].sort(
		(a, b) => (a.order ?? 0) - (b.order ?? 0),
	);

	for (const item of sortedItems) {
		const groupKey = item.group;
		if (!groups.has(groupKey)) {
			groups.set(groupKey, []);
		}
		groups.get(groupKey)!.push(item);
	}

	// Convert to array, ungrouped items first
	const result: NavigationGroup[] = [];

	// Add ungrouped items first
	const ungrouped = groups.get(undefined);
	if (ungrouped?.length) {
		result.push({ items: ungrouped });
	}

	// Add grouped items
	for (const [label, groupItems] of groups) {
		if (label === undefined) continue;
		result.push({ label, items: groupItems });
	}

	return result;
}
