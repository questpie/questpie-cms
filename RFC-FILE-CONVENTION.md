# RFC: File-Convention + Codegen Architecture

> Status: **Draft**
> Authors: @drepkovsky
> Date: 2026-02-23

## Summary

Remove `QuestpieBuilder` and replace the manual `app.ts` entrypoint with **automatic codegen from file conventions**. Everything else stays the same — `CollectionBuilder`, `GlobalBuilder`, `Questpie` runtime, admin extensions, field system, RPC, auth, migrations, adapters — all unchanged.

## What Changes

| What | Before | After |
|------|--------|-------|
| **`QuestpieBuilder`** (`q()`, `.use()`, `.build()`) | Manual chain that accumulates full app state as one giant type | **Removed.** Codegen handles composition. |
| **`Questpie` app instance** | Created manually via `builder.build()` in user-written `app.ts` | **Created automatically** by codegen in `.generated/index.ts` |
| **App distribution** | `export const app = qb.collections({...}).build({...})` — user writes and maintains | **Auto-generated** from discovered files + modules |
| **Modules** (adminModule, starterModule) | `QuestpieBuilder` instances composed via `.use()` | `module()` — plain data objects with collections, fields, auth, etc. |
| **`CollectionBuilder`** | No change | **No change** — `.fields()`, `.hooks()`, `.access()`, `.admin()`, `.list()`, `.form()` all stay |
| **`GlobalBuilder`** | No change | **No change** |
| **`Questpie` runtime class** | No change | **No change** — just created differently |
| **Admin extensions** (monkey-patching, augmentation) | No change | **No change** |
| **Field system, RPC, auth, migrations, adapters** | No change | **No change** |

**In short:** only `QuestpieBuilder` is removed and the app entrypoint becomes auto-generated. Everything downstream is identical.

## Motivation

### The Problem

`QuestpieBuilder` accumulates a massive generic type parameter `TState` as methods are called. With 9+ collections in `adminModule` alone, TypeScript cannot serialize the inferred type into `.d.ts` files (TS7056). Today this is "solved" by annotating `adminModule` as `QuestpieBuilder<any>`, which causes `[x: string]: any` index signatures to leak through `.use()` — killing autocomplete for every downstream consumer.

This is not fixable within `QuestpieBuilder`. The type is genuinely too large. Named helper types (`Override`, `Prettify`, `PrettifiedAnyCollectionOrBuilder`) reduce the size but don't eliminate the fundamental issue: a single variable carrying the state of an entire application.

### The Solution

No single variable carries the full app state at the type level. Instead:

1. Each collection, global, job, function lives in its own file (as it often already does)
2. Codegen scans files + modules and generates an entrypoint with explicit imports
3. The generated type is a flat interface of `typeof` references — each referencing one file's export
4. TypeScript serializes `typeof` references by declaration path, not by expanding the full type

### Additional Benefits

**Enforced project structure** — The file convention forces a clean separation that makes codebases consistent across all QUESTPIE projects. This is critical for:

- **AI/agentic discoverability** — An AI agent can find any collection by globbing `**/collections/*.ts` or `**/features/*/collections/*.ts`. No need to trace through builder chains, `.use()` calls, or re-exports. Each file is self-contained and independently readable.
- **Onboarding** — New developers immediately understand where things live.
- **Code review** — Changes to a collection are isolated to one file.

---

## Design

### 1. What Gets Removed: `QuestpieBuilder`

Only `QuestpieBuilder` and its associated chain methods (`q()`, `.use()`, `.build()`, `.collections()`, `.globals()`, `.jobs()`, `.fields()`, `.auth()`, `.locale()`, `.messages()`, `.context()`, `.hooks()`, `.defaultAccess()`, `.emailTemplates()`).

Users interact with:

- `collection(name, fields)` — same `CollectionBuilder` as today, just standalone
- `global(name, fields)` — same `GlobalBuilder` as today, just standalone
- `module()` — defines a reusable module (data object replacing `QuestpieBuilder` for packages)
- `config()` — defines the project config (replaces manual `builder.build()` call)

The `CollectionBuilder` and `GlobalBuilder` APIs are **100% unchanged**.

### 2. File Convention

Two supported layouts: **by-type** and **by-feature**. Both can coexist. Codegen discovers both.

#### By-Type Layout

