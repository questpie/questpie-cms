# QUESTPIE Docs Rewrite Strategy (v2 Architecture)

## 1) Why we are rewriting docs

The framework crossed a major architecture boundary:

- field builder moved to server-first semantic definitions
- introspection became the contract between server and admin client
- admin rendering is registry-driven
- RPC and form/reactive behavior were redesigned

Current docs still explain parts of the old mental model (or mix old/new), which creates confusion. This rewrite aligns docs with the new system end-to-end.

---

## 2) Documentation North Star

Every major page should reinforce this:

> Server defines WHAT (schema, behavior, metadata, policies). Client defines HOW (renderers and UX via registries).

If a page does not make this clear, it is incomplete.

---

## 3) Primary audiences

### Audience A - New builder (first production setup)

Needs:

- a fast quickstart that reflects the new API
- one complete mental model, not two conflicting ones
- practical examples from a real app

### Audience B - Existing QUESTPIE user (migrating)

Needs:

- what changed and why
- old -> new mapping
- migration sequence with minimal downtime

### Audience C - Advanced/extending user

Needs:

- registry internals
- introspection contract
- custom views/components/fields patterns

---

## 4) Information Architecture (recommended)

Keep docs easy to scan: concept first, then implementation, then reference.

```text
content/docs/
  index.mdx

  getting-started/
    index.mdx
    quickstart.mdx
    first-collection.mdx
    first-admin-renderer.mdx
    first-rpc.mdx
    first-reactive-form.mdx
    project-structure.mdx

  mentality/
    index.mdx
    server-first-what-vs-how.mdx
    registry-first-philosophy.mdx
    introspection-contract.mdx
    single-source-of-truth.mdx

  server/
    index.mdx
    field-builder.mdx
    field-types.mdx
    reactive-fields.mdx
    relations.mdx
    collections.mdx
    globals.mdx
    access-control.mdx
    hooks-and-lifecycle.mdx
    rpc.mdx
    jobs-and-queue.mdx
    adapter-standard.mdx
    localization.mdx

  admin/
    index.mdx
    client-builder-qa.mdx
    registries-overview.mdx
    field-renderer-registry.mdx
    view-registry-list-and-form.mdx
    component-registry.mdx
    dashboard-sidebar-branding.mdx
    preview-system.mdx
    design-system-integration.mdx

  guides/
    index.mdx
    build-a-booking-system.mdx
    build-a-page-builder.mdx
    custom-adapter.mdx
    custom-field-type.mdx
    custom-view-type.mdx
    production-hardening.mdx

  examples/
    index.mdx
    tanstack-barbershop-architecture-tour.mdx
    tanstack-barbershop-server-tour.mdx
    tanstack-barbershop-admin-tour.mdx
    tanstack-barbershop-rpc-tour.mdx

  reference/
    index.mdx
    q-builder-api.mdx
    collection-builder-api.mdx
    global-builder-api.mdx
    field-api.mdx
    qa-builder-api.mdx
    registry-api.mdx
    rpc-api.mdx
    adapter-api.mdx
    cli.mdx

  migration/
    index.mdx
    old-admin-config-to-server-config.mdx
    old-rpc-to-new-rpc.mdx
    old-form-config-to-reactive-system.mdx
```

---

## 5) Priority Rewrite Order

### Phase 1 (must ship first)

1. `getting-started/quickstart.mdx`
2. `mentality/server-first-what-vs-how.mdx`
3. `server/field-builder.mdx`
4. `server/reactive-fields.mdx`
5. `server/rpc.mdx`
6. `admin/registries-overview.mdx`
7. `examples/tanstack-barbershop-architecture-tour.mdx`

### Phase 2 (core depth)

1. `mentality/introspection-contract.mdx`
2. `server/adapter-standard.mdx`
3. `admin/field-renderer-registry.mdx`
4. `admin/view-registry-list-and-form.mdx`
5. `migration/old-admin-config-to-server-config.mdx`

### Phase 3 (advanced + long-tail)

- all reference pages
- advanced guides
- migration edge cases

---

## 6) Current docs -> new docs mapping

This avoids chaotic rewrites and keeps redirects manageable.

| Current area              | Action                         | New destination                                             |
| ------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `core-concepts/*`         | rewrite heavily                | `mentality/*` + `getting-started/*`                         |
| `backend/fields.mdx`      | split                          | `server/field-builder.mdx` + `server/field-types.mdx`       |
| `backend/builder-api.mdx` | keep + refactor                | `reference/q-builder-api.mdx`                               |
| `backend/client-sdk.mdx`  | split                          | `reference/rpc-api.mdx` + `guides/*`                        |
| `admin/index.mdx`         | rewrite heavily                | `admin/index.mdx` (new narrative)                           |
| `admin/architecture/*`    | merge/simplify                 | `mentality/*` + `admin/registries-overview.mdx`             |
| `admin/extensibility/*`   | keep concept, rewrite examples | `admin/*registry*` + `guides/custom-*`                      |
| `guides/type-safety.mdx`  | split                          | `server/rpc.mdx` + `reference/*`                            |
| `examples/barbershop.mdx` | split into tours               | `examples/tanstack-barbershop-*.mdx`                        |
| `reference/*adapter*`     | align with adapter standard    | `reference/adapter-api.mdx` + `server/adapter-standard.mdx` |

