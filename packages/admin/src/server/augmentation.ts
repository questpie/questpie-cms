/**
 * Server-Side Module Augmentation for questpie package
 *
 * This file augments questpie builder types to add admin-specific
 * state and methods. This enables server-side admin configuration
 * without modifying the core questpie package.
 *
 * Augmentation happens at multiple levels:
 * 1. QuestpieBuilderState - stores registered views/components
 * 2. CollectionBuilderState - stores admin config for collections
 * 3. GlobalBuilderState - stores admin config for globals
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
 *       // These methods are added by adminModule augmentation:
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

import "questpie";
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
// Module Augmentation - Builder States
// ============================================================================

declare module "questpie" {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. QUESTPIE BUILDER STATE - for views/components registry
	// ─────────────────────────────────────────────────────────────────────────

	interface QuestpieBuilderState {
		/** Registered list view types */
		listViews?: Record<string, ListViewDefinition>;
		/** Registered edit view types */
		editViews?: Record<string, EditViewDefinition>;
		/** Registered component types */
		components?: Record<string, ComponentDefinition>;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 2. COLLECTION BUILDER STATE - for admin config
	// ─────────────────────────────────────────────────────────────────────────

	interface CollectionBuilderState {
		/** Admin metadata (label, icon, description, etc.) */
		admin?: AdminCollectionConfig;
		/** List view configuration */
		adminList?: ListViewConfig;
		/** Form view configuration */
		adminForm?: FormViewConfig;
		/** Preview configuration */
		adminPreview?: PreviewConfig;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 3. GLOBAL BUILDER STATE - for admin config
	// ─────────────────────────────────────────────────────────────────────────

	interface GlobalBuilderState {
		/** Admin metadata */
		admin?: AdminGlobalConfig;
		/** Form view configuration */
		adminForm?: FormViewConfig;
	}
}

// Types are already exported at their definitions above
