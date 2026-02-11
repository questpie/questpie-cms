# AGENTS.md

Source-of-truth guidance for AI agents working in this QuestPie CMS project.

## Project Overview

- **Framework**: TanStack Start (React) + Vite + Nitro (Bun preset)
- **CMS**: QuestPie — headless CMS framework with config-driven admin UI
- **Database**: PostgreSQL (via Drizzle ORM)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Auth**: Better Auth (email/password)
- **Package manager**: Bun

## File Naming Conventions

- Collections: `*.collection.ts` (e.g., `posts.collection.ts`)
- Globals: `*.global.ts` (e.g., `site-settings.global.ts`)
- RPC functions: `*.function.ts` or grouped in `functions/` directory
- Server functions (TanStack): `*.function.ts` in `src/lib/`

## Architecture Rules

### Server-First Split

| Directory | Responsibility | Defines |
|---|---|---|
| `questpie/server/` | **WHAT** — contracts and behavior | Schema, access, hooks, RPC, jobs |
| `questpie/admin/` | **HOW** — rendering concerns | Branding, locale, custom renderers |
| `routes/` | **Mounting** — HTTP wiring | Route handlers, no business logic |

### Registry-First Philosophy (Critical)

- Never hardcode admin/view/component names in server runtime logic.
- Fields: resolve from `QuestpieBuilder.state.fields` via builder.
- Views: resolve from `QuestpieBuilder.state.listViews` / `QuestpieBuilder.state.editViews`.
- Components: resolve `c.*` helpers from `QuestpieBuilder.state.components`.
- Admin UI config is UI-only; do NOT add UI fields to the database schema.

### Collection Pattern

Keep the entire chain in one file — single source of truth per entity:

```ts
// src/questpie/server/collections/posts.collection.ts
import { qb } from "@/questpie/server/builder";

export const posts = qb
  .collection("posts")
  .fields((f) => ({
    title: f.text({ label: "Title", required: true }),
    slug: f.text({ label: "Slug", required: true, input: "optional" }),
    content: f.richText({ label: "Content" }),
    published: f.boolean({ label: "Published", default: false }),
  }))
  .title(({ f }) => f.title)
  .admin(({ c }) => ({
    label: "Posts",
    icon: c.icon("ph:article"),
  }))
  .list(({ v }) => v.table({}))
  .form(({ v, f }) =>
    v.form({
      sidebar: { position: "right", fields: [f.slug, f.published] },
      fields: [f.title, f.content],
    })
  );
```

### Global Pattern

```ts
// src/questpie/server/globals/site-settings.global.ts
import { qb } from "@/questpie/server/builder";

export const siteSettings = qb
  .global("site_settings")
  .fields((f) => ({ ... }))
  .admin(({ c }) => ({ label: "Site Settings", icon: c.icon("ph:gear") }))
  .form(({ v, f }) => v.form({ fields: [...] }));
```

### Composition Root (`app.ts`)

The `app.ts` file is the single place where everything is wired together:

```ts
export const cms = q({ name: "my-app" })
  .use(adminModule)
  .collections({ posts })
  .globals({ siteSettings })
  .sidebar(configureSidebar)     // from ./sidebar.ts
  .dashboard(configureDashboard) // from ./dashboard.ts
  .auth({ ... })
  .migrations(migrations)
  .build({ db: { url }, app: { url }, ... });
```

## RPC — Type-Safe Server Functions

QuestPie provides end-to-end type-safe RPC. `cms` and `appRpc` are **two independent instances** — no circular dependency.

### How typing works

```ts
// rpc.ts — type-only import (erased at runtime, no circular dependency)
import { rpc } from "questpie";
import type { AppCMS } from "./app.js";

export const r = rpc<AppCMS>(); // ← app is now fully typed in all handlers
```

```ts
// app.ts — imports r (runtime), exports cms and appRpc separately
import { r } from "./rpc.js";

export const cms = q({...}).build({...});        // ← standalone CMS instance
export const appRpc = r.router({ ...adminRpc }); // ← standalone RPC router
// Both are passed to createFetchHandler() in the route, but don't depend on each other

export type AppCMS = typeof cms;
export type AppRpc = typeof appRpc;
```

### 1. Define a function

Create `src/questpie/server/functions/my-function.ts`:

