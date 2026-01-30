/**
 * Layout views - admin layout and navigation
 *
 * All components auto-read from AdminProvider context when used inside it.
 */

// Core layout components
export { AdminLayout, type AdminLayoutProps } from "./admin-layout";

// Universal layout wrapper (for use with any router)
export {
  AdminLayoutProvider,
  type AdminLayoutProviderProps,
} from "./admin-layout-provider";

// All-in-one component (includes router)
export { AdminRoot, type AdminRootProps } from "./admin-root";

// Router component
export { AdminRouter, type AdminRouterProps } from "./admin-router";

// Sidebar component
export {
  AdminSidebar,
  type AdminSidebarProps,
  type LinkComponentProps,
} from "./admin-sidebar";
