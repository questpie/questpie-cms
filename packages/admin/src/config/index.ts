import type { QCMS } from "@questpie/cms/server";

/**
 * I18n text can be a string, translation key object, or function
 */
export type I18nText =
	| string
	| { key: string; default?: string }
	| ((ctx: AdminI18nContext) => string);

/**
 * I18n context for translation and formatting
 */
export type AdminI18nContext = {
	locale: string;
	dir: "ltr" | "rtl";
	t: (key: string, vars?: Record<string, unknown>, fallback?: string) => string;
	formatDate: (v: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
	formatNumber: (v: number, opts?: Intl.NumberFormatOptions) => string;
};

/**
 * Icon reference (component or icon name)
 */
export type IconRef = React.ComponentType<{ className?: string }> | string;

/**
 * Component reference (React component)
 */
export type ComponentRef<TProps = any> = React.ComponentType<TProps>;

/**
 * Dashboard widget configuration
 */
export type DashboardWidget = {
	/**
	 * Widget ID
	 */
	id: string;

	/**
	 * Widget type (for built-in widgets) or component (for custom)
	 */
	type?: "stats" | "chart" | "recent-items" | "quick-actions" | "custom";

	/**
	 * Custom component
	 */
	component?: ComponentRef;

	/**
	 * Widget title
	 */
	title?: string;

	/**
	 * Widget description
	 */
	description?: string;

	/**
	 * Grid position
	 */
	position?: {
		x: number;
		y: number;
		w: number; // width in grid units
		h: number; // height in grid units
	};

	/**
	 * Widget configuration (varies by type)
	 */
	config?: any;
};

/**
 * Dashboard configuration
 */
export type DashboardConfig = {
	/**
	 * Dashboard title
	 */
	title?: string;

	/**
	 * Dashboard description
	 */
	description?: string;

	/**
	 * Widgets to display
	 */
	widgets?: DashboardWidget[];

	/**
	 * Grid columns (default: 12)
	 */
	columns?: number;

	/**
	 * Row height in pixels (default: 80)
	 */
	rowHeight?: number;

	/**
	 * Allow users to customize layout
	 */
	customizable?: boolean;

	/**
	 * Custom dashboard component (overrides widgets)
	 */
	component?: ComponentRef;
};

/**
 * Custom page configuration
 */
export type CustomPageConfig = {
	/**
	 * Page ID (used in routing)
	 */
	id: string;

	/**
	 * Page label (shown in sidebar)
	 */
	label: string;

	/**
	 * Icon
	 */
	icon?: IconRef;

	/**
	 * Page path (e.g., "/admin/settings")
	 */
	path: string;

	/**
	 * Page component
	 */
	component: ComponentRef;

	/**
	 * Show in sidebar navigation
	 */
	showInNav?: boolean;

	/**
	 * Navigation group
	 */
	group?: string;

	/**
	 * Navigation order
	 */
	order?: number;

	/**
	 * Required permissions
	 */
	permissions?: string[];
};

/**
 * Admin app configuration
 */
export type AdminAppConfig = {
	brand?: {
		name?: I18nText;
		logo?: ComponentRef;
		homeRoute?: string;
	};
	locales?: {
		default: string;
		available: string[];
	};
	preview?: {
		enabled?: boolean;
		route?: string;
	};
	debug?: {
		showQueryDevtools?: boolean;
		showRouterDevtools?: boolean;
	};
	/**
	 * Dashboard configuration
	 */
	dashboard?: DashboardConfig;

	/**
	 * Custom pages
	 */
	pages?: CustomPageConfig[];
};

/**
 * List view configuration
 */
export type ListConfig = {
	/**
	 * Columns to display by default
	 */
	defaultColumns?: string[];

	/**
	 * Default sort configuration
	 */
	defaultSort?: {
		field: string;
		direction: "asc" | "desc";
	};

	/**
	 * Relations to eager-load with the list
	 */
	with?: string[];

	/**
	 * Items per page
	 */
	pageSize?: number;

	/**
	 * Enable search
	 */
	searchable?: boolean;

	/**
	 * Searchable fields
	 */
	searchFields?: string[];
};

/**
 * Layout types for sections
 */
export type SectionLayout =
	| "auto" // Automatic vertical stack
	| "columns" // Multi-column layout
	| "grid" // CSS grid layout
	| "inline"; // Horizontal inline layout

/**
 * Field layout configuration
 */
export type FieldLayout = {
	/**
	 * Field name
	 */
	field: string;

	/**
	 * Column span (e.g., "1", "2", "full", "1/2", "2/3")
	 */
	span?: string | number;

	/**
	 * Row span
	 */
	rowSpan?: number;

	/**
	 * Custom width (e.g., "200px", "50%", "auto")
	 */
	width?: string;
};

/**
 * Section configuration
 */
export type SectionConfig = {
	/**
	 * Section title
	 */
	title?: string;

	/**
	 * Section description
	 */
	description?: string;

	/**
	 * Fields in this section (simple array or advanced layout)
	 */
	fields: string[] | FieldLayout[];

	/**
	 * Layout type
	 */
	layout?: SectionLayout;

	/**
	 * Number of columns (for "columns" layout)
	 */
	columns?: number;

	/**
	 * Grid configuration (for "grid" layout)
	 */
	grid?: {
		/**
		 * Number of columns in grid
		 */
		columns: number;

		/**
		 * Gap between items (in tailwind spacing units)
		 */
		gap?: number;

		/**
		 * Responsive breakpoints
		 */
		responsive?: {
			sm?: number; // columns at sm breakpoint
			md?: number; // columns at md breakpoint
			lg?: number; // columns at lg breakpoint
		};
	};

	/**
	 * Is collapsible
	 */
	collapsible?: boolean;

	/**
	 * Default open state (if collapsible)
	 */
	defaultOpen?: boolean;

	/**
	 * Conditional visibility
	 */
	visible?: boolean | ((values: any) => boolean);

	/**
	 * Custom CSS class
	 */
	className?: string;
};

/**
 * Tab configuration
 */
export type TabConfig = {
	/**
	 * Tab ID
	 */
	id: string;

	/**
	 * Tab label
	 */
	label: string;

	/**
	 * Icon (optional)
	 */
	icon?: string;

	/**
	 * Sections within this tab
	 */
	sections?: SectionConfig[];

	/**
	 * Or simple field list
	 */
	fields?: string[];

	/**
	 * Conditional visibility
	 */
	visible?: boolean | ((values: any) => boolean);
};

/**
 * Edit/Create form configuration
 */
export type EditConfig = {
	/**
	 * Field order and visibility (auto-detected if not specified)
	 */
	fields?: string[];

	/**
	 * Fields to exclude from form
	 */
	exclude?: string[];

	/**
	 * Group fields into sections
	 */
	sections?: SectionConfig[];

	/**
	 * Organize into tabs
	 */
	tabs?: TabConfig[];

	/**
	 * Sidebar fields (meta info)
	 */
	sidebar?: {
		/**
		 * Fields to show in sidebar
		 */
		fields: string[];

		/**
		 * Sidebar position
		 */
		position?: "right" | "left";

		/**
		 * Sidebar width
		 */
		width?: string;
	};

	/**
	 * Main content layout (when sidebar is present)
	 */
	layout?: "full" | "with-sidebar";

	/**
	 * Show version history
	 */
	showVersionHistory?: boolean;

	/**
	 * Enable draft mode
	 */
	enableDrafts?: boolean;
};

/**
 * Field configuration
 */
export type FieldConfig = {
	/**
	 * Field label
	 */
	label?: string;

	/**
	 * Field description
	 */
	description?: string;

	/**
	 * Placeholder text
	 */
	placeholder?: string;

	/**
	 * Helper text
	 */
	helperText?: string;

	/**
	 * Custom component (from registry or inline)
	 */
	component?: string | React.ComponentType<any>;

	/**
	 * Conditional visibility
	 */
	visible?: boolean | ((values: any) => boolean);

	/**
	 * Hide field entirely
	 */
	hidden?: boolean;

	/**
	 * Conditional readonly
	 */
	readOnly?: boolean | ((values: any) => boolean);

	/**
	 * Conditional disabled
	 */
	disabled?: boolean | ((values: any) => boolean);

	/**
	 * Field type override
	 */
	type?: string;

	/**
	 * Localized (i18n) field
	 */
	localized?: boolean;

	/**
	 * Is required
	 */
	required?: boolean | ((values: any) => boolean);

	/**
	 * Options for select/enum fields
	 */
	options?:
		| Array<{ label: string; value: any }>
		| ((values: any) => Array<{ label: string; value: any }>);

	/**
	 * Array field configuration
	 */
	array?: {
		/**
		 * Item type
		 */
		itemType?: "text" | "number" | "email" | "textarea" | "select";

		/**
		 * Options for select items
		 */
		options?: Array<{ label: string; value: any }>;

		/**
		 * Enable ordering
		 */
		orderable?: boolean;

		/**
		 * Minimum number of items
		 */
		minItems?: number;

		/**
		 * Maximum number of items
		 */
		maxItems?: number;

		/**
		 * Placeholder for item input
		 */
		placeholder?: string;
	};

	/**
	 * Rich text editor configuration
	 */
	richText?: {
		/**
		 * Output format
		 */
		outputFormat?: "json" | "html" | "markdown";

		/**
		 * Enable image uploads
		 */
		enableImages?: boolean;

		/**
		 * Max character limit
		 */
		maxCharacters?: number;

		/**
		 * Show character count
		 */
		showCharacterCount?: boolean;

		/**
		 * Custom Tiptap extensions
		 */
		extensions?: any[];

		/**
		 * Feature toggles
		 */
		features?: {
			toolbar?: boolean;
			bubbleMenu?: boolean;
			slashCommands?: boolean;
			history?: boolean;
			heading?: boolean;
			bold?: boolean;
			italic?: boolean;
			underline?: boolean;
			strike?: boolean;
			code?: boolean;
			codeBlock?: boolean;
			blockquote?: boolean;
			bulletList?: boolean;
			orderedList?: boolean;
			horizontalRule?: boolean;
			align?: boolean;
			link?: boolean;
			image?: boolean;
			table?: boolean;
			tableControls?: boolean;
			characterCount?: boolean;
		};

		/**
		 * Image upload handler
		 */
		onImageUpload?: (file: File) => Promise<string>;
	};

	/**
	 * Relation field configuration
	 */
	relation?: {
		/**
		 * Target collection name
		 */
		targetCollection: string;

		/**
		 * Mode: picker (multiple), inline, create
		 */
		mode?: "picker" | "inline" | "create";

		/**
		 * Filter options based on form values
		 */
		filter?: (values: any) => any;

		/**
		 * Enable drag-and-drop ordering (for multiple relations)
		 */
		orderable?: boolean;
	};

	/**
	 * Embedded collection configuration
	 */
	embedded?: {
		/**
		 * Collection to embed
		 */
		collection: string;

		/**
		 * Enable drag-and-drop ordering
		 */
		orderable?: boolean;

		/**
		 * Display mode
		 */
		mode?: "inline" | "modal" | "drawer";

		/**
		 * Row label
		 */
		rowLabel?: (item: any) => string;
	};

	/**
	 * List view configuration for this field
	 */
	list?: {
		/**
		 * Custom cell renderer
		 */
		renderCell?: string | React.ComponentType<any>;

		/**
		 * Column width
		 */
		width?: number;

		/**
		 * Is sortable
		 */
		sortable?: boolean;
	};

	/**
	 * Validation function
	 */
	validate?: (value: any, values: any) => string | undefined;
};

/**
 * Admin collection configuration (UI only)
 */
export type AdminCollectionConfig<
	CMS extends QCMS<any, any, any>,
	K extends keyof CMS["config"]["collections"],
> = {
	label?: I18nText;
	description?: I18nText;
	icon?: IconRef;
	group?: string;

	/**
	 * List view configuration
	 */
	list?: ListConfig;

	/**
	 * Edit/Create form configuration
	 */
	edit?: EditConfig;

	/**
	 * Field-specific overrides
	 */
	fields?: Record<string, FieldConfig>;

	/**
	 * Enable versioning for this collection
	 */
	versioned?: boolean;

	/**
	 * Enable audit logging
	 */
	auditLog?: boolean | {
		/**
		 * Fields to track
		 */
		fields?: string[];

		/**
		 * Track who made changes
		 */
		trackUser?: boolean;

		/**
		 * Retention period (in days)
		 */
		retentionDays?: number;
	};
};

/**
 * Admin collections map (key = collection name)
 */
export type AdminCollectionMap<CMS extends QCMS<any, any, any>> = {
	[K in keyof CMS["config"]["collections"]]?: AdminCollectionConfig<CMS, K>;
};

/**
 * Complete admin configuration
 */
export type AdminConfig<CMS extends QCMS<any, any, any>> = {
	app: AdminAppConfig;
	collections?: AdminCollectionMap<CMS>;
};

/**
 * Define admin configuration with type inference
 *
 * @example
 * ```ts
 * import { defineAdminConfig } from '@questpie/admin/config'
 * import type { cms } from './server/cms'
 *
 * export const admin = defineAdminConfig<typeof cms>()({
 *   app: {
 *     brand: { name: "My CMS" }
 *   },
 *   collections: {
 *     posts: {
 *       label: "Posts",
 *       icon: "posts"
 *     }
 *   }
 * })
 * ```
 */
export const defineAdminConfig =
	<CMS extends QCMS<any, any, any>>() =>
	<TConfig extends AdminConfig<CMS>>(config: TConfig): TConfig => {
		return config;
	};
