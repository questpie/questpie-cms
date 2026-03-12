/**
 * City Portal Admin Configuration
 *
 * Re-exports the generated admin config.
 *
 * Sidebar, dashboard, branding, and admin locales are configured on the SERVER.
 * The client only carries registries (fields, views, components, widgets).
 */

export { default as admin } from "./.generated/client";

export type AdminConfig = typeof import("./.generated/client").default;
