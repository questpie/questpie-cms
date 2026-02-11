import { createClient } from "questpie/client";
import type { AppCMS, AppRpc } from "@/questpie/server/app";

export const client = createClient<AppCMS, AppRpc>({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.APP_URL || "http://localhost:3000",
  basePath: "/api/cms",
});

export type CMSClient = typeof client;
