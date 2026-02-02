/**
 * Server-Side Type Definitions for Admin Package
 *
 * This file provides type definitions for admin-specific features.
 * The actual methods are added via runtime monkey patching in ./patch.ts.
 *
 * For type-safe usage, use the helper types:
 * - WithAdminMethods<T> - adds admin methods to QuestpieBuilder
 * - WithCollectionAdminMethods<T> - adds admin methods to CollectionBuilder
 * - WithGlobalAdminMethods<T> - adds admin methods to GlobalBuilder
 *
 * @example
 * ```ts
 * import { q } from "questpie";
 * import { adminModule } from "@questpie/admin/server";
 *
 * const cms = q({ name: "my-app" })
 *   .use(adminModule)
 *   .collections({
 *     posts: q.collection("posts")
 *       .fields((f) => ({
 *         title: f.text({ required: true }),
 *       }))
 *       // These methods are added by adminModule at runtime:
 *       .admin(({ c }) => ({
 *         label: { en: "Posts" },
 *         icon: c.icon("ph:article"),
 *       }))
 *       .list(({ v, f }) => v.table({
 *         columns: [f.title],
 *       }))
 *       .form(({ v, f }) => v.form({
 *         fields: [f.title],
 *       })),
 *   });
 * ```
 */

import type { I18nText } from "questpie/shared";

// ============================================================================
// Admin Configuration Types
// ============================================================================

/**
 * Reference to a server-registered component.
 * Used for icons, badges, and other UI elements defined on server.
 *
 * @example
 * ```ts
 * { type: "icon", props: { name: "ph:users" } }
 * ```
 */
export interface ComponentReference<TType extends string = string> {
	type: TType;
	props: Record<string, unknown>;
}

/**
 * View definition for list views (table, cards, etc.)
 */
export interface ListViewDefinition<TName extends string = string> {
	type: "listView";
	name: TName;
}

/**
 * View definition for edit views (form, wizard, etc.)
 */
export interface EditViewDefinition<TName extends string = string> {
	type: "editView";
	name: TName;
}

/**
 * Component definition for reusable UI components
 */
export interface ComponentDefinition<TName extends string = string> {
	type: "component";
	name: TName;
}

// ============================================================================
// Collection Admin Configuration
// ============================================================================

/**
 * Admin metadata for a collection.
 * Defines how the collection appears in the admin sidebar and UI.
 */
export interface AdminCollectionConfig {
	/** Display label for the collection */
	label?: I18nText;
	/** Description shown in tooltips/help text */
	description?: I18nText;
	/** Icon reference (resolved by client's icon component) */
	icon?: ComponentReference<"icon">;
	/** Hide from admin sidebar */
	hidden?: boolean;
	/** Group in sidebar */
	group?: string;
	/** Order within group */
	order?: number;
}

/**
 * List view configuration for a collection.
 * Defines columns, sorting, filtering, and actions.
 */
export interface ListViewConfig {
	/** View type to use (e.g., "table", "cards") */
	view?: string;
	/** Columns to display */
	columns?: FieldReference[];
	/** Default sort configuration */
	defaultSort?: { field: string; direction: "asc" | "desc" };
	/** Searchable fields */
	searchable?: string[];
	/** Filterable fields */
	filterable?: string[];
	/** Actions configuration */
	actions?: {
		header?: { primary?: ActionReference[]; secondary?: ActionReference[] };
		row?: ActionReference[];
		bulk?: ActionReference[];
	};
}

/**
 * Form view configuration for a collection.
 * Defines field layout, sections, and tabs.
 */
export interface FormViewConfig {
	/** View type to use (e.g., "form", "wizard") */
	view?: string;
	/** Fields to include */
	fields?: FieldReference[];
	/** Form sections */
	sections?: FormSection[];
	/** Form tabs */
	tabs?: FormTab[];
}

/**
 * Form section configuration
 */
export interface FormSection {
	/** Section label */
	label?: I18nText;
	/** Section description */
	description?: I18nText;
	/** Fields in this section */
	fields: FieldReference[];
	/** Collapsible section */
	collapsible?: boolean;
	/** Default collapsed state */
	defaultCollapsed?: boolean;
}

