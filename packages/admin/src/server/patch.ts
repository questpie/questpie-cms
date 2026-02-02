/**
 * Runtime Monkey Patching for Admin Builder Methods
 *
 * This module patches QuestpieBuilder, CollectionBuilder, and GlobalBuilder
 * with admin-specific methods when adminModule is used.
 *
 * The patches add these methods:
 * - QuestpieBuilder: listView(), editView(), component(), listViews(), editViews(), components()
 * - CollectionBuilder: admin(), list(), form(), preview()
 * - GlobalBuilder: admin(), form()
 *
 * Type augmentation is handled by ./augmentation.ts which extends the builder types.
 *
 * @internal This module is automatically imported by adminModule.
 */

import { CollectionBuilder, GlobalBuilder, QuestpieBuilder } from "questpie";
import type {
	AdminCollectionConfig,
	AdminGlobalConfig,
	ComponentDefinition,
	EditViewDefinition,
	FormViewConfig,
	ListViewConfig,
	ListViewDefinition,
	PreviewConfig,
} from "./augmentation.js";

// Track if patches have been applied to avoid double-patching
let patchesApplied = false;

// ============================================================================
// Proxy Factories
// ============================================================================

/**
 * Create a component proxy for type-safe icon and UI element references.
 * Used in .admin() config functions.
 *
 * @example
 * ```ts
 * .admin(({ c }) => ({
 *   icon: c.icon("ph:users"),
 *   badge: c.badge({ text: "New", color: "green" }),
 * }))
 * ```
 */
function createComponentProxy() {
	return {
		/**
		 * Create an icon reference
		 * @param name Iconify icon name (e.g., "ph:users", "mdi:home")
		 */
		icon: (name: string) => ({ type: "icon", props: { name } }) as const,

		/**
		 * Create a badge reference
		 */
		badge: (props: { text: string; color?: string }) =>
			({ type: "badge", props }) as const,
	};
}

/**
 * Create a field proxy for referencing collection fields.
 * Returns field names as strings for config objects.
 *
 * @example
 * ```ts
 * .list(({ f }) => ({
 *   columns: [f.title, f.author, f.createdAt],
 * }))
 * ```
 */
function createFieldProxy<TFields extends Record<string, any>>(
	fieldNames: string[],
): TFields {
	return new Proxy({} as TFields, {
		get: (_target, prop: string) => prop,
		has: (_target, prop: string) => fieldNames.includes(prop),
		ownKeys: () => fieldNames,
		getOwnPropertyDescriptor: (_target, prop: string) => {
			if (fieldNames.includes(prop)) {
				return { configurable: true, enumerable: true, value: prop };
			}
			return undefined;
		},
	});
}

/**
 * Create a view proxy for defining view configurations.
 *
 * @example
 * ```ts
 * .list(({ v }) => v.table({
 *   columns: [...],
 *   defaultSort: { field: "createdAt", direction: "desc" },
 * }))
 * ```
 */
function createViewProxy() {
	return {
		/**
		 * Table view for list
		 */
		table: (config: Omit<ListViewConfig, "view">) =>
			({ view: "table", ...config }) as ListViewConfig,

		/**
		 * Cards view for list
		 */
		cards: (config: Omit<ListViewConfig, "view">) =>
			({ view: "cards", ...config }) as ListViewConfig,

		/**
		 * Form view for edit
		 */
		form: (config: Omit<FormViewConfig, "view">) =>
			({ view: "form", ...config }) as FormViewConfig,

		/**
		 * Wizard view for edit (multi-step form)
		 */
		wizard: (config: Omit<FormViewConfig, "view">) =>
			({ view: "wizard", ...config }) as FormViewConfig,
	};
}

/**
 * Create an action proxy for referencing built-in and custom actions.
 *
 * @example
 * ```ts
 * .list(({ a }) => ({
 *   actions: {
 *     header: { primary: [a.create] },
 *     bulk: [a.delete, a.export],
 *   },
 * }))
 * ```
 */
function createActionProxy() {
	return {
		// Built-in actions
		create: "create",
		save: "save",
		delete: "delete",
		deleteMany: "deleteMany",
		duplicate: "duplicate",
		export: "export",

		/**
		 * Reference a custom action by name
		 */
		custom: (name: string, config?: unknown) => ({ type: name, config }),
	};
}

// ============================================================================
// QuestpieBuilder Patches
// ============================================================================

/**
 * Patch QuestpieBuilder with admin methods
 */