```
src/questpie/
├── questpie.config.ts
├── collections/
│   ├── posts.ts
│   ├── categories.ts
│   └── comments.ts
├── globals/
│   └── site-settings.ts
├── auth.ts
├── jobs/
│   └── send-newsletter.ts
├── functions/
│   ├── search.ts
│   └── admin/                  # nested → nested RPC route
│       ├── stats.ts
│       └── users/
│           └── export.ts       # → admin.users.export
├── blocks/
│   ├── hero.ts
│   └── call-to-action.ts
├── messages/
│   ├── en.ts
│   └── sk.ts
└── .generated/                 # AUTO-GENERATED — .gitignore'd
    └── index.ts
```

#### By-Feature Layout

```
src/questpie/
├── questpie.config.ts
├── features/
│   ├── blog/
│   │   ├── collections/
│   │   │   ├── posts.ts
│   │   │   └── comments.ts
│   │   ├── globals/
│   │   │   └── blog-settings.ts
│   │   ├── jobs/
│   │   │   └── send-newsletter.ts
│   │   ├── functions/
│   │   │   └── related-posts.ts
│   │   └── blocks/
│   │       └── featured-post.ts
│   ├── commerce/
│   │   ├── collections/
│   │   │   ├── products.ts
│   │   │   └── orders.ts
│   │   ├── functions/
│   │   │   └── checkout.ts
│   │   └── jobs/
│   │       └── process-order.ts
│   └── shared/
│       └── collections/
│           └── tags.ts
├── auth.ts
├── messages/
│   ├── en.ts
│   └── sk.ts
└── .generated/
    └── index.ts
```

#### Mixed Layout (both coexist)

```
src/questpie/
├── questpie.config.ts
├── collections/
│   └── pages.ts                # top-level collections
├── features/
│   └── blog/
│       └── collections/
│           └── posts.ts        # feature-scoped collections
├── auth.ts
└── .generated/
    └── index.ts
```

#### Rules

| Directory | Export | Key derivation |
|-----------|--------|----------------|
| `collections/*.ts` | `default` — a `CollectionBuilder` or `Collection` | filename: `site-settings.ts` → `siteSettings` |
| `globals/*.ts` | `default` — a `GlobalBuilder` or `Global` | filename: `site-settings.ts` → `siteSettings` |
| `jobs/*.ts` | `default` — a job definition | filename |
| `functions/*.ts` | `default` — an RPC function definition | filename, nested dirs → nested routes |
| `functions/**/*.ts` | `default` — nested RPC function | path: `admin/users/export.ts` → `admin.users.export` |
| `blocks/*.ts` | `default` — a block builder/definition | filename |
| `messages/*.ts` | `default` — translation messages object | filename = locale code |
| `auth.ts` | `default` — auth options object | single file |
| `questpie.config.ts` | `default` — project configuration | single file |

**Key derivation**: kebab-case filename → camelCase key. `send-newsletter.ts` → `sendNewsletter`.

### 3. Collection & Global API

No `q` builder needed. Collections and globals are standalone:

```ts
// collections/posts.ts
import { collection } from "questpie";

export default collection("posts", ({ f }) => ({
  title: f.text({ label: "Title", required: true }),
  slug: f.slug({ from: "title" }),
  content: f.richText({ label: "Content" }),
  published: f.boolean({ label: "Published", default: false }),
  author: f.relation({ to: "users" }),
  category: f.relation({ to: "categories" }),
}))
  .options({ timestamps: true, softDelete: true })
  .hooks({
    beforeChange: [
      async ({ data, operation, app }) => {
        // `app` is auto-typed via generated types — see section 8
        if (operation === "create") {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
  })
  .access({
    read: () => true,
    create: ({ session }) => session?.user.role === "admin",
    update: ({ session }) => session?.user.role === "admin",
    delete: ({ session }) => session?.user.role === "admin",
  })
  .indexes(({ table }) => [
    { columns: [table.slug], unique: true },
  ]);
```

```ts
// globals/site-settings.ts
import { global } from "questpie";

export default global("siteSettings", ({ f }) => ({
  siteName: f.text({ label: "Site Name", required: true }),
  description: f.textarea({ label: "Description" }),
  logo: f.upload({ label: "Logo" }),
}));
```

#### How `f` gets module field types (e.g. `f.richText`)

The `collection()` and `global()` standalone factories use `BuiltinFields` by default (15 built-in types). Module field types are made available through **TypeScript declaration merging** + codegen:

1. The `@questpie/admin` package declares `richText` and `blocks` on the `BuiltinFields` interface via `declare module "questpie"`
2. When you import `@questpie/admin`, the declaration merge kicks in and `f.richText` becomes available
3. Codegen ensures the admin package is imported in `.generated/index.ts`, activating the merge

