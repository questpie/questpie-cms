/**
 * @questpie/admin/client - Client-Side Admin UI
 *
 * All client-side exports for building admin UIs.
 *
 * @example
 * ```ts
 * import { qa, adminModule } from "@questpie/admin/client";
 *
 * const admin = qa()
 *   .use(adminModule)
 *   .collections({ posts: postsAdmin });
 * ```
 */

// ============================================================================
// Admin Module - The main "batteries included" module
// ============================================================================

// Core module for advanced users who want minimal setup
export {
	type CoreAdminModule,
	coreAdminModule,
} from "#questpie/admin/client/builder/defaults/core.js";
export {
	type AdminModule,
	adminModule,
} from "#questpie/admin/client/builder/defaults/starter.js";

// ============================================================================
// Builder API
// ============================================================================

export {
	Admin,
	type AppAdmin,
	type InferAdminCMS,
} from "#questpie/admin/client/builder/admin.js";
export { AdminBuilder } from "#questpie/admin/client/builder/admin-builder.js";
export type { AdminBuilderState } from "#questpie/admin/client/builder/admin-types.js";
// Collection builder
export { collection } from "#questpie/admin/client/builder/collection/collection.js";
export { CollectionBuilder } from "#questpie/admin/client/builder/collection/collection-builder.js";
export type {
	AutoSaveConfig,
	CollectionBuilderState,
	CollectionConfig,
	ColumnConfig,
	ColumnConfigObject,
	ListViewConfig,
} from "#questpie/admin/client/builder/collection/types.js";
// Field builder
export {
	FieldBuilder,
	type FieldBuilderState,
	type FieldDefinition,
	field,
} from "#questpie/admin/client/builder/field/field.js";
// Global builder
export { global } from "#questpie/admin/client/builder/global/global.js";
export { GlobalBuilder } from "#questpie/admin/client/builder/global/global-builder.js";
export type {
	GlobalBuilderState,
	GlobalConfig,
} from "#questpie/admin/client/builder/global/types.js";
// Helpers
export {
	type AdminHelpers,
	createAdminHelpers,
} from "#questpie/admin/client/builder/helpers.js";
// Page builder
export {
	PageBuilder,
	type PageBuilderState,
	type PageDefinition,
	page,
} from "#questpie/admin/client/builder/page/page.js";
export { qa } from "#questpie/admin/client/builder/qa.js";
// Sidebar builder
export {
	SectionBuilder,
	type SectionBuilderState,
	SidebarBuilder,
	type SidebarBuilderState,
	type SidebarItemForApp,
	section,
	sidebar,
	type TypedSidebarCollectionItem,
	type TypedSidebarGlobalItem,
	type TypedSidebarItem,
} from "#questpie/admin/client/builder/sidebar/sidebar-builder.js";
// View builders
export {
	EditViewBuilder,
	type EditViewBuilderState,
	type EditViewDefinition,
	editView,
	ListViewBuilder,
	type ListViewBuilderState,
	type ListViewDefinition,
	listView,
} from "#questpie/admin/client/builder/view/view.js";
// Widget builder
export {
	WidgetBuilder,
	type WidgetBuilderState,
	type WidgetDefinition,
	widget,
} from "#questpie/admin/client/builder/widget/widget.js";

// ============================================================================
// Types
// ============================================================================

// Registry types (for module augmentation)
export type {
	AdminTypeRegistry,
	IsRegistered,
	RegisteredAdmin,
	RegisteredCMS,
	RegisteredCollectionNames,
	RegisteredGlobalNames,
} from "#questpie/admin/client/builder/registry.js";
// Common types
export type {
	BaseFieldProps,
	IconComponent,
	MaybeLazyComponent,
} from "#questpie/admin/client/builder/types/common.js";
// Field types
export type {
	ArrayFieldConfig,
	ComponentRegistry,
	EmbeddedCollectionProps,
	EmbeddedFieldConfig,
	FieldComponentProps,
	FieldLayoutItem,
	FieldUIConfig,
	FormSidebarConfig,
	FormViewConfig,
	LayoutMode,
	RelationFieldConfig,
	RichTextConfig,
	SectionLayout,
	SelectOption,
	TabConfig,
	TabsLayout,
	WrapperMode,
} from "#questpie/admin/client/builder/types/field-types.js";