function patchQuestpieBuilder() {
	const proto = QuestpieBuilder.prototype as any;

	/**
	 * Create a list view definition.
	 * Returns a definition object for use in .listViews()
	 */
	proto.listView = <TName extends string>(
		name: TName,
		config: Record<string, unknown> = {},
	): ListViewDefinition<TName> => ({ type: "listView", name, ...config });

	/**
	 * Create an edit view definition.
	 * Returns a definition object for use in .editViews()
	 */
	proto.editView = <TName extends string>(
		name: TName,
		config: Record<string, unknown> = {},
	): EditViewDefinition<TName> => ({ type: "editView", name, ...config });

	/**
	 * Create a component definition.
	 * Returns a definition object for use in .components()
	 */
	proto.component = <TName extends string>(
		name: TName,
		config: Record<string, unknown> = {},
	): ComponentDefinition<TName> => ({ type: "component", name, ...config });

	/**
	 * Register list views on the builder.
	 * Merges with existing list views.
	 */
	proto.listViews = function (
		views: Record<string, ListViewDefinition>,
	): QuestpieBuilder<any> {
		return new QuestpieBuilder({
			...this.state,
			listViews: { ...(this.state.listViews || {}), ...views },
		});
	};

	/**
	 * Register edit views on the builder.
	 * Merges with existing edit views.
	 */
	proto.editViews = function (
		views: Record<string, EditViewDefinition>,
	): QuestpieBuilder<any> {
		return new QuestpieBuilder({
			...this.state,
			editViews: { ...(this.state.editViews || {}), ...views },
		});
	};

	/**
	 * Register components on the builder.
	 * Merges with existing components.
	 */
	proto.components = function (
		components: Record<string, ComponentDefinition>,
	): QuestpieBuilder<any> {
		return new QuestpieBuilder({
			...this.state,
			components: { ...(this.state.components || {}), ...components },
		});
	};
}

// ============================================================================
// CollectionBuilder Patches
// ============================================================================

/**
 * Patch CollectionBuilder with admin methods
 */
function patchCollectionBuilder() {
	const proto = CollectionBuilder.prototype as any;

	/**
	 * Set admin metadata for the collection.
	 * Defines how the collection appears in the admin sidebar and UI.
	 *
	 * @example
	 * ```ts
	 * .admin(({ c }) => ({
	 *   label: { en: "Posts", sk: "Príspevky" },
	 *   icon: c.icon("ph:article"),
	 *   description: { en: "Blog posts and articles" },
	 * }))
	 * ```
	 */
	proto.admin = function (
		configOrFn:
			| AdminCollectionConfig
			| ((ctx: {
					c: ReturnType<typeof createComponentProxy>;
			  }) => AdminCollectionConfig),
	): CollectionBuilder<any> {
		const config =
			typeof configOrFn === "function"
				? configOrFn({ c: createComponentProxy() })
				: configOrFn;

		const newState = {
			...this.state,
			admin: config,
		};

		const newBuilder = new CollectionBuilder(newState);
		// Copy callback functions
		if (this._indexesFn) {
			(newBuilder as any)._indexesFn = this._indexesFn;
		}
		return newBuilder;
	};

	/**
	 * Configure list view for the collection.
	 * Defines columns, sorting, filtering, and actions for the list page.
	 *
	 * @example
	 * ```ts
	 * .list(({ v, f, a }) => v.table({
	 *   columns: [f.title, f.author, f.status, f.createdAt],
	 *   defaultSort: { field: "createdAt", direction: "desc" },
	 *   searchable: ["title", "content"],
	 *   filterable: ["status", "author"],
	 *   actions: {
	 *     header: { primary: [a.create] },
	 *     row: [a.duplicate, a.delete],
	 *     bulk: [a.delete],
	 *   },
	 * }))
	 * ```
	 */
	proto.list = function (
		configFn: (ctx: {
			v: ReturnType<typeof createViewProxy>;
			f: Record<string, string>;
			a: ReturnType<typeof createActionProxy>;
		}) => ListViewConfig,
	): CollectionBuilder<any> {
		// Get field names from state
		const fieldNames = Object.keys(this.state.fields || {});

		const config = configFn({
			v: createViewProxy(),
			f: createFieldProxy(fieldNames),
			a: createActionProxy(),
		});

		const newState = {
			...this.state,
			adminList: config,
		};

		const newBuilder = new CollectionBuilder(newState);
		if (this._indexesFn) {
			(newBuilder as any)._indexesFn = this._indexesFn;
		}
		return newBuilder;
	};

	/**
	 * Configure form view for the collection.
	 * Defines field layout, sections, and tabs for create/edit pages.
	 *
	 * @example
	 * ```ts
	 * .form(({ v, f }) => v.form({
	 *   sections: [
	 *     {
	 *       label: { en: "Basic Info" },
	 *       fields: [f.title, f.slug, f.content],
	 *     },
	 *     {
	 *       label: { en: "Publishing" },
	 *       fields: [f.status, f.publishedAt, f.author],
	 *       collapsible: true,
	 *     },
	 *   ],
	 * }))
	 * ```
	 */
	proto.form = function (
		configFn: (ctx: {
			v: ReturnType<typeof createViewProxy>;
			f: Record<string, string>;
		}) => FormViewConfig,
	): CollectionBuilder<any> {
		const fieldNames = Object.keys(this.state.fields || {});

		const config = configFn({
			v: createViewProxy(),
			f: createFieldProxy(fieldNames),
		});

		const newState = {
			...this.state,
			adminForm: config,
		};

		const newBuilder = new CollectionBuilder(newState);
		if (this._indexesFn) {
			(newBuilder as any)._indexesFn = this._indexesFn;
		}
		return newBuilder;
	};

	/**
	 * Configure preview for the collection.
	 * Enables live preview panel in the edit page.
	 *
	 * @example
	 * ```ts
	 * .preview({
	 *   enabled: true,
	 *   url: ({ record, locale }) => `/preview/posts/${record.slug}?locale=${locale}`,
	 *   position: "right",
	 *   defaultWidth: 50,
	 * })
	 * ```
	 */
	proto.preview = function (config: PreviewConfig): CollectionBuilder<any> {
		const newState = {
			...this.state,
			adminPreview: config,
		};

		const newBuilder = new CollectionBuilder(newState);
		if (this._indexesFn) {
			(newBuilder as any)._indexesFn = this._indexesFn;
		}
		return newBuilder;
	};
}

