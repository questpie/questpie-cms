/**
 * @questpie/admin - Main Entry Point
 *
 * Re-exports the most commonly used items from client.
 * For server-side functionality, use "@questpie/admin/server".
 *
 * @example
 * ```ts
 * import { qa, adminModule } from "@questpie/admin";
 *
 * const admin = qa()
 *   .use(adminModule)
 *   .collections({ posts: postsAdmin });
 * ```
 */

// Re-export everything from client
export * from "./client.js";
