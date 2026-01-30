/**
 * @questpie/admin Views
 *
 * Full-page and section-level view components.
 * Views are smart components that handle routing, data fetching, and state.
 *
 * Architecture:
 * - ui/        - Headless/styled primitives (Button, Card, Input)
 * - primitives/ - Generic input wrappers with callback API
 * - fields/    - react-hook-form connected field components
 * - views/     - Route-level components with business logic (this directory)
 * - features/  - Complex feature modules (Puck editor, media library)
 */

// Auth views
export * from "./auth";
// Collection views
export * from "./collection";
// Common/utility views
export * from "./common";
// Layout views
export * from "./layout";

// Page views (full page components)
export * from "./pages";
