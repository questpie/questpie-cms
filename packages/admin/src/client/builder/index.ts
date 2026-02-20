/**
 * Admin Builder - Main Export
 */

import type { CollectionInfer, Questpie } from "questpie";
import type { QuestpieClient } from "questpie/client";

export { Admin, type AppAdmin, type InferAdminCMS } from "./admin";
export { AdminBuilder } from "./admin-builder";
export type { AdminBuilderState } from "./admin-types";
// Action types and registry
export type { PageDefinition } from "./page/page";
export { qa } from "./qa";
// ============================================================================
// Common Types
// ============================================================================

export type { IconComponent } from "./types/common";

// ============================================================================
// Field Types
// ============================================================================

export type {
	ComponentRegistry,
	FieldComponentProps,
	FieldLayoutItem,
	FormSidebarConfig,
	FormViewConfig,
	SectionLayout,
	TabConfig,
	TabsLayout,
} from "./types/field-types";

// ============================================================================
// Validation
// ============================================================================

// ============================================================================
// Widget Types
// ============================================================================

export type {
	AnyWidgetConfig,
	WidgetAction,
	WidgetCardVariant,
	WidgetComponentProps,
	WidgetConfig,
} from "./types/widget-types";

// ============================================================================
// UI Config Types
// ============================================================================

export type {
	DashboardAction,
	DashboardConfig,
	DashboardLayoutItem,
	DashboardSection,
	DashboardTabConfig,
	DashboardTabs,
} from "./types/ui-config";

// ============================================================================
// I18n Types
// ============================================================================

// ============================================================================
// Module Augmentation Registry
// ============================================================================

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract collection names from backend Questpie app
 */
export type CollectionNames<TApp extends Questpie<any>> =
	keyof TApp["config"]["collections"] & string;
/**
 * Extract global names from backend Questpie app
 */
export type GlobalNames<TApp extends Questpie<any>> =
	TApp extends Questpie<infer TConfig>
		? keyof TConfig["globals"] & string
		: never;

/**
 * Extract collection item type
 */
export type CollectionItem<
	TApp extends Questpie<any>,
	TName extends CollectionNames<TApp>,
> = TApp extends Questpie<any>
	? Awaited<
			ReturnType<QuestpieClient<TApp>["collections"][TName]["find"]>
		> extends { docs: Array<infer TItem> }
		? TItem
		: never
	: never;

/**
 * Extract field keys from a backend collection
 *
 * @example
 * ```ts
 * type AppointmentFields = CollectionFieldKeys<App, "appointments">;
 * // = "customerId" | "barberId" | "serviceId" | "status" | ...
 * ```
 */
export type CollectionFieldKeys<
	TApp extends Questpie<any>,
	TCollectionName extends string,
> = TApp["config"]["collections"][TCollectionName] extends infer TCollection
	? CollectionInfer<TCollection> extends infer TInfer
		? TInfer extends { select: infer TSelect }
			? keyof TSelect
			: never
		: never
	: never;
