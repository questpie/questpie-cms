import type { Session, User } from "better-auth/types";
import type { AccessMode } from "./types.js";

// ============================================================================
// Type Inference Utilities (Deprecated - Use Explicit Helpers Instead)
// ============================================================================

/**
 * @deprecated Use InferSessionFromApp<TApp> and getSession<TApp>() instead.
 *
 * Base session type from Better Auth.
 * The session object contains both `user` and `session` from Better Auth.
 *
 * @example
 * ```ts
 * // OLD (deprecated):
 * const session: InferSession = ctx.session;
 *
 * // NEW (recommended):
 * import { getSession } from "questpie";
 * import type { AppCMS } from "./cms";
 *
 * const session = getSession<AppCMS>(ctx.session);
 * ```
 */
export type InferSession = { user: User; session: Session };

/**
 * @deprecated Use InferDbFromApp<TApp> and getDb<TApp>() instead.
 *
 * @example
 * ```ts
 * // OLD (deprecated):
 * const db: InferDb = ctx.db;
 *
 * // NEW (recommended):
 * import { getDb } from "questpie";
 * import type { AppCMS } from "./cms";
 *
 * const db = getDb<AppCMS>(ctx.db);
 * ```
 */
export type InferDb = any;

// ============================================================================
// Explicit Type Helpers (Recommended Pattern)
// ============================================================================

/**
 * Infer the Session type from a CMS app instance.
 *
 * @example
 * ```ts
 * type MySession = InferSessionFromApp<typeof cms>;
 * ```
 */
export type InferSessionFromApp<TApp> = TApp extends {
	auth: { $Infer: { Session: infer S } };
}
	? S
	: { user: User; session: Session };

/**
 * Infer the database type from a CMS app instance.
 *
 * @example
 * ```ts
 * type MyDb = InferDbFromApp<typeof cms>;
 * ```
 */
export type InferDbFromApp<TApp> = TApp extends { db: infer D } ? D : any;

/**
 * Extract base CMS type without functions to avoid circular dependencies.
 * Useful when defining functions that need to reference the CMS instance.
 *
 * @example
 * ```ts
 * // In cms.ts - create base instance
 * const baseInstance = q({ name: "app" })
 *   .collections({ posts })
 *   .jobs({ sendEmail })
 *   .build();
 *
 * export type BaseCMS = InferBaseCMS<typeof baseInstance>;
 *
 * // In functions/index.ts
 * import type { BaseCMS } from "../cms";
 *
 * export const getPosts = q.fn({
 *   handler: async ({ app }) => {
 *     const cms = getApp<BaseCMS>(app);
 *     return cms.api.collections.posts.find(); // ✅ Typed
 *   }
 * });
 * ```
 */
export type InferBaseCMS<T> = T extends { config: infer TConfig }
	? { config: Omit<TConfig, "functions">; [key: string]: any }
	: never;

/**
 * Get typed CMS app instance from hook/job/function context.
 * Provides type-safe access to your CMS configuration and services.
 *
 * @example
 * ```ts
 * import { getApp } from "questpie";
 * import type { AppCMS } from "./cms";
 *
 * const posts = q.collection("posts").hooks({
 *   afterChange: async ({ app }) => {
 *     const cms = getApp<AppCMS>(app);
 *     // ✅ Fully typed access
 *     await cms.api.collections.posts.find();
 *     await cms.queue.sendEmail.publish({ to: "user@example.com" });
 *   }
 * });
 * ```
 */
export function getApp<TApp>(app: unknown): TApp {
	return app as TApp;
}

/**
 * Get typed database client from hook/job/function context.
 * The db client may be a transaction within the current operation scope.
 *
 * @example
 * ```ts
 * import { getDb } from "questpie";
 * import type { AppCMS } from "./cms";
 *
 * const posts = q.collection("posts").hooks({
 *   afterChange: async ({ app, db }) => {
 *     const cms = getApp<AppCMS>(app);
 *     const typedDb = getDb<AppCMS>(db);
 *
 *     // ✅ Fully typed Drizzle operations
 *     await typedDb.select().from(cms.config.collections.posts.table);
 *   }
 * });
 * ```
 */
export function getDb<TApp>(db: unknown): InferDbFromApp<TApp> {
	return db as InferDbFromApp<TApp>;
}

/**
 * Get typed session from hook/job/function context.
 * Returns null if unauthenticated, undefined if session not resolved.
 *
 * @example
 * ```ts
 * import { getSession } from "questpie";
 * import type { AppCMS } from "./cms";
 *
 * const posts = q.collection("posts").hooks({
 *   afterChange: async ({ session }) => {
 *     const typedSession = getSession<AppCMS>(session);
 *
 *     if (!typedSession) {
 *       throw new Error("Unauthorized");
 *     }
 *
 *     // ✅ Typed session access
 *     const userId = typedSession.user.id;
 *     const role = typedSession.user.role;
 *   }
 * });
 * ```
 */
export function getSession<TApp>(
	session: unknown,
): InferSessionFromApp<TApp> | null | undefined {
	return session as InferSessionFromApp<TApp> | null | undefined;
}

// ============================================================================
// Request Context
// ============================================================================

/**
 * Minimal per-request context.
 * Contains session, locale, accessMode, and optional db override.
 * Services are accessed via app.* not context.*
 */
export interface RequestContext {
	/**
	 * Auth session from Better Auth (contains user + session).
	 * - undefined = session not resolved (e.g. system operation without request)
	 * - null = explicitly unauthenticated
	 * - object = authenticated session with user
	 *
	 * @example
	 * ```ts
	 * // Check if authenticated
	 * if (!ctx.session) {
	 *   throw new Error('Unauthorized');
	 * }
	 *
	 * // Access user
	 * const userId = ctx.session.user.id;
	 * const role = ctx.session.user.role;
	 *
	 * // Access session metadata
	 * const expiresAt = ctx.session.session.expiresAt;
	 * ```
	 */
	session?: InferSession | null;

	/**
	 * Current locale for this request
	 */
	locale?: string;

	/**
	 * Default locale (fallback)
	 */
	defaultLocale?: string;

	/**
	 * Whether to fallback to default locale when current locale translation is missing.
	 */
	localeFallback?: boolean;

	/**
	 * Access mode - defaults to 'system' since CMS API is backend-only.
	 * Set to 'user' explicitly when handling user requests with access control.
	 */
	accessMode?: AccessMode;

	/**
	 * Database client - may be transaction within hook/handler scope.
	 * All operations on this client participate in the current transaction if one is active.
	 *
	 * @example
	 * ```ts
	 * afterChange: async ({ db, data }) => {
	 *   // This INSERT is part of the same transaction as the main CRUD operation
	 *   await db.insert(auditLog).values({
	 *     recordId: data.id,
	 *     action: 'created',
	 *     timestamp: new Date()
	 *   });
	 * }
	 * ```
	 */
	db?: InferDb;

	/**
	 * Allow extensions for custom context properties.
	 * Use `extendContext` in adapter config to add custom properties.
	 */
	[key: string]: unknown;
}