// ============================================================================
// GlobalBuilder Patches
// ============================================================================

/**
 * Patch GlobalBuilder with admin methods
 */
function patchGlobalBuilder() {
	const proto = GlobalBuilder.prototype as any;

	/**
	 * Set admin metadata for the global.
	 * Defines how the global appears in the admin sidebar and UI.
	 *
	 * @example
	 * ```ts
	 * .admin(({ c }) => ({
	 *   label: { en: "Site Settings", sk: "Nastavenia stránky" },
	 *   icon: c.icon("ph:gear"),
	 * }))
	 * ```
	 */
	proto.admin = function (
		configOrFn:
			| AdminGlobalConfig
			| ((ctx: {
					c: ReturnType<typeof createComponentProxy>;
			  }) => AdminGlobalConfig),
	): GlobalBuilder<any> {
		const config =
			typeof configOrFn === "function"
				? configOrFn({ c: createComponentProxy() })
				: configOrFn;

		const newState = {
			...this.state,
			admin: config,
		};

		return new GlobalBuilder(newState);
	};

	/**
	 * Configure form view for the global.
	 * Defines field layout, sections, and tabs for the settings page.
	 *
	 * @example
	 * ```ts
	 * .form(({ v, f }) => v.form({
	 *   tabs: [
	 *     {
	 *       label: { en: "General" },
	 *       icon: c.icon("ph:gear"),
	 *       sections: [
	 *         { fields: [f.siteName, f.siteDescription, f.logo] },
	 *       ],
	 *     },
	 *     {
	 *       label: { en: "Social Media" },
	 *       icon: c.icon("ph:share-network"),
	 *       sections: [
	 *         { fields: [f.socialLinks] },
	 *       ],
	 *     },
	 *   ],
	 * }))
	 * ```
	 */
	proto.form = function (
		configFn: (ctx: {
			v: ReturnType<typeof createViewProxy>;
			f: Record<string, string>;
		}) => FormViewConfig,
	): GlobalBuilder<any> {
		const fieldNames = Object.keys(this.state.fields || {});

		const config = configFn({
			v: createViewProxy(),
			f: createFieldProxy(fieldNames),
		});

		const newState = {
			...this.state,
			adminForm: config,
		};

		return new GlobalBuilder(newState);
	};
}

// ============================================================================
// Apply All Patches
// ============================================================================

/**
 * Apply all admin patches to builder prototypes.
 * This function is idempotent - calling it multiple times has no effect.
 *
 * Called automatically when adminModule is used via .use()
 */
export function applyAdminPatches(): void {
	if (patchesApplied) {
		return;
	}

	patchQuestpieBuilder();
	patchCollectionBuilder();
	patchGlobalBuilder();

	patchesApplied = true;
}

/**
 * Check if admin patches have been applied.
 * Useful for debugging and testing.
 */
export function arePatchesApplied(): boolean {
	return patchesApplied;
}

// Re-export proxy factories for external use if needed
export {
	createActionProxy,
	createComponentProxy,
	createFieldProxy,
	createViewProxy,
};