/**
 * Form tab configuration
 */
export interface FormTab {
	/** Tab label */
	label: I18nText;
	/** Tab icon */
	icon?: ComponentReference<"icon">;
	/** Sections in this tab */
	sections: FormSection[];
}

/**
 * Preview configuration for a collection.
 * Enables live preview of content.
 */
export interface PreviewConfig {
	/** Enable preview panel */
	enabled?: boolean;
	/** Preview URL builder (runs on server) */
	url?: (ctx: { record: Record<string, unknown>; locale?: string }) => string;
	/** Preview panel position */
	position?: "left" | "right" | "bottom";
	/** Default panel width (percentage) */
	defaultWidth?: number;
}

/**
 * Reference to a field in the collection
 */
export type FieldReference = string;

/**
 * Reference to an action
 */
export type ActionReference = string | { type: string; config?: unknown };

// ============================================================================
// Global Admin Configuration
// ============================================================================

/**
 * Admin metadata for a global.
 */
export interface AdminGlobalConfig {
	/** Display label */
	label?: I18nText;
	/** Description */
	description?: I18nText;
	/** Icon reference */
	icon?: ComponentReference<"icon">;
	/** Hide from admin */
	hidden?: boolean;
	/** Group in sidebar */
	group?: string;
	/** Order within group */
	order?: number;
}

// ============================================================================
// Server-Side Dashboard Configuration
// ============================================================================

/**
 * Server-side dashboard widget configuration.
 * These are serializable and can be sent via introspection API.
 */
export type ServerDashboardWidget =
	| ServerStatsWidget
	| ServerChartWidget
	| ServerRecentItemsWidget
	| ServerQuickActionsWidget
	| ServerCustomWidget;

/**
 * Stats widget - shows count from a collection
 */
export interface ServerStatsWidget {
	type: "stats";
	/** Unique widget ID */
	id?: string;
	/** Widget label */
	label?: I18nText;
	/** Icon reference */
	icon?: ComponentReference<"icon">;
	/** Collection to count */
	collection: string;
	/** Filter to apply */
	filter?: Record<string, unknown>;
	/** Grid span (1-4) */
	span?: number;
}

/**
 * Chart widget - shows data over time
 */
export interface ServerChartWidget {
	type: "chart";
	/** Unique widget ID */
	id?: string;
	/** Widget label */
	label?: I18nText;
	/** Chart type */
	chartType: "line" | "bar" | "area" | "pie";
	/** Collection to query */
	collection: string;
	/** Date field for time series */
	dateField: string;
	/** Time range */
	timeRange?: "7d" | "30d" | "90d" | "1y";
	/** Filter to apply */
	filter?: Record<string, unknown>;
	/** Grid span (1-4) */
	span?: number;
}

/**
 * Recent items widget - shows latest items from a collection
 */
export interface ServerRecentItemsWidget {
	type: "recentItems";
	/** Unique widget ID */
	id?: string;
	/** Widget label */
	label?: I18nText;
	/** Collection to query */
	collection: string;
	/** Date field for ordering */
	dateField: string;
	/** Number of items to show */
	limit?: number;
	/** Filter to apply */
	filter?: Record<string, unknown>;
	/** Grid span (1-4) */
	span?: number;
}

/**
 * Quick actions widget - shows action buttons
 */
export interface ServerQuickActionsWidget {
	type: "quickActions";
	/** Unique widget ID */
	id?: string;
	/** Widget label */
	label?: I18nText;
	/** Actions to display */
	actions: ServerQuickAction[];
	/** Grid span (1-4) */
	span?: number;
}

/**
 * Quick action definition
 */
export interface ServerQuickAction {
	/** Action label */
	label: I18nText;
	/** Action icon */
	icon?: ComponentReference<"icon">;
	/** Action to perform */
	action:
		| { type: "create"; collection: string }
		| { type: "link"; href: string; external?: boolean }
		| { type: "page"; pageId: string };
}

/**
 * Custom widget - rendered by client component
 */
export interface ServerCustomWidget {
	type: "custom";
	/** Unique widget ID (required for custom) */
	id: string;
	/** Widget label */
	label?: I18nText;
	/** Custom widget type name (resolved by client registry) */
	widgetType: string;
	/** Widget props (passed to client component) */
	props?: Record<string, unknown>;
	/** Grid span (1-4) */
	span?: number;
}

