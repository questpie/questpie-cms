import { adminModule, adminRpc } from "@questpie/admin/server";
import { ConsoleAdapter, q } from "questpie";
import { env } from "@/lib/env";
import { posts } from "./collections/index.js";
import { siteSettings } from "./globals/index.js";
import { configureSidebar } from "./sidebar.js";
import { configureDashboard } from "./dashboard.js";
import { r } from "./rpc.js";
import { migrations } from "../../migrations/index.js";

// ─── CMS Instance ───────────────────────────────────────────────────────────
// The built CMS application. Standalone — does NOT depend on appRpc.

export const cms = q({ name: "{{projectName}}" })
  .use(adminModule)
  .collections({ posts })
  .globals({ siteSettings })
  .sidebar(configureSidebar)
  .branding({ name: "{{projectName}}" })
  .dashboard(configureDashboard)
  .auth({
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    baseURL: env.APP_URL,
    basePath: "/api/cms/auth",
    secret: env.BETTER_AUTH_SECRET,
  })
  .migrations(migrations)
  .build({
    app: { url: env.APP_URL },
    db: { url: env.DATABASE_URL },
    storage: { basePath: "/api/cms" },
    email: {
      adapter: new ConsoleAdapter({ logHtml: false }),
    },
  });

// ─── RPC Router ─────────────────────────────────────────────────────────────
// Standalone router. Both cms and appRpc are passed to createFetchHandler()
// in routes/api/cms/$.ts. Add your custom RPC functions here.

export const appRpc = r.router({
  ...adminRpc,
});

// ─── Type Exports ───────────────────────────────────────────────────────────
// Used by: rpc.ts (AppCMS for typed handlers), client (AppCMS + AppRpc)

export type AppCMS = typeof cms;
export type AppRpc = typeof appRpc;