// UI config types
export type {
	BrandingConfig,
	DashboardConfig,
	LocaleConfig,
	SidebarCollectionItem,
	SidebarConfig,
	SidebarDividerItem,
	SidebarGlobalItem,
	SidebarItem,
	SidebarLinkItem,
	SidebarPageItem,
	SidebarSection,
} from "#questpie/admin/client/builder/types/ui-config.js";

export type { DefaultViewsConfig } from "#questpie/admin/client/builder/types/views.js";
// Widget types
export type {
	AnyWidgetConfig,
	BaseWidgetConfig,
	ChartWidgetConfig,
	CustomWidgetConfig,
	DashboardWidgetConfig,
	GenericWidgetConfig,
	KnownWidgetType,
	QuickActionsWidgetConfig,
	RecentItemsWidgetConfig,
	StatsWidgetConfig,
	WidgetAction,
	WidgetComponentProps,
	WidgetConfig,
	WidgetDataSource,
} from "#questpie/admin/client/builder/types/widget-types.js";

// I18n messages
export {
	adminMessagesEN,
	adminMessagesSK,
} from "#questpie/admin/client/i18n/messages/index.js";
// I18n types
export type {
	I18nContext,
	I18nText,
} from "#questpie/admin/client/i18n/types.js";

// ============================================================================
// Type Helpers
// ============================================================================

import type { CollectionInfer, Questpie } from "questpie";
import type { QuestpieClient } from "questpie/client";

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

// ============================================================================
// Runtime
// ============================================================================

export type {
	AdminProviderProps,
	AdminState,
	AdminStore,
} from "#questpie/admin/client/runtime/index.js";
export {
	AdminProvider,
	selectAdmin,
	selectAuthClient,
	selectBasePath,
	selectBrandName,
	selectClient,
	selectContentLocale,
	selectNavigate,
	selectNavigation,
	selectSetContentLocale,
	useAdminStore,
	useShallow,
} from "#questpie/admin/client/runtime/index.js";

// ============================================================================
// Hooks
// ============================================================================

export {
	createAdminAuthClient,
	// Typed hooks factory (recommended for new projects)
	createTypedHooks,
	type TypedHooks,
	useAuthClient,
	useCollectionCreate,
	useCollectionDelete,
	useCollectionItem,
	useCollectionList,
	useCollectionUpdate,
	useCurrentUser,
	useGlobal,
	useGlobalUpdate,
	useSavedViews,
	useSetupStatus,
} from "#questpie/admin/client/hooks/index.js";

export {
	useIsDesktop,
	useIsMobile,
	useMediaQuery,
} from "#questpie/admin/client/hooks/use-media-query.js";

// ============================================================================
// Components
// ============================================================================

export { AdminLink } from "#questpie/admin/client/components/admin-link.js";
export { AuthGuard } from "#questpie/admin/client/components/auth/auth-guard.js";
export { AuthLoading } from "#questpie/admin/client/components/auth/auth-loading.js";
export {
	RichTextRenderer,
	type RichTextStyles,
	type TipTapDoc,
	type TipTapNode,
} from "#questpie/admin/components/rich-text/index.js";

// ============================================================================
// Views
// ============================================================================