/**
 * Dashboard section - groups widgets
 */
export interface ServerDashboardSection {
	type: "section";
	/** Section label */
	label?: I18nText;
	/** Section description */
	description?: I18nText;
	/** Section icon */
	icon?: ComponentReference<"icon">;
	/** Layout mode */
	layout?: "grid" | "stack";
	/** Grid columns */
	columns?: number;
	/** Wrapper style */
	wrapper?: "flat" | "card" | "collapsible";
	/** Default collapsed (for collapsible) */
	defaultCollapsed?: boolean;
	/** Section items */
	items: ServerDashboardItem[];
}

/**
 * Dashboard tabs - tabbed sections
 */
export interface ServerDashboardTabs {
	type: "tabs";
	/** Tabs configuration */
	tabs: ServerDashboardTab[];
	/** Default active tab ID */
	defaultTab?: string;
}

/**
 * Single tab configuration
 */
export interface ServerDashboardTab {
	/** Tab ID */
	id: string;
	/** Tab label */
	label: I18nText;
	/** Tab icon */
	icon?: ComponentReference<"icon">;
	/** Tab items */
	items: ServerDashboardItem[];
}

/**
 * Dashboard layout item
 */
export type ServerDashboardItem =
	| ServerDashboardWidget
	| ServerDashboardSection
	| ServerDashboardTabs;

/**
 * Server-side dashboard configuration
 */
export interface ServerDashboardConfig {
	/** Dashboard title */
	title?: I18nText;
	/** Dashboard description */
	description?: I18nText;
	/** Grid columns (default: 4) */
	columns?: number;
	/** Gap between widgets */
	gap?: number;
	/** Dashboard items */
	items?: ServerDashboardItem[];
	/** Auto-refresh interval in milliseconds */
	refreshInterval?: number;
}

// ============================================================================
// Server-Side Sidebar Configuration
// ============================================================================

/**
 * Server-side sidebar item types
 */
export type ServerSidebarItem =
	| ServerSidebarCollectionItem
	| ServerSidebarGlobalItem
	| ServerSidebarPageItem
	| ServerSidebarLinkItem
	| ServerSidebarDividerItem;

/**
 * Collection item in sidebar
 */
export interface ServerSidebarCollectionItem {
	type: "collection";
	/** Collection name (validated against registered collections) */
	collection: string;
	/** Override display label */
	label?: I18nText;
	/** Override icon */
	icon?: ComponentReference<"icon">;
}

/**
 * Global item in sidebar
 */
export interface ServerSidebarGlobalItem {
	type: "global";
	/** Global name (validated against registered globals) */
	global: string;
	/** Override display label */
	label?: I18nText;
	/** Override icon */
	icon?: ComponentReference<"icon">;
}

/**
 * Custom page item in sidebar
 */
export interface ServerSidebarPageItem {
	type: "page";
	/** Page ID (resolved by client) */
	pageId: string;
	/** Display label */
	label?: I18nText;
	/** Icon */
	icon?: ComponentReference<"icon">;
}

/**
 * External link item in sidebar
 */
export interface ServerSidebarLinkItem {
	type: "link";
	/** Display label */
	label: I18nText;
	/** Link URL */
	href: string;
	/** Icon */
	icon?: ComponentReference<"icon">;
	/** Open in new tab */
	external?: boolean;
}

/**
 * Divider item in sidebar
 */
export interface ServerSidebarDividerItem {
	type: "divider";
}

/**
 * Sidebar section
 */
export interface ServerSidebarSection {
	/** Section ID (for targeting/extending) */
	id: string;
	/** Section title */
	title?: I18nText;
	/** Section icon */
	icon?: ComponentReference<"icon">;
	/** Whether collapsed by default */
	collapsed?: boolean;
	/** Section items */
	items: ServerSidebarItem[];
}

/**
 * Server-side sidebar configuration
 */
export interface ServerSidebarConfig {
	/** Sidebar sections */
	sections: ServerSidebarSection[];
}