This means in any collection file, `f.richText()` just works as long as `@questpie/admin` is a dependency — no explicit `qb.fields(adminFields)` needed.

### 4. `config()`

```ts
// questpie.config.ts
import { config } from "questpie";
import { admin } from "@questpie/admin";

export default config({
  modules: [admin()],
  
  // Runtime
  app: { url: process.env.APP_URL! },
  db: { url: process.env.DATABASE_URL! },
  
  // Optional runtime adapters
  storage: { driver: s3Driver({ ... }) },
  email: { adapter: smtpAdapter({ ... }) },
  queue: { adapter: pgBossAdapter() },
  search: createPostgresSearchAdapter(),
  
  // Optional settings
  locale: {
    locales: ["en", "sk"],
    defaultLocale: "en",
  },
  
  // CLI
  cli: {
    migrations: { directory: "./src/migrations" },
    seeds: { directory: "./src/seeds" },
  },
});
```

`config()` is a plain identity function for type-checking. No builder, no chain. The object is the complete project configuration.

### 5. `module()`

Modules are **data objects** — not builders. A module provides a subset of what a project provides:

```ts
// @questpie/admin/server
import { module } from "questpie";

export const admin = (options?: AdminOptions) => module({
  name: "questpie-admin",
  
  // Module dependencies (recursive)
  modules: [starter()],
  
  // What this module contributes
  collections: {
    user: adminUserCollection,
    assets: adminAssetsCollection,
    session: sessionCollection,
    account: accountCollection,
    verification: verificationCollection,
    apikey: apikeyCollection,
    adminSavedViews: savedViewsCollection,
    adminPreferences: preferencesCollection,
    adminLocks: locksCollection,
  },
  globals: {},
  jobs: { realtimeCleanup },
  fields: adminFields,
  auth: coreAuthOptions,
  migrations: adminMigrations,
  messages: coreMessages,
  defaultAccess: requireAuth,
  
  // RPC functions
  functions: adminRpc,
  
  // Codegen plugins — this is how admin extends the convention
  plugins: [
    adminPlugin(options),
  ],
});
```

#### Module merge rules

When codegen resolves modules (depth-first, left-to-right from `config.modules`):

| Key | Strategy | Notes |
|-----|----------|-------|
| `collections` | Spread-merge, later wins | User collections override module collections with same name |
| `globals` | Spread-merge, later wins | |
| `jobs` | Spread-merge, later wins | |
| `fields` | Spread-merge, later wins | Module fields extend the field builder proxy |
| `auth` | Deep-merge via `mergeAuthOptions()` | Recursive merge of Better Auth config |
| `migrations` | Concatenate | All modules' + user migrations are kept |
| `messages` | Deep-merge per locale | Later translations override same keys |
| `defaultAccess` | Last wins | User config > later module > earlier module |
| `functions` | Spread-merge, later wins | |
| `plugins` | Concatenate | All plugins are applied |

**User code always wins over modules.** A collection in `collections/user.ts` overrides the admin module's `user` collection.

### 6. Codegen Plugins

A codegen plugin is how modules extend the file convention with new discovery targets. The core framework discovers `collections/`, `globals/`, `jobs/`, `functions/`, `messages/`, `auth.ts`. Plugins add more:

```ts
// What a plugin looks like
interface CodegenPlugin {
  name: string;
  
  // Additional directories to scan
  discover?: {
    // key = state key, value = glob pattern relative to questpie root
    [key: string]: string | string[];
  };
  
  // Transform the generated output
  transform?: (ctx: CodegenContext) => void;
}

// admin plugin example
function adminPlugin(options?: AdminOptions): CodegenPlugin {
  return {
    name: "questpie-admin",
    discover: {
      blocks: ["blocks/*.ts", "features/*/blocks/*.ts"],
    },
    transform(ctx) {
      // Add sidebar config if user provides one
      // Add dashboard config
      // Add listViews, editViews, components registrations
      // Add admin-specific collection extensions (.admin(), .list(), .form())
      
      // Apply branding from options
      if (options?.branding) {
        ctx.set("branding", options.branding);
      }
    },
  };
}
```

Plugins enable admin to register `blocks/` discovery, future plugins could add `workflows/`, `webhooks/`, etc. — all without changing core framework code.

#### How admin extensions (.admin(), .list(), .form()) work with plugins

Admin UI config on collections (`.admin()`, `.list()`, `.form()`, `.actions()`, `.preview()`) stays as chained methods on `CollectionBuilder` — they're called in the collection file directly:

```ts
// collections/posts.ts
import { collection } from "questpie";

export default collection("posts", ({ f }) => ({
  title: f.text({ required: true }),
  content: f.richText(),
}))
  // Admin UI config — these are runtime-only, no type parameter changes
  .admin({ icon: "ph:article", label: "Blog Posts" })
  .list(({ v, f }) => v.table({ columns: [f.title, f.published] }))
  .form(({ v, f }) => v.form({
    fields: [f.title, f.content, f.published],
  }));
```

No plugin needed for this — it's part of the collection definition. The plugin's job is to discover and register things that live *outside* of individual collection files (blocks, sidebar, dashboard, branding).

### 7. RPC Functions — Nested Folders = Nested Routes

```
functions/
├── search.ts                    → rpc.search()
├── contact.ts                   → rpc.contact()
└── admin/
    ├── stats.ts                 → rpc.admin.stats()
    └── users/
        ├── export.ts            → rpc.admin.users.export()
        └── import.ts            → rpc.admin.users.import()
```

Each file exports a default function definition:

```ts
// functions/admin/users/export.ts
import { z } from "zod";

export default {
  schema: z.object({ format: z.enum(["csv", "json"]) }),
  handler: async ({ input, app }) => {
    const users = await app.api.collections.user.find({});
    // ... export logic
  },
};
```

Codegen generates a nested router type:

```ts
// .generated/index.ts (partial)
export interface AppFunctions {
  search: typeof import("../functions/search").default;
  contact: typeof import("../functions/contact").default;
  admin: {
    stats: typeof import("../functions/admin/stats").default;
    users: {
      export: typeof import("../functions/admin/users/export").default;
      import: typeof import("../functions/admin/users/import").default;
    };
  };
}
```

### 8. Auto-Discovery of App Type

Today, hooks and functions receive `app` typed as `any` or requiring manual type annotation (`typedApp<BaseCMS>(ctx.app)`). With codegen, the app type is auto-discovered.

#### How it works

Codegen generates a typed `app` export. All hook callbacks and function handlers reference this generated type:

```ts
// .generated/index.ts (partial)
import type { Questpie } from "questpie";

export interface AppCollections {
  posts: typeof import("../collections/posts").default;
  categories: typeof import("../collections/categories").default;
  // + module collections
  user: typeof adminModule.collections.user;
  assets: typeof adminModule.collections.assets;
  // ...
}

export interface AppGlobals {
  siteSettings: typeof import("../globals/site-settings").default;
}

// The app type — fully typed, no inference chain
export type App = Questpie<{
  collections: AppCollections;
  globals: AppGlobals;
  jobs: AppJobs;
  functions: AppFunctions;
  auth: AppAuth;
}>;

// Runtime instance
export const app: App = createApp(resolvedConfig);
```

#### Declaration merging for hooks

The generated file also augments the `questpie` module so hooks receive the correct `app` type automatically:

```ts
// .generated/index.ts (partial)
declare module "questpie" {
  interface QuestpieAppType {
    app: App;
  }
}
```

Now in any collection file:

```ts
// collections/posts.ts
export default collection("posts", ({ f }) => ({ ... }))
  .hooks({
    beforeChange: [
      async ({ data, app }) => {
        // `app` is typed as `App` — full autocomplete for
        // app.api.collections.categories.find(...)
        // No manual type annotation needed!
        const cats = await app.api.collections.categories.find({});
        return data;
      },
    ],
  });
```

This eliminates the `typedApp<BaseCMS>(ctx.app)` pattern entirely. Every hook, access function, and RPC handler gets a fully typed `app` for free.

### 9. Codegen Output

`questpie generate` (or `questpie dev` for watch mode) produces `.generated/index.ts`:

```ts
// AUTO-GENERATED by questpie — DO NOT EDIT
// Source: questpie.config.ts + file convention discovery

import { createApp, type Questpie } from "questpie/runtime";

// --- Modules ---
import { admin } from "@questpie/admin";
const adminModule = admin();
const starterModule = adminModule.modules[0]; // resolved dependency

// --- User Collections ---
import posts from "../collections/posts";
import categories from "../collections/categories";

// --- User Globals ---
import siteSettings from "../globals/site-settings";

// --- User Auth ---
import userAuth from "../auth";

// --- User Jobs ---
import sendNewsletter from "../jobs/send-newsletter";

// --- User Functions ---
import search from "../functions/search";
import adminStats from "../functions/admin/stats";
import adminUsersExport from "../functions/admin/users/export";

// --- User Blocks (discovered by admin plugin) ---
import heroBlock from "../blocks/hero";
import ctaBlock from "../blocks/call-to-action";

// --- User Messages ---
import en from "../messages/en";
import sk from "../messages/sk";

// --- Config ---
import rawConfig from "../questpie.config";

// ============================================================
// Composed Types (all typeof references — zero inference cost)
// ============================================================

export interface AppCollections {
  // Module: questpie-starter
  assets: typeof starterModule.collections.assets;
  session: typeof starterModule.collections.session;
  account: typeof starterModule.collections.account;
  verification: typeof starterModule.collections.verification;
  apikey: typeof starterModule.collections.apikey;
  // Module: questpie-admin (overrides starter)
  user: typeof adminModule.collections.user;
  adminSavedViews: typeof adminModule.collections.adminSavedViews;
  adminPreferences: typeof adminModule.collections.adminPreferences;
  adminLocks: typeof adminModule.collections.adminLocks;
  // User (overrides modules)
  posts: typeof posts;
  categories: typeof categories;
}

export interface AppGlobals {
  siteSettings: typeof siteSettings;
}

export interface AppJobs {
  // Module
  realtimeCleanup: typeof starterModule.jobs.realtimeCleanup;
  // User
  sendNewsletter: typeof sendNewsletter;
}

export interface AppFunctions {
  // Module
  ...typeof adminModule.functions;
  // User
  search: typeof search;
  admin: {
    stats: typeof adminStats;
    users: {
      export: typeof adminUsersExport;
    };
  };
}

export interface AppBlocks {
  hero: typeof heroBlock;
  callToAction: typeof ctaBlock;
}

export type AppAuth = /* deep-merged auth type */;

export type App = Questpie<{
  collections: AppCollections;
  globals: AppGlobals;
  jobs: AppJobs;
  functions: AppFunctions;
  blocks: AppBlocks;
  auth: AppAuth;
}>;

// ============================================================
// Runtime
// ============================================================

export const app: App = createApp({
  collections: {
    ...starterModule.collections,
    ...adminModule.collections,
    posts,
    categories,
  },
  globals: { siteSettings },
  jobs: {
    ...starterModule.jobs,
    sendNewsletter,
  },
  functions: {
    ...adminModule.functions,
    search,
    "admin.stats": adminStats,
    "admin.users.export": adminUsersExport,
  },
  blocks: { hero: heroBlock, callToAction: ctaBlock },
  fields: { ...adminModule.fields },
  auth: mergeAuth(starterModule.auth, adminModule.auth, userAuth),
  messages: mergeMessages(starterModule.messages, adminModule.messages, { en, sk }),
  defaultAccess: adminModule.defaultAccess,
  migrations: [
    ...starterModule.migrations,
    ...adminModule.migrations,
  ],
}, rawConfig);

// ============================================================
// Global type augmentation
// ============================================================

declare module "questpie" {
  interface QuestpieAppType {
    app: App;
  }
}
```

### 10. What Codegen Does NOT Generate

Codegen does NOT generate collection definitions, global definitions, or any business logic. It only generates:

1. Import statements (from discovered files + modules)
2. Type interfaces (composed from `typeof` references)
3. Runtime `createApp()` call (wiring everything together)
4. Module augmentation (for auto-typed `app` in hooks)

All business logic stays in user-written files. The generated file is a pure "wiring" layer.

### 11. CLI Commands

| Command | Description |
|---------|-------------|
| `questpie generate` | Run codegen once |
| `questpie dev` | Watch mode — re-generates on file changes |
| `questpie migrate:generate` | Generate migration (reads from `.generated/index.ts`) |
| `questpie migrate` | Run migrations |
| `questpie seed` | Run seeds |

`questpie dev` watches:
- `questpie.config.ts` — full regeneration
- `collections/`, `globals/`, `jobs/`, `functions/`, `blocks/`, `messages/` — incremental update to `.generated/index.ts`
- Plugin-registered directories — incremental update

### 12. AI/Agentic Discoverability

The file convention is designed to be trivially navigable by AI coding agents:

**Finding things:**
- "Where is the posts collection?" → `glob **/collections/posts.ts`
- "What collections exist?" → `glob **/collections/*.ts`
- "What does the blog feature do?" → `ls features/blog/`
- "What RPC endpoints exist?" → `glob **/functions/**/*.ts` (path = route)

