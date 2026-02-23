/**
 * @questpie/admin/server - Server-Side Admin Module
 *
 * Server-side exports for the admin panel backend.
 * Use this when setting up your app with the `admin()` module.
 *
 * @example
 * ```ts
 * import { config } from "questpie";
 * import { admin } from "@questpie/admin/server";
 *
 * export default config({
 *   modules: [admin()],
 *   db: { url: process.env.DATABASE_URL },
 * });
 * ```
 */

// Re-export everything from server index
export * from "#questpie/admin/server/index.js";
