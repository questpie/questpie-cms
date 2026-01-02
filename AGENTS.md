# AGENTS.md

This is the source-of-truth guidance for AI agents working in this repo. It supersedes legacy `GEMINI.md` and `CLAUDE.md` (which may be outdated).

## Project Snapshot

- Monorepo (Turborepo) with Bun as the only package manager (`packageManager: bun@1.3.0`).
- TypeScript + ESM across packages.
- Core product: QUESTPIE CMS (headless CMS + adapters + admin UI package).

## Workspace Layout

- `apps/docs` — Docs site (TanStack Start + Vite + Fumadocs).
- `packages/cms` — Core CMS engine, adapters, CLI, server/client/shared exports.
- `packages/admin` — Config-driven admin UI package (React + Tailwind v4 + shadcn).
- `packages/elysia`, `packages/hono`, `packages/next`, `packages/tanstack-start` — Framework adapters.
- `packages/tanstack-query` — Query option builders + DB helpers.
- `packages/adapter-compat` — Adapter compatibility tests.
- `examples/*` — Full reference implementations (hono/elysia/tanstack barbershop).
- `specifications/*` — Product specs; treat these as requirements.

## Core Architecture (CMS)

- `packages/cms/src/` is split into `server/`, `client/`, `shared/`, `exports/`, `cli/`.
- Internal imports in `packages/cms` use the `#questpie/cms/*` alias.
- Server modules of interest:
  - `server/collection` — Collection builder + field definitions + CRUD.
  - `server/global` — Global settings.
  - `server/adapters` — HTTP adapter core.
  - `server/integrated` — Auth (Better Auth), storage (Flydrive), queue (pg-boss), mailer (Nodemailer), realtime (SSE).
  - `server/migration` — Migration helpers.
- Adapter standard is defined in `specifications/ADAPTER_STANDARD.md` and implemented via:
  - `createCMSAdapterContext`
  - `createCMSAdapterRoutes`
  - `createCMSFetchHandler`
  in `packages/cms/src/server/adapters/http.ts`.

## Admin UI (Decoupled)

- Admin UI config is UI-only; do not add UI-specific fields to the CMS schema.
- Use `defineAdminConfig` from `@questpie/admin/config` for config-driven rendering.
- UI uses Tailwind CSS v4 + shadcn components; theming is via tokens/CSS variables.
- Specs to follow:
  - `specifications/DECOUPLED_ARCHITECTURE.md`
  - `specifications/ADMIN_PACKAGE_DESIGN.md`
  - `specifications/ADVANCED_LAYOUTS_AND_DASHBOARD.md`
  - `specifications/RICH_TEXT_AND_BLOCKS.md`

## Conventions

- Formatting/linting: Biome (`biome.json`) uses tabs + double quotes.
- Root `format` script uses Prettier for `**/*.{ts,tsx,md}`.
- Internal package deps must use `workspace:*`.
- Before adding deps, check `DEPENDENCIES.md` for pinned versions (zod v4, drizzle beta, etc).

## Commands (Root)

- `bun install`
- `bun run dev` (turbo dev)
- `bun run build`
- `bun run lint` (Biome)
- `bun run format` (Prettier)
- `bun run check-types`
- `bun test` (runs `bun test` with migrations silenced)

## Tests

- Adapter compatibility suite lives in `packages/adapter-compat` (`bun test`).
- `packages/cms` uses Bun’s test runner (`bun test`, `bun test --watch`).

## References

- Core CMS overview: `packages/cms/README.md`
- Admin UI usage: `packages/admin/README.md`
- Examples index: `examples/README.md`