**Understanding scope:**
- Each file is self-contained — reading one file gives you the complete definition
- No need to trace `.use()` chains, re-exports, or builder composition
- The generated `.generated/index.ts` is a single source of truth for the full app shape

**Making changes:**
- "Add a new collection" → Create `collections/new-thing.ts`, run `questpie generate`
- "Add a field to posts" → Edit `collections/posts.ts` (one file, one concern)
- "Add an RPC endpoint" → Create `functions/my-endpoint.ts` or nest under a directory

**This structure eliminates the need for semantic code analysis.** Pattern matching (glob, grep) is sufficient to find and understand any part of the application.

### 13. Blocks — No Circular Dependency

Today, blocks with `.prefetch()` that need `app` create a circular dependency:

```ts
// OLD: app.ts → blocks.ts → app.ts (circular)
export const baseApp = qb.collections({...});
export type BaseCMS = (typeof baseApp)["$inferCms"];
export const app = baseApp.blocks(blocks).build({...});
```

With codegen, this is eliminated:

```ts
// blocks/hero.ts — no circular import needed
import { block } from "@questpie/admin";

export default block("hero", ({ f }) => ({
  heading: f.text({ required: true }),
  image: f.upload(),
}))
  .prefetch(async ({ values, app }) => {
    // `app` is auto-typed via module augmentation
    // No import of app.ts needed!
    const related = await app.api.collections.posts.find({
      where: { category: { equals: values.category } },
    });
    return { related: related.docs };
  });
```

The `app` type comes from the generated module augmentation, not from an import. Zero circular dependencies.

---

## Migration Path

### From Current Architecture

1. **Split `app.ts`** — Extract each collection into `collections/*.ts`, globals into `globals/*.ts`, etc.
2. **Create `questpie.config.ts`** — Move runtime config (db, storage, etc.) + module list here
3. **Delete `builder.ts`** — No longer needed (no `qb` builder)
4. **Run `questpie generate`** — Produces `.generated/index.ts`
5. **Update imports** — Replace `import { app } from "./app"` with `import { app } from "./.generated"`

A **codemod** (`questpie migrate-to-conventions`) could automate steps 1-4 by:
- Parsing the existing builder chain
- Extracting collection/global definitions into separate files
- Generating `questpie.config.ts` from the `.build()` call
- Generating `.generated/index.ts`

### Backward Compatibility

The `QuestpieBuilder` class is not removed immediately. Existing code continues to work. The file convention is the recommended path forward, and new `create-questpie` templates use it exclusively.

---

## Open Questions

1. **Should `.generated/index.ts` be committed to git or `.gitignore`'d?**
   - Pro commit: Works without running codegen first (CI, fresh clones)
   - Pro ignore: No noise in diffs, codegen is the source of truth
   - Recommendation: `.gitignore`'d, with `questpie generate` as a `postinstall` script

2. **How do admin extensions (`.admin()`, `.list()`, `.form()`) interact with declaration merging?**
   - These methods are already monkey-patched at runtime via `import "@questpie/admin"`
   - The codegen import of `@questpie/admin` activates both the type augmentation and runtime patches
   - No change needed — these stay as chained methods on `CollectionBuilder`

3. **Should `collection()` accept fields as second argument or via `.fields()`?**
   - `collection("posts", ({ f }) => ({...}))` — more concise, fields are always required
   - `collection("posts").fields(({ f }) => ({...}))` — consistent with current API
   - Recommendation: Support both, second-argument form is sugar for `.fields()`

4. **How does the admin sidebar/dashboard config work without a builder?**
   - Option A: Dedicated files `sidebar.ts`, `dashboard.ts` discovered by admin plugin
   - Option B: Options in `admin({ sidebar: ..., dashboard: ... })`
   - Option C: Both — file convention for complex configs, inline for simple ones
   - Recommendation: Option C

5. **Watch mode granularity**
   - Adding/removing a file: regenerate the full `.generated/index.ts`
   - Modifying a file's content: no regeneration needed (the `typeof` import is stable)
   - Modifying `questpie.config.ts`: full regeneration

6. **How to handle collection overrides from modules?**
   - Example: User wants to add fields to the admin `user` collection
   - Today: `adminModule.state.collections.user.merge(collection("user").fields({...}))`
   - New: Create `collections/user.ts` that imports and extends the module's collection:
     ```ts
     import { admin } from "@questpie/admin";
     export default admin().collections.user.merge(
        collection("user", ({ f }) => ({ customField: f.text() }))
     );
     ```
   - User's `collections/user.ts` overrides the module's `user` — merge is explicit