// ============================================================================
// Dashboard and Sidebar Context Types
// ============================================================================

/**
 * Context for dashboard config function
 */
export interface DashboardConfigContext {
	/** Dashboard builder helpers */
	d: {
		/** Create dashboard config */
		dashboard: (config: ServerDashboardConfig) => ServerDashboardConfig;
		/** Create a section */
		section: (
			config: Omit<ServerDashboardSection, "type">,
		) => ServerDashboardSection;
		/** Create tabs */
		tabs: (config: Omit<ServerDashboardTabs, "type">) => ServerDashboardTabs;
		/** Create a stats widget */
		stats: (config: Omit<ServerStatsWidget, "type">) => ServerStatsWidget;
		/** Create a chart widget */
		chart: (config: Omit<ServerChartWidget, "type">) => ServerChartWidget;
		/** Create a recent items widget */
		recentItems: (
			config: Omit<ServerRecentItemsWidget, "type">,
		) => ServerRecentItemsWidget;
		/** Create a quick actions widget */
		quickActions: (
			config: Omit<ServerQuickActionsWidget, "type">,
		) => ServerQuickActionsWidget;
		/** Create a custom widget */
		custom: (config: Omit<ServerCustomWidget, "type">) => ServerCustomWidget;
	};
	/** Component helpers */
	c: {
		icon: (name: string) => ComponentReference<"icon">;
	};
}

/**
 * Context for sidebar config function
 */
export interface SidebarConfigContext {
	/** Sidebar builder helpers */
	s: {
		/** Create sidebar config */
		sidebar: (config: ServerSidebarConfig) => ServerSidebarConfig;
		/** Create a section */
		section: (
			config: Omit<ServerSidebarSection, "items"> & {
				items?: ServerSidebarItem[];
			},
		) => ServerSidebarSection;
	};
	/** Component helpers */
	c: {
		icon: (name: string) => ComponentReference<"icon">;
	};
}

// ============================================================================
// Admin Builder Context Types
// ============================================================================

/**
 * Context for admin config functions with component proxy
 */
export interface AdminConfigContext {
	c: {
		/** Create an icon reference */
		icon: (name: string) => ComponentReference<"icon">;
		/** Create a badge reference */
		badge: (props: {
			text: string;
			color?: string;
		}) => ComponentReference<"badge">;
	};
}

/**
 * Context for list view config functions
 */
export interface ListViewConfigContext<
	TFields extends Record<string, any> = Record<string, any>,
> {
	/** View factory */
	v: {
		table: (config: Omit<ListViewConfig, "view">) => ListViewConfig;
		cards: (config: Omit<ListViewConfig, "view">) => ListViewConfig;
	};
	/** Field reference proxy - returns field names as strings */
	f: { [K in keyof TFields]: K };
	/** Action reference proxy */
	a: {
		create: string;
		save: string;
		delete: string;
		deleteMany: string;
		duplicate: string;
		export: string;
		custom: (
			name: string,
			config?: unknown,
		) => { type: string; config?: unknown };
	};
}

/**
 * Context for form view config functions
 */
export interface FormViewConfigContext<
	TFields extends Record<string, any> = Record<string, any>,
> {
	/** View factory */
	v: {
		form: (config: Omit<FormViewConfig, "view">) => FormViewConfig;
		wizard: (config: Omit<FormViewConfig, "view">) => FormViewConfig;
	};
	/** Field reference proxy - returns field names as strings */
	f: { [K in keyof TFields]: K };
}

// ============================================================================
// Admin Builder Methods Type (for type-safe usage)
// ============================================================================

/**
 * Admin methods added to QuestpieBuilder via monkey patching.
 * Use with type assertion when you need type safety:
 *
 * @example
 * ```ts
 * import type { WithAdminMethods } from "@questpie/admin/server";
 *
 * const builder = q({ name: "app" }).use(adminModule) as WithAdminMethods<typeof q>;
 * builder.listView("table"); // now has type support
 * ```
 */
export interface QuestpieBuilderAdminMethods {
	/** Create a list view definition */
	listView<TName extends string>(
		name: TName,
		config?: Record<string, unknown>,
	): ListViewDefinition<TName>;