export { AcceptInviteForm } from "#questpie/admin/client/views/auth/accept-invite-form.js";
// Auth views
export { AuthLayout } from "#questpie/admin/client/views/auth/auth-layout.js";
export { ForgotPasswordForm } from "#questpie/admin/client/views/auth/forgot-password-form.js";
export { LoginForm } from "#questpie/admin/client/views/auth/login-form.js";
export { ResetPasswordForm } from "#questpie/admin/client/views/auth/reset-password-form.js";
export {
	SetupForm,
	type SetupFormValues,
} from "#questpie/admin/client/views/auth/setup-form.js";
export {
	default as FormView,
	type FormViewProps,
	type FormViewRegistryConfig,
} from "#questpie/admin/client/views/collection/form-view.js";
// Collection views
export {
	default as TableView,
	type TableViewConfig,
	type TableViewProps,
} from "#questpie/admin/client/views/collection/table-view.js";
// Dashboard views
export { DashboardGrid } from "#questpie/admin/client/views/dashboard/dashboard-grid.js";
export { DashboardWidget } from "#questpie/admin/client/views/dashboard/dashboard-widget.js";
// Global views
export { GlobalForm } from "#questpie/admin/client/views/globals/global-form.js";
export { AdminLayout } from "#questpie/admin/client/views/layout/admin-layout.js";
export { AdminLayoutProvider } from "#questpie/admin/client/views/layout/admin-layout-provider.js";
export {
	AdminRouter,
	type AdminRouterProps,
} from "#questpie/admin/client/views/layout/admin-router.js";
export { AdminSidebar } from "#questpie/admin/client/views/layout/admin-sidebar.js";
export { AdminTopbar } from "#questpie/admin/client/views/layout/admin-topbar.js";
export { AcceptInvitePage } from "#questpie/admin/client/views/pages/accept-invite-page.js";
export { DashboardPage } from "#questpie/admin/client/views/pages/dashboard-page.js";
export { ForgotPasswordPage } from "#questpie/admin/client/views/pages/forgot-password-page.js";
export { InvitePage } from "#questpie/admin/client/views/pages/invite-page.js";
// Pages
export { LoginPage } from "#questpie/admin/client/views/pages/login-page.js";
export { ResetPasswordPage } from "#questpie/admin/client/views/pages/reset-password-page.js";
export {
	SetupPage,
	type SetupPageProps,
} from "#questpie/admin/client/views/pages/setup-page.js";

// ============================================================================
// Utils
// ============================================================================

export {
	type FlagConfig,
	getCountryCode,
	getFlagConfig,
	getFlagUrl,
} from "#questpie/admin/client/utils/locale-to-flag.js";

// ============================================================================
// Block System
// ============================================================================

// Block types
export type {
	BlockCategory,
	BlockContent,
	BlockNode,
	BlockPrefetch,
	BlockRendererProps,
} from "#questpie/admin/client/blocks/index.js";
// Block renderer component
// Block prefetch utilities (for SSR data fetching)
export {
	type BlockPrefetchContext,
	BlockPrefetchError,
	type BlockPrefetchParams,
	type BlockPrefetchResult,
	BlockRenderer,
	type BlockRendererComponentProps,
	createBlockNode,
	EMPTY_BLOCK_CONTENT,
	isBlockContent,
	prefetchBlockData,
	type TypedBlockPrefetch,
} from "#questpie/admin/client/blocks/index.js";
export type {
	BlockBuilderState,
	BlockDefinition,
	InferBlockValues,
} from "#questpie/admin/client/builder/block/index.js";
// Block builder
export {
	BlockBuilder,
	block,
} from "#questpie/admin/client/builder/block/index.js";

// ============================================================================
// Preview System
// ============================================================================

// Admin-side preview components
export {
	PreviewPane,
	type PreviewPaneProps,
	type PreviewPaneRef,
	PreviewToggleButton,
	type PreviewToggleButtonProps,
} from "#questpie/admin/client/components/preview/index.js";
// Preview message types
export type {
	AdminToPreviewMessage,
	BlockClickedMessage,
	FieldClickedMessage,
	FocusFieldMessage,
	PreviewConfig,
	PreviewReadyMessage,
	PreviewRefreshMessage,
	PreviewToAdminMessage,
	RefreshCompleteMessage,
	SelectBlockMessage,
} from "#questpie/admin/client/preview/index.js";
// Frontend preview hook and components
export {
	isAdminToPreviewMessage,
	isPreviewToAdminMessage,
	PreviewBanner,
	type PreviewBannerProps,
	PreviewField,
	type PreviewFieldProps,
	PreviewProvider,
	StandalonePreviewField,
	type UseCollectionPreviewOptions,
	type UseCollectionPreviewResult,
	useCollectionPreview,
	usePreviewContext,
	// Block scope (for block field resolution)
	BlockScopeProvider,
	type BlockScopeProviderProps,
	type BlockScopeContextValue,
	useBlockScope,
	useResolveFieldPath,
} from "#questpie/admin/client/preview/index.js";

// ============================================================================
// Focus System (for preview click-to-focus)
// ============================================================================

export {
	type FocusContextValue,
	FocusProvider,
	type FocusProviderProps,
	type FocusState,
	parsePreviewFieldPath,
	scrollFieldIntoView,
	useFocus,
	useFocusOptional,
	useIsBlockFocused,
	useIsFieldFocused,
} from "#questpie/admin/client/context/focus-context.js";
