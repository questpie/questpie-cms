/**
 * Auth Client Configuration
 *
 * Type-safe Better Auth client for admin authentication
 */

import { createAdminAuthClient } from "@questpie/admin/client";
import type { AppCMS } from "@/questpie/server/cms";

export const authClient = createAdminAuthClient<AppCMS>({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.APP_URL || "http://localhost:3000",
  basePath: "/api/cms/auth",
});

export type AuthClient = typeof authClient;