	/** Create an edit view definition */
	editView<TName extends string>(
		name: TName,
		config?: Record<string, unknown>,
	): EditViewDefinition<TName>;

	/** Create a component definition */
	component<TName extends string>(
		name: TName,
		config?: Record<string, unknown>,
	): ComponentDefinition<TName>;

	/** Register list views */
	listViews<TViews extends Record<string, ListViewDefinition>>(
		views: TViews,
	): this;

	/** Register edit views */
	editViews<TViews extends Record<string, EditViewDefinition>>(
		views: TViews,
	): this;

	/** Register components */
	components<TComponents extends Record<string, ComponentDefinition>>(
		components: TComponents,
	): this;

	/**
	 * Configure the admin dashboard.
	 *
	 * @example
	 * ```ts
	 * .dashboard(({ d, c }) => d.dashboard({
	 *   title: { en: "Dashboard" },
	 *   items: [
	 *     d.section({
	 *       label: { en: "Overview" },
	 *       items: [
	 *         d.stats({ collection: "users", label: { en: "Total Users" } }),
	 *         d.chart({ collection: "posts", chartType: "line", dateField: "createdAt" }),
	 *       ],
	 *     }),
	 *   ],
	 * }))
	 * ```
	 */
	dashboard(
		configFn: (ctx: DashboardConfigContext) => ServerDashboardConfig,
	): this;

	/**
	 * Configure the admin sidebar.
	 *
	 * @example
	 * ```ts
	 * .sidebar(({ s, c }) => s.sidebar({
	 *   sections: [
	 *     s.section({
	 *       id: "content",
	 *       title: { en: "Content" },
	 *       icon: c.icon("ph:files"),
	 *       items: [
	 *         { type: "collection", collection: "posts" },
	 *         { type: "collection", collection: "pages" },
	 *       ],
	 *     }),
	 *   ],
	 * }))
	 * ```
	 */
	sidebar(configFn: (ctx: SidebarConfigContext) => ServerSidebarConfig): this;
}

/**
 * Admin methods added to CollectionBuilder via monkey patching.
 */
export interface CollectionBuilderAdminMethods<
	TFields extends Record<string, any> = Record<string, any>,
> {
	/**
	 * Set admin metadata for the collection.
	 */
	admin(
		configOrFn:
			| AdminCollectionConfig
			| ((ctx: AdminConfigContext) => AdminCollectionConfig),
	): this;

	/**
	 * Configure list view for the collection.
	 */
	list(configFn: (ctx: ListViewConfigContext<TFields>) => ListViewConfig): this;

	/**
	 * Configure form view for the collection.
	 */
	form(configFn: (ctx: FormViewConfigContext<TFields>) => FormViewConfig): this;

	/**
	 * Configure preview for the collection.
	 */
	preview(config: PreviewConfig): this;
}

/**
 * Admin methods added to GlobalBuilder via monkey patching.
 */
export interface GlobalBuilderAdminMethods<
	TFields extends Record<string, any> = Record<string, any>,
> {
	/**
	 * Set admin metadata for the global.
	 */
	admin(
		configOrFn:
			| AdminGlobalConfig
			| ((ctx: AdminConfigContext) => AdminGlobalConfig),
	): this;

	/**
	 * Configure form view for the global.
	 */
	form(configFn: (ctx: FormViewConfigContext<TFields>) => FormViewConfig): this;
}

/**
 * Type helper to add admin methods to a QuestpieBuilder type.
 *
 * @example
 * ```ts
 * const builder = q({ name: "app" }).use(adminModule) as WithAdminMethods<typeof q>;
 * ```
 */
export type WithAdminMethods<T> = T & QuestpieBuilderAdminMethods;

/**
 * Type helper to add admin methods to a CollectionBuilder type.
 */
export type WithCollectionAdminMethods<
	T,
	TFields extends Record<string, any> = Record<string, any>,
> = T & CollectionBuilderAdminMethods<TFields>;

/**
 * Type helper to add admin methods to a GlobalBuilder type.
 */
export type WithGlobalAdminMethods<
	T,
	TFields extends Record<string, any> = Record<string, any>,
> = T & GlobalBuilderAdminMethods<TFields>;
