/**
 * TanStack Router Adapter
 *
 * Convenience helpers for TanStack Router/Start integration.
 *
 * @example
 * ```ts
 * import { createTanStackAuthGuard } from "@questpie/admin/server/adapters/tanstack";
 * import { cms } from "~/questpie/server/cms";
 *
 * export const Route = createFileRoute("/admin")({
 *   beforeLoad: createTanStackAuthGuard({ cms, loginPath: "/admin/login" }),
 * });
 * ```
 */

import type { Questpie } from "questpie";
import { requireAdminAuth } from "../auth-helpers.js";

/**
 * Options for TanStack auth guard
 */
export interface TanStackAuthGuardOptions {
  /**
   * The CMS instance with auth configured
   */
  cms: Questpie<any>;

  /**
   * Path to redirect to when not authenticated
   * @default "/admin/login"
   */
  loginPath?: string;

  /**
   * Required role for access
   * @default "admin"
   */
  requiredRole?: string;

  /**
   * Query parameter name for redirect URL
   * @default "redirect"
   */
  redirectParam?: string;
}

/**
 * Context passed to TanStack Router beforeLoad
 */
export interface BeforeLoadContext {
  context: {
    request: Request;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Create a TanStack Router beforeLoad guard for admin authentication.
 *
 * Returns a function that can be used as beforeLoad in route definitions.
 * Throws a redirect Response when authentication fails.
 *
 * @example
 * ```ts
 * import { createFileRoute } from "@tanstack/react-router";
 * import { createTanStackAuthGuard } from "@questpie/admin/server/adapters/tanstack";
 * import { cms } from "~/questpie/server/cms";
 *
 * export const Route = createFileRoute("/admin")({
 *   beforeLoad: createTanStackAuthGuard({
 *     cms,
 *     loginPath: "/admin/login",
 *     requiredRole: "admin",
 *   }),
 *   component: AdminLayout,
 * });
 * ```
 *
 * @example With custom context
 * ```ts
 * export const Route = createFileRoute("/admin")({
 *   beforeLoad: async (ctx) => {
 *     // Run auth guard
 *     await createTanStackAuthGuard({ cms })(ctx);
 *
 *     // Add additional context
 *     return { user: ctx.context.user };
 *   },
 * });
 * ```
 */
export function createTanStackAuthGuard({
  cms,
  loginPath = "/admin/login",
  requiredRole = "admin",
  redirectParam = "redirect",
}: TanStackAuthGuardOptions) {
  return async function beforeLoad({ context }: BeforeLoadContext) {
    const request = context.request;

    if (!request) {
      console.warn(
        "createTanStackAuthGuard: No request in context. " +
          "Make sure you're using TanStack Start with SSR enabled.",
      );
      return;
    }

    const redirect = await requireAdminAuth({
      request,
      cms,
      loginPath,
      requiredRole,
      redirectParam,
    });

    if (redirect) {
      // TanStack Router expects thrown Response for redirects
      throw redirect;
    }
  };
}

/**
 * Create a TanStack Router loader that injects the admin session into context.
 *
 * Use this when you need access to the session in your components.
 *
 * @example
 * ```ts
 * import { createTanStackSessionLoader } from "@questpie/admin/server/adapters/tanstack";
 *
 * export const Route = createFileRoute("/admin")({
 *   loader: createTanStackSessionLoader({ cms }),
 *   component: AdminLayout,
 * });
 *
 * function AdminLayout() {
 *   const { session } = Route.useLoaderData();
 *   return <div>Hello {session?.user?.name}</div>;
 * }
 * ```
 */
export function createTanStackSessionLoader({ cms }: { cms: Questpie<any> }) {
  return async function loader({ context }: BeforeLoadContext) {
    const request = context.request;

    if (!request || !cms.auth) {
      return { session: null };
    }

    try {
      const session = await cms.auth.api.getSession({
        headers: request.headers,
      });

      return { session: session ?? null };
    } catch {
      return { session: null };
    }
  };
}
