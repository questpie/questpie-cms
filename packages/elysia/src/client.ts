import { treaty } from "@elysiajs/eden";
import type { Treaty } from "@elysiajs/eden";
import { createClient, type QuestpieClient } from "questpie/client";
import type { Questpie } from "questpie";
import type Elysia from "elysia";

/**
 * Elysia client configuration
 */
export type ElysiaClientConfig = {
  /**
   * Server URL (domain with optional port, no protocol needed for Eden)
   * @example 'localhost:3000'
   * @example 'api.example.com'
   */
  server: string;

  /**
   * Custom fetch implementation
   * @default globalThis.fetch
   */
  fetch?: typeof fetch;

  /**
   * Base path for CMS routes
   * @default '/cms'
   */
  basePath?: string;

  /**
   * Default headers to include in all requests
   */
  headers?: Record<string, string>;
};

/**
 * Create a unified client that combines QUESTPIE CMS CRUD operations
 * with Elysia's native Eden Treaty client for custom routes
 *
 * @example
 * ```ts
 * import { createClientFromEden } from '@questpie/elysia/client'
 * import type { App } from './server'
 * import type { AppCMS } from './cms'
 *
 * const client = createClientFromEden<App, AppCMS>({
 *   server: 'localhost:3000'
 * })
 *
 * // Use CMS CRUD operations
 * const posts = await client.collections.posts.find({ limit: 10 })
 *
 * // Use Eden Treaty for custom routes (fully type-safe!)
 * const result = await client.api.custom.route.get()
 * ```
 */
export function createClientFromEden<
  TApp extends Elysia<any, any, any, any, any, any, any> = any,
  TCMS extends Questpie<any> = any,
>(config: ElysiaClientConfig): QuestpieClient<TCMS> & Treaty.Create<TApp> {
  // Determine baseURL with protocol for CMS client
  const baseURL = config.server.startsWith("http")
    ? config.server
    : `http://${config.server}`;

  // Create CMS client for CRUD operations
  const cmsClient = createClient<TCMS>({
    baseURL,
    fetch: config.fetch,
    basePath: config.basePath,
    headers: config.headers,
  });

  // Create Eden Treaty client for custom routes
  const edenClient = treaty<TApp>(config.server, {
    fetcher: config.fetch,
    headers: config.headers,
  });

  // Merge both clients
  return {
    ...edenClient,
    collections: cmsClient.collections,
    globals: cmsClient.globals,
  } as QuestpieClient<TCMS> & Treaty.Create<TApp>;
}
