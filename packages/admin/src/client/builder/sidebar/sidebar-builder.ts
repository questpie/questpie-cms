/**
 * Sidebar Builder
 *
 * Fluent API for building type-safe sidebar configurations.
 *
 * @example
 * ```ts
 * // Without type safety (any collection/global name allowed)
 * const sidebar = qa.sidebar()
 *   .section("content", s => s
 *     .collection("posts")
 *     .collection("pages")
 *   )
 *
 * // With type safety (only registered names allowed)
 * import type { AppCMS } from './cms';
 *
 * const sidebar = qa.sidebar<AppCMS>()
 *   .section("content", s => s
 *     .collection("posts")  // Autocomplete works!
 *     .global("siteSettings")  // Autocomplete works!
 *   )
 * ```
 */

import type { Questpie } from "questpie";
import type { I18nText } from "../../i18n/types.js";
import type { IconComponent } from "../types/common";
import type {
	SidebarCollectionItem,
	SidebarConfig,
	SidebarDividerItem,
	SidebarGlobalItem,
	SidebarItem,
	SidebarLinkItem,
	SidebarPageItem,
	SidebarSection,
} from "../types/ui-config";

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract collection names from CMS type
 */
type CollectionNames<TApp> =
	TApp extends Questpie<infer TConfig>
		? keyof TConfig["collections"] & string
		: string;

/**
 * Extract global names from CMS type
 */
type GlobalNames<TApp> =
	TApp extends Questpie<infer TConfig>
		? keyof TConfig["globals"] & string
		: string;

/**
 * Typed sidebar items with constrained collection/global names.
 */
export type TypedSidebarCollectionItem<TCollectionNames extends string> = Omit<
	SidebarCollectionItem,
	"collection"
> & {
	collection: TCollectionNames;
};

export type TypedSidebarGlobalItem<TGlobalNames extends string> = Omit<
	SidebarGlobalItem,
	"global"
> & {
	global: TGlobalNames;
};

export type TypedSidebarItem<
	TCollectionNames extends string,
	TGlobalNames extends string,
> =
	| TypedSidebarCollectionItem<TCollectionNames>
	| TypedSidebarGlobalItem<TGlobalNames>
	| SidebarPageItem
	| SidebarLinkItem
	| SidebarDividerItem;

/**
 * Typed sidebar item union based on CMS app type.
 */
export type SidebarItemForApp<TApp> = TypedSidebarItem<
	CollectionNames<TApp>,
	GlobalNames<TApp>
>;

// ============================================================================
// Section Builder
// ============================================================================

export interface SectionBuilderState {
	id: string;
	title?: I18nText;
	icon?: IconComponent;
	collapsed?: boolean;
	items: SidebarItem[];
}

/**
 * Section builder with optional type constraints for collection/global names.
 *
 * @template TId - Section ID type
 * @template TCollectionNames - Valid collection names (string if not constrained)
 * @template TGlobalNames - Valid global names (string if not constrained)
 */
export class SectionBuilder<
	TId extends string = string,
	TCollectionNames extends string = string,
	TGlobalNames extends string = string,
> {
	constructor(private state: SectionBuilderState) {}

	static create<
		TId extends string,
		TCollectionNames extends string = string,
		TGlobalNames extends string = string,
	>(id: TId): SectionBuilder<TId, TCollectionNames, TGlobalNames> {
		return new SectionBuilder({ id, items: [] });
	}

	/**
	 * Set section title - supports inline translations
	 */
	title(title: I18nText): this {
		this.state.title = title;
		return this;
	}

	/**
	 * Set section icon
	 */
	icon(icon: IconComponent): this {
		this.state.icon = icon;
		return this;
	}

	/**
	 * Set section as collapsed by default
	 */
	collapsed(collapsed = true): this {
		this.state.collapsed = collapsed;
		return this;
	}

	/**
	 * Set section items (replaces existing)
	 */
	items(items: TypedSidebarItem<TCollectionNames, TGlobalNames>[]): this {
		this.state.items = items;
		return this;
	}

	/**
	 * Add items to the end
	 */
	addItems(items: TypedSidebarItem<TCollectionNames, TGlobalNames>[]): this {
		this.state.items = [...this.state.items, ...items];
		return this;
	}

	/**
	 * Add items to the beginning
	 */
	prependItems(
		items: TypedSidebarItem<TCollectionNames, TGlobalNames>[],
	): this {
		this.state.items = [...items, ...this.state.items];
		return this;
	}

	/**
	 * Add a single item
	 */
	item(item: TypedSidebarItem<TCollectionNames, TGlobalNames>): this {
		this.state.items.push(item);
		return this;
	}

	/**
	 * Add a collection item.
	 * When using typed sidebar (qa.sidebar<AppCMS>()), only registered collection names are allowed.
	 */
	collection(
		collection: TCollectionNames,
		options?: { label?: I18nText; icon?: IconComponent },
	): this {
		this.state.items.push({
			type: "collection",
			collection,
			...options,
		});
		return this;
	}

	/**
	 * Add a global item.
	 * When using typed sidebar (qa.sidebar<AppCMS>()), only registered global names are allowed.
	 */
	global(
		global: TGlobalNames,
		options?: { label?: I18nText; icon?: IconComponent },
	): this {
		this.state.items.push({
			type: "global",
			global,
			...options,
		});
		return this;
	}

	/**
	 * Add a link item
	 */
	link(
		label: I18nText,
		href: string,
		options?: { icon?: IconComponent; external?: boolean },
	): this {
		this.state.items.push({
			type: "link",
			label,
			href,
			...options,
		});
		return this;
	}

	/**
	 * Add a page item
	 */
	page(
		pageId: string,
		options?: { label?: I18nText; icon?: IconComponent },
	): this {
		this.state.items.push({
			type: "page",
			pageId,
			...options,
		});
		return this;
	}

	/**
	 * Add a divider
	 */
	divider(): this {
		this.state.items.push({ type: "divider" });
		return this;
	}

	/**
	 * Build the section config
	 */
	build(): SidebarSection<TId> {
		return {
			id: this.state.id as TId,
			title: this.state.title,
			icon: this.state.icon,
			collapsed: this.state.collapsed,
			items: this.state.items,
		};
	}

	/**
	 * Get the section ID
	 */
	get id(): TId {
		return this.state.id as TId;
	}
}

