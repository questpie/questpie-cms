# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QUESTPIE CMS is a "Batteries Included" headless CMS built as a Turborepo monorepo using Bun as the package manager. It provides an opinionated, type-safe foundation for building content-heavy applications with integrated services for authentication, storage, queuing, and email.

## Common Commands

### Development
```bash
# Install dependencies (must use Bun, not npm/yarn/pnpm)
bun install

# Start all apps in dev mode
bun run dev

# Start specific app (e.g., docs, tanstackstart-admin)
turbo dev --filter=docs
turbo dev --filter=tanstackstart-admin

# Run core package in watch mode
cd packages/core && bun run dev
```

### Type Checking & Linting
```bash
# Type check all packages
bun run check-types

# Type check specific package
turbo check-types --filter=@questpie/core

# Lint with Biome (uses tabs, double quotes)
turbo run lint

# Format code
bun run format
```

### Building
```bash
# Build all packages
bun run build

# Build specific package
turbo build --filter=docs
```

## Architecture

### Monorepo Structure

**Apps:**
- `apps/docs/` - Documentation site (Fumadocs + TanStack Start)
- `apps/tanstackstart-admin/` - Admin UI (TanStack Start + TanStack Router)

**Packages:**
- `packages/core/` - The CMS engine with integrated services

### Core Package Architecture (`packages/core/`)

The core package uses a **client/server/shared split** accessed via subpath exports:
- `@questpie/core/server` → Server-only code (CMS engine, collections, CRUD)
- `@questpie/core/client` → Client-only code
- `@questpie/core/shared` → Shared utilities and types

**Internal structure:**
```
packages/core/src/
├── server/
│   ├── collection/      # Collection builder, field definitions, CRUD generator
│   ├── global/          # Global settings (non-collection content)
│   ├── config/          # CMS class, context types, configuration
│   ├── elysia/          # Elysia plugin for route handling
│   ├── integrated/      # "Batteries": auth, storage, queue, email, logger
│   └── module/          # Module system for extensibility
├── client/              # Client-side SDK
├── shared/              # Shared utilities
└── exports/             # Public API entry points
```

**Path aliases:** Use `#questpie/core/*` to import from `src/*` within the core package (configured in tsconfig.json).

### Key Architectural Patterns

**1. Collection Builder API**
Collections use a fluent builder pattern for defining content schemas:
```typescript
collection("posts")
  .fields({ title: fields.text("title") })
  .title(t => t.title)
  .hooks({ afterCreate: async ({ data, context }) => {} })
  .access({ read: ({ user }) => true })
```

**2. Integrated Services**
Rather than generic interfaces, specific best-in-class tools are integrated:
- **Auth:** Better Auth (manages user/session/account tables)
- **Storage:** Flydrive (S3, R2, Local) with `questpie_assets` collection
- **Queue:** pg-boss (database-backed job processing)
- **Email:** Nodemailer + React Email
- **Logger:** Pino (structured JSON logging)
- **Database:** Drizzle ORM with Postgres

**3. Request Context (`CmsContext`)**
Every operation receives a context object with:
- Current user (from Better Auth)
- Current locale
- Service instances (queue, logger, storage, email, db, auth)

**4. CRUD Engine**
Abstraction over Drizzle ORM handling:
- Complex queries with filters
- Relations and eager loading
- Localization support
- Access control enforcement

**5. Module System**
CMS can be extended via modules that can:
- Register collections
- Add global settings
- Define hooks
- Extend services

## Code Style

- **Formatter:** Biome (tabs for indentation, double quotes for strings)
- **TypeScript:** Strict mode enabled, ES2022 modules
- **Imports:** Organize imports automatically via Biome assist

## Important Conventions

### Collections
- Use builder pattern for type inference
- Define field types explicitly for database schema
- Hooks have access to `context` with all services
- Access control is granular per operation (read, create, update, delete)

### Field Types
Standard fields available in `fields`:
- `text()` - varchar(255)
- `textarea()` - Long text
- `richText()` - JSON storage
- `number()` - Integer
- `checkbox()` - Boolean
- `timestamp()` - Date/time
- `image()` - Single image (JSON with key/url)
- `file()` - Single file (JSON with key/url/mime)
- `gallery()` - Array of images

### Assets & Storage
- All uploads create records in `questpie_assets` collection
- Upload endpoint: `POST /api/storage/upload`
- Image/file fields store JSON references to assets
- Multi-driver support (configure default disk and drivers)

### Queue Jobs
- Publish jobs in hooks: `context.queue.publish('job-name', payload)`
- Register workers on app startup: `cms.queue.work('job-name', handler)`
- Uses pg-boss (requires Postgres connection string)
- In-memory fallback in development

### Authentication
- Better Auth integration creates managed tables
- Auth routes: `/api/auth/*`
- User access via `context.user` in all operations

## Testing

Currently no test suite is configured in the repository. Tests would need to be added using a test framework (e.g., Vitest, as seen in the tanstackstart-admin dependencies).

## Package Manager

**CRITICAL:** This project uses **Bun** as the package manager (defined in package.json: `"packageManager": "bun@1.3.0"`). Do NOT use npm, yarn, or pnpm. All commands must use `bun` or `bunx`.

## Documentation

The `packages/core/docs/` directory contains detailed documentation:
- `architecture.md` - System overview
- `collections.md` - Collection definitions
- `auth.md` - Better Auth integration
- `storage.md` - File management
- `queue.md` - Background jobs

The `apps/docs/` app is the user-facing documentation site built with Fumadocs.