---

## 7) Canonical example source (TanStack Barbershop)

Use these files as primary source for docs snippets:

- server builder entry: `examples/tanstack-barbershop/src/questpie/server/builder.ts`
- full CMS config: `examples/tanstack-barbershop/src/questpie/server/cms.ts`
- field builder in practice: `examples/tanstack-barbershop/src/questpie/server/collections/barbers.ts`
- reactive field behavior examples: `examples/tanstack-barbershop/src/questpie/server/collections/pages.ts`
- conditional form behavior: `examples/tanstack-barbershop/src/questpie/server/collections/appointments.ts`
- global configuration: `examples/tanstack-barbershop/src/questpie/server/globals/site-settings.ts`
- RPC contract root: `examples/tanstack-barbershop/src/questpie/server/rpc.ts`
- RPC functions: `examples/tanstack-barbershop/src/questpie/server/functions/index.ts`
- booking RPC flow: `examples/tanstack-barbershop/src/questpie/server/functions/booking.ts`
- client admin builder: `examples/tanstack-barbershop/src/questpie/admin/builder.ts`
- minimal admin client config: `examples/tanstack-barbershop/src/questpie/admin/admin.ts`

Rule: if docs examples diverge from these files, update docs first or explicitly explain why.

---

## 8) Required content blocks per page

Every major page must include these sections in this order:

1. `Why this exists`
2. `Mental model`
3. `Canonical example`
4. `Common mistakes`
5. `Related pages`

For API-focused pages, add:

6. `Type inference notes`
7. `Runtime behavior notes`

---

## 9) Must-cover architecture topics (non-negotiable)

These must be clear and explicit in docs:

- Field Builder architecture and semantic fields
- Introspection output shape and contract
- Registry-first rendering (fields/views/components)
- Reactive field system (`hidden`, `readOnly`, `disabled`, `compute`, dynamic options)
- Server-side admin config (`.admin`, `.list`, `.form`, `.preview`, `.dashboard`, `.sidebar`)
- Typed RPC redesign and recommended patterns
- Adapter standard and fetch handler contract
- Design-system integration strategy on client
- Migration from old split config model to server-first model

---

## 10) Known in-flight inconsistencies (from code audit)

These are implementation realities right now and affect docs wording. Do not present these as final architecture behavior until fixed:

High impact:

- admin router still hardcodes view rendering in some paths
- collection/global introspection still reads monkey-patched admin keys directly in places
- global introspection has icon flattening bypass in one path
- search reindex endpoint role check still hardcoded to admin

Medium impact:

- block builder has local component proxy special-casing
- action form fallback still hardcodes field registry fallback
- upload fallback assumes `assets` collection
- some relation detection logic relies on literal names/options
- storage HTTP alias still routes hardcoded `assets`

Low impact:

- icon shorthand still has special-case runtime branches

Docs policy during transition:

- describe target architecture as primary
- add short "currently in migration" notes only where users can hit edge behavior
- remove migration caveats once fixes land

---

## 11) Suggested nav rewrite (meta.json direction)

Top-level order:

1. `index`
2. `getting-started`
3. `mentality`
4. `server`
5. `admin`
6. `guides`
7. `examples`
8. `reference`
9. `migration`

Why this order:

- users first need mental model
- then implementation details
- then advanced references and migration

---

## 12) Writing rules for the new docs

Do:

- prefer real snippets from `examples/tanstack-barbershop`
- explicitly mark server-only vs client-only responsibilities
- show before/after for migration-heavy topics
- keep diagrams simple and tied to runtime behavior

Do not:

- present old dual-config patterns as recommended
- hide registry behavior under vague language
- bury caveats that change runtime expectations

---

## 13) Delivery plan (practical)

Week 1:

- rewrite `getting-started` and `mentality`
- publish architecture tour from barbershop

Week 2:

- rewrite `server` core pages (field builder, reactive, RPC, introspection)
- rewrite `admin` registry pages

Week 3:

- migration guides
- reference cleanup and adapter standard alignment

Week 4:

- delete/archive obsolete pages
- finalize redirects and broken link pass

---

## 14) Definition of done

Docs rewrite is done when:

- new quickstart uses server-first config only
- mentality pages explain WHAT vs HOW clearly and consistently
- reactive fields, RPC, and registries are documented with real examples
- migration guides cover old -> new paths for common projects
- no top-level docs page teaches contradictory architecture

---

## 15) Final assessment checklist (completed)

- ✅ Run docs type checks (`bun run types:check` in `apps/docs`)
- ✅ Run docs build (`bun run build` in `apps/docs`)
- ✅ Verify new snippet paths and APIs against current code
- ✅ Validate snippet realism against `examples/tanstack-barbershop`
- ✅ Remove outdated/deprecated docs and verify active links
- ✅ Manual QA readiness for mobile + desktop nav flow (structure and linking)

Verification notes:

- Build and type checks are green after rewrite updates.
- Active docs link graph resolves with no broken `/docs/*` links in the current meta tree.
- Remaining technical warnings are non-blocking (bundle-size and sitemap-host hints).