// ============================================================================
// Sidebar Builder
// ============================================================================

export interface SidebarBuilderState<TSectionIds extends string = string> {
	sections: Map<string, SidebarSection<TSectionIds>>;
	order: string[];
}

/**
 * Sidebar builder with optional type constraints for collection/global names.
 *
 * @template TSectionIds - Accumulated section IDs
 * @template TApp - CMS app type for constraining collection/global names (any = no constraints)
 */
export class SidebarBuilder<TSectionIds extends string = never, TApp = any> {
	private state: SidebarBuilderState<TSectionIds>;

	constructor(state?: SidebarBuilderState<TSectionIds>) {
		this.state = state ?? {
			sections: new Map(),
			order: [],
		};
	}

	/**
	 * Create empty sidebar builder
	 */
	static create<TApp = any>(): SidebarBuilder<never, TApp> {
		return new SidebarBuilder();
	}

	/**
	 * Create sidebar builder from existing config
	 */
	static from<TIds extends string, TApp = any>(
		config: SidebarConfig<TIds>,
	): SidebarBuilder<TIds, TApp> {
		const builder = new SidebarBuilder<TIds, TApp>();
		for (const section of config.sections) {
			builder.state.sections.set(section.id, section);
			builder.state.order.push(section.id);
		}
		return builder;
	}

	/**
	 * Add a section.
	 * The section builder callback receives a typed SectionBuilder with collection/global name constraints.
	 */
	section<TId extends string>(
		id: TId,
		configure: (
			section: SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
		) => SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
	): SidebarBuilder<TSectionIds | TId, TApp> {
		const sectionBuilder = SectionBuilder.create<
			TId,
			CollectionNames<TApp>,
			GlobalNames<TApp>
		>(id);
		const configured = configure(sectionBuilder);
		const section = configured.build();

		this.state.sections.set(id, section as any);
		if (!this.state.order.includes(id)) {
			this.state.order.push(id);
		}

		return this as unknown as SidebarBuilder<TSectionIds | TId, TApp>;
	}

	/**
	 * Prepend a section (add to beginning)
	 */
	prepend<TId extends string>(
		id: TId,
		configure: (
			section: SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
		) => SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
	): SidebarBuilder<TSectionIds | TId, TApp> {
		const sectionBuilder = SectionBuilder.create<
			TId,
			CollectionNames<TApp>,
			GlobalNames<TApp>
		>(id);
		const configured = configure(sectionBuilder);
		const section = configured.build();

		this.state.sections.set(id, section as any);
		this.state.order = [
			id,
			...this.state.order.filter((existingId) => existingId !== id),
		];

		return this as unknown as SidebarBuilder<TSectionIds | TId, TApp>;
	}

	/**
	 * Append a section (add to end)
	 */
	append<TId extends string>(
		id: TId,
		configure: (
			section: SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
		) => SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
	): SidebarBuilder<TSectionIds | TId, TApp> {
		const sectionBuilder = SectionBuilder.create<
			TId,
			CollectionNames<TApp>,
			GlobalNames<TApp>
		>(id);
		const configured = configure(sectionBuilder);
		const section = configured.build();

		this.state.sections.set(id, section as any);
		this.state.order = [
			...this.state.order.filter((existingId) => existingId !== id),
			id,
		];

		return this as unknown as SidebarBuilder<TSectionIds | TId, TApp>;
	}

