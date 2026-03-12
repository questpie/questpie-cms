/**
 * Shared Form Layout Types
 *
 * Types used by both collection and global introspection for form views.
 * Extracted to avoid duplication between the two introspection modules.
 */

import type { I18nText } from "#questpie/shared/i18n/types.js";

/**
 * Reactive field config for form views.
 * These are evaluated server-side and results sent to the client.
 */
export interface FormFieldReactiveConfig {
	/** Hide field based on form data */
	hidden?: boolean | { deps: string[] };
	/** Make field read-only based on form data */
	readOnly?: boolean | { deps: string[] };
	/** Disable field based on form data */
	disabled?: boolean | { deps: string[] };
	/** Auto-compute field value from other fields */
	compute?: {
		deps: string[];
		debounce?: number;
	};
}

/**
 * Form field entry - either a simple field name or field with reactive config.
 *
 * @example Simple field
 * ```ts
 * f.name  // resolves to "name"
 * ```
 *
 * @example Field with reactive config
 * ```ts
 * { field: f.slug, compute: { deps: ["title"], debounce: 300 } }
 * { field: f.reason, hidden: { deps: ["status"] } }
 * ```
 */
export type FormFieldEntry =
	| string
	| ({
			/** Field name (use f.fieldName proxy) */
			field: string;
	  } & FormFieldReactiveConfig);

/**
 * Form section layout for form views.
 */
export interface FormSectionLayout {
	type: "section";
	/** Section label */
	label?: I18nText;
	/** Section description */
	description?: I18nText;
	/** Visual wrapper mode */
	wrapper?: "flat" | "collapsible";
	/** Default collapsed state (for collapsible wrapper) */
	defaultCollapsed?: boolean;
	/** Field arrangement mode */
	layout?: "stack" | "inline" | "grid";
	/** Number of columns (for grid layout) */
	columns?: number;
	/** Custom gap (in quarter rems) */
	gap?: number;
	/** Fields in this section */
	fields: FieldLayoutItem[];
	/** Conditional visibility */
	hidden?: boolean;
	/** Custom CSS class */
	className?: string;
}

/**
 * Tab configuration for tabbed form views.
 */
export interface FormTabConfig {
	/** Unique tab identifier */
	id: string;
	/** Tab label */
	label: I18nText;
	/** Tab icon */
	icon?: { type: string; props: Record<string, unknown> };
	/** Fields in this tab */
	fields: FieldLayoutItem[];
	/** Conditional visibility */
	hidden?: boolean;
}

/**
 * Tabs layout for form views.
 */
export interface FormTabsLayout {
	type: "tabs";
	tabs: FormTabConfig[];
}

/**
 * Field layout item - union of field reference or layout container.
 */
export type FieldLayoutItem =
	| string
	| FormFieldEntry
	| FormSectionLayout
	| FormTabsLayout;

/**
 * Form sidebar configuration.
 */
export interface FormSidebarConfig {
	/** Sidebar position (default: "right") */
	position?: "left" | "right";
	/** Fields in the sidebar */
	fields: FieldLayoutItem[];
}
