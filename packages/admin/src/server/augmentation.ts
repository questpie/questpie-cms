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
