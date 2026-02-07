# Hard Break Rewrite: Separate CMS and RPC

## Decision

We are doing a **hard breaking rewrite**.

- No compatibility bridge.
- No deprecation period.
- Old `.functions()`-based root RPC flow is removed as primary architecture.

Target architecture:

- `cms` is only data model + infra composition.
- `rpc` is a separate contract object.
- HTTP adapter executes RPC from passed `rpc` router, not from CMS config state.
- Client RPC typing is based on `AppRpc`, not `AppCMS.config.functions`.

## Why

Current function architecture creates type circularity and module composition footguns.

We want strict separation (Supabase-style):

- CMS: collections/globals/jobs/auth/storage/realtime/admin infra
- RPC: callable contract surface for adapter + client

This enables safer module composition, clearer ownership boundaries, and better type ergonomics.

## Final DX Goal

```ts
// cms.ts
export const app = q({ name: "app" })
  .use(blogModule)
  .use(billingModule)
  .collections({ users })
  .globals({ settings })
  .build(runtime);

// rpc.ts
const r = rpc();

export const appRpc = r.router({
  public: publicRpc,
  admin: adminRpc,
  ops: opsRpc,
  blog: blogRpc,
  billing: billingRpc,
});

// server route
const handler = createFetchHandler(app, {
  basePath: "/api/cms",
  rpc: appRpc,
});

// client
const client = createClient<AppCMS, AppRpc>({ baseURL, basePath: "/api/cms" });
await client.rpc.blog.getPublishedPosts({ limit: 10 });
```

## Hard-Break Changes

1. Remove root RPC from CMS config/state surface.
2. Remove dependency of client root function typing on `GetFunctions<TConfig>`.
3. Introduce standalone RPC contract API:
   - `rpc()`
   - `rpc.fn({...})`
   - `rpc.router({...})`
4. Adapter resolves RPC from config-provided router.
5. `createClient<TCMS, TRPC>()` provides typed `client.rpc` tree.
6. `client.functions` legacy root proxy removed.

## Scope (This Rewrite)

### Core framework (required)

- `packages/questpie/src/server/adapters/types.ts`
  - Add `rpc` contract to adapter config.
- `packages/questpie/src/server/adapters/http.ts`
  - Route `/rpc/*` through external RPC router.
  - Keep collection/global RPC routes if still part of collection/global builders.
- `packages/questpie/src/server/adapters/routes/rpc.ts`
  - Rewrite resolver for nested routers.
  - Execute json/raw rpc procedures.
  - Enforce procedure access checks.
- `packages/questpie/src/client/index.ts`
  - Add `TRPC` generic.
  - Add recursive `client.rpc.*` typed proxy.
  - Remove `client.functions` root API.
- `packages/questpie/src/server/functions/*` (or new `server/rpc/*`)
  - Move/reshape types for standalone RPC definitions.
  - Keep one clear source of truth for procedure handler args.
- `packages/questpie/src/server/index.ts`
- `packages/questpie/src/exports/index.ts`
  - Export new RPC factory API.

### Builder/CMS cleanup (required)

- `packages/questpie/src/server/config/builder.ts`
  - Remove root `.functions()` API from builder.
  - Keep collection/global `.functions()` only if explicitly retained as entity-local RPC.
- `packages/questpie/src/server/config/builder-types.ts`
  - Remove root `functions` from builder state.
- `packages/questpie/src/server/config/types.ts`
  - Remove `functions?: FunctionsMap` from `QuestpieConfig`.
- `packages/questpie/src/server/config/cms.ts`
  - Remove `_functions` storage and `getFunctions()`.
- `packages/questpie/src/server/config/integrated/cms-api.ts`
  - Remove root function registration from `cms.api`.

### Internal package consumers (required)

- `packages/admin/src/server/modules/admin/index.ts`
  - Stop wiring root functions via `.functions({...})`.
  - Export dedicated `adminRpc` router bundle.
- `packages/admin/src/client/**/*`
  - Replace `client.functions.*` calls with `client.rpc.*`.
- `packages/hono/src/server.ts`
- `packages/elysia/src/server.ts`
- `packages/next/src/server.ts`
  - Pass standalone `rpc` through adapter wrappers.

### Tests (required)

- `packages/questpie/test/integration/rpc.test.ts`
  - Rebuild around standalone `appRpc`.
- `packages/questpie/test/types/config-builder.test-d.ts`
  - Remove root `.functions()` assertions.
  - Add `rpc()` typing assertions.
- `packages/questpie/test/types/functions-jobs.test-d.ts`
  - Add nested router and client rpc inference tests.

## Access Model for RPC Procedures

Procedure-level access is supported for top-level RPC:

- `access: (ctx) => boolean | Promise<boolean>`
- `access: { execute: ... }`

Evaluation rules:

- No access rule => allow
- returns `false` => forbidden
- throws => forbidden (secure default)

Business-rule authorization remains in handler logic.

## Type Boundaries

- External module RPC should type against module-local app type (`BlogCMS`, `BillingCMS`).
- Internal app routers can use full app-builder type (`AppCMS` from builder type layer).
- App-level RPC composition does not require generic plumbing at composition site.
- Final client inference comes from `typeof appRpc`.

## Execution Order

1. Add standalone RPC contract + execution path in adapter.
2. Switch client to `client.rpc` + `createClient<TCMS, TRPC>()`.
3. Remove root `.functions()`/`config.functions`/`cms.getFunctions()` path.
4. Migrate admin package to standalone `adminRpc`.
5. Fix framework adapters to pass RPC.
6. Rewrite integration and type tests.
7. Run full checks (`check-types`, tests).

## Acceptance Criteria

- Root app functions are no longer declared via `q.functions()`.
- HTTP RPC works exclusively via separate `rpc` contract object.
- `createClient<AppCMS, AppRpc>()` provides typed `client.rpc.*`.
- `client.functions` does not exist.
- Admin package works with standalone `adminRpc`.
- Questpie integration + type tests pass with new architecture.

## Deferred Follow-up (Later)

These are intentionally deferred until after core rewrite is stable:

1. Update docs across repo (README/spec snippets/migration docs).
2. Update `examples/tanstack-barbershop` to final public API shape.
3. Publish migration guide from old `.functions()` to standalone `rpc`.