```ts
import { r } from "@/questpie/server/rpc";
import { z } from "zod";

export const getActiveUsers = r.fn({
  schema: z.object({
    role: z.enum(["admin", "editor"]).optional(),
  }),
  handler: async ({ input, app }) => {
    // input: { role?: "admin" | "editor" } — typed from schema
    // app: AppCMS — fully typed, autocomplete for collections, db, etc.
    const users = await app.api.collections.user.find({
      where: input.role ? { role: input.role } : undefined,
    });
    return { users: users.docs, total: users.totalDocs };
  },
});
```

### 2. Register in the RPC router

In `src/questpie/server/app.ts`:

```ts
import { getActiveUsers } from "./functions/my-function.js";

export const appRpc = r.router({
  ...adminRpc,       // Built-in admin RPC endpoints
  getActiveUsers,    // Your custom function
});

export type AppRpc = typeof appRpc; // Export type for client
```

### 3. Call from client (fully type-safe)

```ts
import { client } from "@/lib/cms-client";

// Input is validated by TypeScript — wrong types = compile error
const result = await client.rpc.getActiveUsers({ role: "admin" });
// result is typed as { users: User[], total: number }
```

### Type flow

```
rpc<AppCMS>()                       → r.fn() handlers get typed `app`
  ↓
r.fn({ schema, handler })          → JsonFunctionDefinition<TInput, TOutput, AppCMS>
  ↓
r.router({ myFn })                 → AppRpc type (preserves all function types)
  ↓
createClient<AppCMS, AppRpc>(...)   → client.rpc is fully typed
  ↓
client.rpc.myFn(input)             → Input: compile-time + runtime (Zod) validation
                                   → Output: inferred from handler return type
```

### Access control

```ts
export const adminOnlyFn = r.fn({
  access: ({ session }) => session?.user?.role === "admin",
  schema: z.object({ ... }),
  handler: async ({ input, app }) => { ... },
});
```

### With TanStack Query

```ts
import { useQuery, useMutation } from "@tanstack/react-query";

// Query
const { data } = useQuery({
  queryKey: ["activeUsers", role],
  queryFn: () => client.rpc.getActiveUsers({ role }),
});

// Mutation
const mutation = useMutation({
  mutationFn: (input) => client.rpc.createSomething(input),
});
```

## Reactive Field System

Fields support reactive behaviors in `meta.admin`:

- **`hidden`**: Conditionally hide fields — `({ data }) => !data.isPublished`
- **`readOnly`**: Make fields read-only based on conditions
- **`disabled`**: Disable fields conditionally
- **`compute`**: Auto-compute values — `{ handler, deps, debounce }`

Type annotations are required for reactive handlers:
```ts
hidden: ({ data }: { data: Record<string, unknown> }) => !data.isPublished
```

## Icons

Use `@iconify/react` with Phosphor icon set:
- Prefix: `ph:` (e.g., `ph:house`, `ph:article`, `ph:gear`)
- Weight variants: `-bold`, `-fill`, `-duotone`, `-light`, `-thin`
- Regular weight = no suffix (default)
- Naming: PascalCase → kebab-case (e.g., `CaretDown` → `ph:caret-down`)

In server/admin config, use `c.icon("ph:icon-name")`.

## Environment Variables

Type-safe via `@t3-oss/env-core` in `src/lib/env.ts`. All env vars must be:
1. Declared with Zod schema in `env.ts`
2. Accessed via `env.VAR_NAME` (not `process.env.VAR_NAME`)

## Commands

```bash
bun dev                     # Start dev server
bun build                   # Build for production
bun start                   # Start production server
bun questpie migrate        # Run migrations
bun questpie migrate:create # Create new migration
docker compose up -d        # Start PostgreSQL
```

## Anti-Patterns

- **Schema rules in client code** — Validation, access control, and hooks belong on the server.
- **Splitting a collection across files** — Keep the full `.collection().fields().admin().list().form()` chain in one file.
- **Business logic in route handlers** — Routes only mount handlers. Logic goes in RPC functions, hooks, or jobs.
- **Hardcoding view components** — Use the registry pattern for custom views.
- **Using `process.env` directly** — Use the `env` object from `src/lib/env.ts`.

## Documentation & Resources

- **QuestPie Docs**: https://questpie.com/docs
- **Getting Started**: https://questpie.com/docs/getting-started
- **Project Structure**: https://questpie.com/docs/getting-started/project-structure
- **Your First CMS**: https://questpie.com/docs/getting-started/your-first-cms
- **Architecture Principles**: https://questpie.com/docs/mentality
- **Local API Docs**: http://localhost:3000/api/cms/docs (Scalar UI)
