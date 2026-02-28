# Final Plan: Plugin-Defined Multi-Target Codegen

> Status: Final implementation plan
> Date: 2026-02-28
> Supersedes: previous draft content in this file
> Companion: RFC-PLUGIN-SYSTEM.md

---

## 1) Why We Are Doing This

QUESTPIE currently has an asymmetry:

- Server is file-convention + discovery + generated output.
- Admin client still relies on manual builder wiring (`qa().use(adminModule)`).

This creates three practical issues:

1. **Two mental models for one product**
   - Server: declarative file convention.
   - Admin client: imperative builder composition.
   - Teams need to learn and maintain both.

2. **No strong compile-time projection guarantees between server and admin client**
   - Server can emit references to views/components/blocks.
   - Client registration can drift.
   - Mismatches are often discovered too late.

3. **Unnecessary bootstrap complexity and JS footprint overhead**
   - Manual registry assembly is noisy.
   - Lazy loading opportunities are harder to enforce globally.

The target architecture is:

- `questpie/server` and `questpie/admin` both use file convention + discovery.
- Codegen produces both generated outputs.
- Plugins can declare additional targets (not only categories).
- Admin client consumes generated config directly.

---

## 2) Hard Decisions (Locked)

This plan intentionally includes a **mental shift** and **breaking changes**.

1. **This is an explicit breaking change initiative.**
   - Release is treated as breaking at API and setup level.
   - Legacy and dead code are removed, not preserved.

2. **No backward compatibility for the old admin client builder entry path.**
   - `qa()` is removed from public setup flow.
   - No compatibility adapter, no fallback shim, no dual-path bootstrap.

3. **Targets are plugin-defined.**
   - Any package can add a new codegen target via plugin declaration.
   - Core orchestrates targets, not hardcoded package-specific logic.

4. **Projection mismatch is a hard error.**
   - If server contracts reference client registries that do not exist, codegen fails.

5. **Canonical admin client location is `questpie/admin`.**
   - No fallback convention in v1 of this rewrite.

6. **Admin runtime structure stays conceptually the same.**
   - We do not redesign admin layout/router architecture.
   - The change is bootstrap/input level: generated admin client object replaces `qa()` builder wiring.

---

## 3) End State Overview

### 3.1 Directory model

- `questpie/server/*` defines data contracts and server behavior.
- `questpie/admin/*` defines rendering artifacts for admin UI.

### 3.2 Generated outputs

- `questpie/server/.generated/index.ts` (existing server artifact)
- `questpie/server/.generated/factories.ts` (existing typed factories)
- `questpie/admin/.generated/client.ts` (new admin client artifact)

### 3.3 Runtime usage

- Routes import generated admin config directly.
- `AdminProvider` accepts generated admin config object.
- No `qa().use(...)` bootstrap in application setup.

---

## 4) New Plugin Contract (Breaking)

`CodegenPlugin` moves to a target-first model.

```ts
export interface CodegenPlugin {
  name: string;
  targets: Record<string, CodegenTargetContribution>;
}

export interface CodegenTargetContribution {
  root: string;          // relative to resolved server root, ex: "." or "../admin"
  outDir?: string;       // default ".generated"
  outputFile: string;    // ex: "index.ts", "client.ts"

  categories?: Record<string, CategoryDeclaration>;
  discover?: Record<string, DiscoverPattern>;

  registries?: {
    collectionExtensions?: Record<string, RegistryExtension>;
    globalExtensions?: Record<string, RegistryExtension>;
    singletonFactories?: Record<string, SingletonFactory>;
    moduleRegistries?: Record<string, ModuleRegistryConfig>;
  };

  transform?: (ctx: CodegenContext) => void;

  // Optional custom generator for target-specific templates
  generate?: (
    ctx: CodegenTargetGenerateContext,
  ) => Promise<CodegenTargetOutput> | CodegenTargetOutput;
}
```

Target merge rules:

- Multiple plugins may contribute discovery/categories to the same target.
- Only one generator function per target is allowed.
- `root`, `outDir`, `outputFile` must be consistent per target id.
- Any conflict is a codegen error.

---

## 5) Codegen Orchestration Model

`runCodegen` becomes multi-target orchestration:

1. Resolve all plugins from runtime config.
2. Build merged target graph.
3. For each target:
   - run discovery in target root
   - run target transforms
   - run target generator (plugin custom or default)
   - write output
4. Run cross-target validators (projection compatibility checks).
5. Return aggregated result (`outputs[]`, `errors[]`, `targetSummaries[]`).

CLI `generate` and `dev` use the same target graph.

---

## 6) Admin Plugin Target Design

`adminPlugin()` declares two targets:

### 6.1 `server` target

- Root: `.` (server root)
- Output: existing server generated files
- Purpose: keep current admin server discover/registry extensions.

### 6.2 `admin-client` target

- Root: `../admin`
- Output: `.generated/client.ts`
- Discovers admin client registry files.

Expected categories/discover keys (initial):

- `views`
- `components`
- `fields`
- `pages`
- `widgets`
- `blocks`
- optional singles if needed for client-level metadata later

---

## 7) Admin Client Generated Artifact

`questpie/admin/.generated/client.ts` exports a plain admin config object.

Minimum shape:

```ts
export type GeneratedAdminClient = {
  fields: Record<string, unknown>;
  components: Record<string, unknown>;
  listViews: Record<string, unknown>;
  editViews: Record<string, unknown>;
  pages: Record<string, unknown>;
  widgets: Record<string, unknown>;
  blocks: Record<string, unknown>;
  defaultViews: Record<string, unknown>;
  locale: { default: string; supported: string[] };
  translations: Record<string, unknown>;
};
```

Generation behavior:

- Start with built-in admin defaults.
- Merge discovered user admin files.
- User definitions override defaults by key.
- Prefer lazy-capable loader forms for views/pages/widgets.

---

## 8) Runtime and Public API Changes

### 8.1 Admin runtime normalization

`Admin.normalize` must accept plain generated client config directly.

Important constraint:

- Admin runtime architecture remains structurally the same.
- `AdminLayout` / `AdminRouter` behavior is preserved.
- Only admin input source changes from builder-composed config to generated client config object.

### 8.2 Public exports

- Remove `qa` from `@questpie/admin/client` public API.
- Keep runtime types/components/hooks required by the new setup.

### 8.3 App setup

New setup pattern:

```ts
import admin from "~/questpie/admin/.generated/client";

<AdminLayoutProvider admin={admin} ... />
```

Practical migration summary:

- Keep existing admin route/layout composition.
- Stop creating `qa().use(adminModule)` builders.
- Pass generated admin client object into provider/layout/router path.

---

## 9) Projection Quality Gate (Hard Error)

Cross-target validation runs after generation.

Checks:

1. Server-referenced list/edit views must exist in admin client registries.
2. Server-referenced components must exist in admin client registries.
3. Server-referenced blocks must exist in admin client registries.

Failure behavior:

- Codegen exits with error.
- Error output includes missing keys and suggested file locations.

---

## 10) Implementation Plan (Execution Sequence)

## Phase A - Target-first core refactor

1. Refactor `CodegenPlugin` and related types to target model.
2. Migrate `coreCodegenPlugin()` to `targets.server`.
3. Implement target graph resolver with conflict validation.

Primary files:

- `packages/questpie/src/cli/codegen/types.ts`
- `packages/questpie/src/cli/codegen/index.ts`
- `packages/questpie/src/server/config/module-types.ts`

## Phase B - Multi-target CLI and watch mode

1. `generate` runs all resolved targets.
2. `dev` watches all target roots.
3. Output summary is per target.

Primary files:

- `packages/questpie/src/cli/commands/codegen.ts`

## Phase C - Admin plugin target expansion

1. Move admin server contribution under `targets.server`.
2. Add `targets.admin-client` with admin root discovery.
3. Add admin client generator.

Primary files:

- `packages/admin/src/server/plugin.ts`
- `packages/admin/src/server/codegen/admin-client-template.ts` (new)

## Phase D - Admin runtime hard migration

1. Remove `qa` from public client exports.
2. Update `AdminInput`/`Admin.normalize` to generated config input.
3. Ensure providers/router work with generated config shape.

Primary files:

- `packages/admin/src/exports/client.ts`
- `packages/admin/src/client/builder/admin.ts`
- `packages/admin/src/client/runtime/provider.tsx`
- `packages/admin/src/client/views/layout/admin-layout-provider.tsx`

## Phase E - Projection validator

1. Implement cross-target projection checks.
2. Fail codegen on mismatch.
3. Add actionable diagnostics.

Primary files:

- `packages/questpie/src/cli/codegen/index.ts`
- `packages/admin/src/server/codegen/*` (if helper extraction is needed)

## Phase F - Examples, templates, docs, tests

1. Update examples to generated admin client imports.
2. Update create-questpie templates.
3. Remove old `qa` setup examples from docs.
4. Update and add tests for target graph and admin client generation.

Primary files:

- `examples/**/questpie/admin/*`
- `packages/create-questpie/templates/**/questpie/admin/*`
- `apps/docs/**`
- `packages/questpie/test/codegen/*.test.ts`
- `packages/admin/test/**/*.test.ts`

---

## 11) Testing and Validation Matrix

Required checks:

1. `bun run check-types`
2. `bun test`
3. `bun run build`

Mandatory test coverage:

- Target graph merge and conflict rules
- Multi-target generation output
- Watch mode regeneration for non-server target roots
- Admin generated client runtime compatibility
- Projection mismatch hard-fail behavior

---

## 12) Scope and Effort

Expected scope:

- Medium-to-large refactor
- Roughly 25-45 files touched depending on final generator placement
- High impact but controlled by phased execution

Expected effort:

- 2-4 weeks including docs/tests/examples stabilization

---

## 13) Definition of Done

This initiative is done when all items are true:

1. Plugin system supports plugin-defined codegen targets.
2. Admin plugin declares and builds `admin-client` target.
3. `questpie/admin/.generated/client.ts` is the canonical admin client config artifact.
4. Application admin setup no longer depends on `qa()`.
5. Projection mismatch fails during codegen.
6. Templates and examples use generated admin config.
7. Typecheck/tests/build pass in monorepo.

---

## 14) Explicitly Out of Scope for This Plan

1. Backward compatibility adapters for `qa()` setup.
2. Optional fallback directory conventions (`questpie/client`).
3. Non-admin target features not needed for generic target infrastructure.
4. Keeping unused legacy builder bootstrap code in production path.

Those may be addressed in future RFCs if needed, but are not part of this execution.
