---
title: Architecture
---

# Architecture

QUESTPIE CMS Core is designed with a "Batteries Included" philosophy. It provides a robust, opinionated foundation for building content-heavy applications.

## Core Components

The system is built around a central `CMS` class that orchestrates the following integrated services:

### 1. The CMS Engine
*   **Collections:** Type-safe definitions of your content schema.
*   **CRUD Engine:** A powerful abstraction over Drizzle ORM that handles complex queries, relations, and localization.
*   **Context:** A request-scoped object (`CmsContext`) passed to all operations, containing the current user, locale, and service instances.

### 2. Integrated Services
Instead of generic interfaces, we integrate best-in-class tools directly:

*   **Auth (Better Auth):** Fully integrated authentication with `user`, `session`, `account` tables managed automatically.
*   **Storage (Flydrive):** Multi-driver file storage with a built-in `questpie_assets` media library.
*   **Queue (pg-boss):** Database-backed background job processing.
*   **Email (Nodemailer + React Email):** Transactional emails using React components.
*   **Logger (Pino):** Structured JSON logging.

## Request Lifecycle

1.  **Elysia Middleware (`qcms` plugin):**
    *   Intercepts the request.
    *   Resolves the current user via Better Auth.
    *   Determines the locale from headers.
    *   Creates the `CmsContext`.
2.  **Route Handling:**
    *   API routes use `cms.crud(collection, ctx)` to interact with data.
    *   Auth routes (`/api/auth/*`) delegate to the Better Auth handler.
    *   Storage routes (`/api/storage/upload`) handle file streams.
3.  **Hooks & Events:**
    *   Collections can define `beforeCreate`, `afterUpdate`, etc. hooks.
    *   Hooks have access to `ctx.queue` to offload work (e.g., sending emails).

## Directory Structure

*   `src/server/collection/`: Collection builder and field definitions.
*   `src/server/integrated/`: The "batteries" (Auth, Storage, Queue, etc.).
*   `src/server/config/`: Core configuration and context types.
*   `src/server/elysia/`: Web framework integration.