	/**
	 * Insert a section before another section
	 */
	insertBefore<TId extends string>(
		beforeId: TSectionIds,
		id: TId,
		configure: (
			section: SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
		) => SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
	): SidebarBuilder<TSectionIds | TId, TApp> {
		const sectionBuilder = SectionBuilder.create<
			TId,
			CollectionNames<TApp>,
			GlobalNames<TApp>
		>(id);
		const configured = configure(sectionBuilder);
		const section = configured.build();

		this.state.sections.set(id, section as any);

		const beforeIndex = this.state.order.indexOf(beforeId);
		if (beforeIndex !== -1) {
			this.state.order = [
				...this.state.order.slice(0, beforeIndex),
				id,
				...this.state.order.slice(beforeIndex).filter((i) => i !== id),
			];
		} else {
			this.state.order.push(id);
		}

		return this as unknown as SidebarBuilder<TSectionIds | TId, TApp>;
	}

	/**
	 * Insert a section after another section
	 */
	insertAfter<TId extends string>(
		afterId: TSectionIds,
		id: TId,
		configure: (
			section: SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
		) => SectionBuilder<TId, CollectionNames<TApp>, GlobalNames<TApp>>,
	): SidebarBuilder<TSectionIds | TId, TApp> {
		const sectionBuilder = SectionBuilder.create<
			TId,
			CollectionNames<TApp>,
			GlobalNames<TApp>
		>(id);
		const configured = configure(sectionBuilder);
		const section = configured.build();

		this.state.sections.set(id, section as any);

		const afterIndex = this.state.order.indexOf(afterId);
		if (afterIndex !== -1) {
			this.state.order = [
				...this.state.order.slice(0, afterIndex + 1).filter((i) => i !== id),
				id,
				...this.state.order.slice(afterIndex + 1).filter((i) => i !== id),
			];
		} else {
			this.state.order.push(id);
		}

		return this as unknown as SidebarBuilder<TSectionIds | TId, TApp>;
	}

	/**
	 * Extend an existing section
	 */
	extend(
		id: TSectionIds,
		configure: (
			section: SectionBuilder<
				TSectionIds,
				CollectionNames<TApp>,
				GlobalNames<TApp>
			>,
		) => SectionBuilder<TSectionIds, CollectionNames<TApp>, GlobalNames<TApp>>,
	): this {
		const existing = this.state.sections.get(id);
		if (!existing) {
			console.warn(
				`[SidebarBuilder] Section "${id}" not found, skipping extend`,
			);
			return this;
		}

		// Create builder from existing section
		const sectionBuilder = new SectionBuilder<
			TSectionIds,
			CollectionNames<TApp>,
			GlobalNames<TApp>
		>({
			id: existing.id,
			title: existing.title,
			icon: existing.icon,
			collapsed: existing.collapsed,
			items: [...existing.items],
		});

		const configured = configure(sectionBuilder);
		const section = configured.build();

		this.state.sections.set(id, section);
		return this;
	}

	/**
	 * Remove a section
	 */
	remove(id: TSectionIds): this {
		this.state.sections.delete(id);
		this.state.order = this.state.order.filter((i) => i !== id);
		return this;
	}

	/**
	 * Merge with another sidebar builder
	 */
	merge<TOtherIds extends string>(
		other: SidebarBuilder<TOtherIds, TApp>,
	): SidebarBuilder<TSectionIds | TOtherIds, TApp> {
		const otherConfig = other.build();
		for (const section of otherConfig.sections) {
			if (!this.state.sections.has(section.id)) {
				this.state.sections.set(section.id, section as any);
				this.state.order.push(section.id);
			}
		}
		return this as unknown as SidebarBuilder<TSectionIds | TOtherIds, TApp>;
	}

	/**
	 * Build the sidebar config
	 */
	build(): SidebarConfig<TSectionIds> {
		const sections: SidebarSection<TSectionIds>[] = [];
		for (const id of this.state.order) {
			const section = this.state.sections.get(id);
			if (section) {
				sections.push(section);
			}
		}
		return { sections };
	}

	/**
	 * Get section IDs (for type inference)
	 */
	get sectionIds(): TSectionIds[] {
		return this.state.order as TSectionIds[];
	}
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new sidebar builder
 */
export function sidebar<TApp = any>(): SidebarBuilder<never, TApp> {
	return SidebarBuilder.create<TApp>();
}

/**
 * Create a sidebar builder from existing config
 */
sidebar.from = <TIds extends string, TApp = any>(
	config: SidebarConfig<TIds>,
): SidebarBuilder<TIds, TApp> => SidebarBuilder.from<TIds, TApp>(config);

/**
 * Create a section builder (for standalone use)
 */
export function section<
	TId extends string,
	TCollectionNames extends string = string,
	TGlobalNames extends string = string,
>(id: TId): SectionBuilder<TId, TCollectionNames, TGlobalNames> {
	return SectionBuilder.create<TId, TCollectionNames, TGlobalNames>(id);
}
