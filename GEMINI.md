# QUESTPIE CMS

## Project Overview

QUESTPIE CMS is a modern, type-safe Content Management System built as a monorepo using Turborepo and Bun. It aims to provide a "batteries-included" core for building content-heavy applications with a focus on developer experience and performance.

### Architecture

The project is structured as a monorepo with the following key workspaces:

*   **`packages/cms` (`@questpie/cms`)**: The backend logic and CMS engine.
    *   **Framework**: [ElysiaJS](https://elysiajs.com/) (high-performance web framework).
    *   **Database**: [Drizzle ORM](https://orm.drizzle.team/).
    *   **Auth**: [Better Auth](https://better-auth.com/).
    *   **Storage**: [Flydrive](https://flydrive.dev/).
    *   **Queues**: [pg-boss](https://github.com/timgit/pg-boss).
    *   **DI**: TinyDI.
*   **`apps/admin` (`@questpie/admin`)**: The administrative dashboard.
    *   **Framework**: React 19 + Vite.
    *   **Routing**: [TanStack Router](https://tanstack.com/router).
    *   **SSR/Start**: [TanStack Start](https://tanstack.com/start).
    *   **UI**: Tailwind CSS v4 + Shadcn UI.
*   **`apps/docs` (`@questpie/docs`)**: The documentation website.
    *   **Framework**: React + Vite + TanStack Start.
    *   **Docs Engine**: [Fumadocs](https://fumadocs.vercel.app/).

## Building and Running

This project uses **Bun** as the package manager and **Turborepo** for task orchestration.

### Prerequisites

*   **Bun**: v1.3.0 or later.
*   **Node.js**: >= 18 (required by some tools).

### Key Commands

Run these commands from the project root:

*   **Install Dependencies**:
    ```bash
    bun install
    ```
*   **Start Development Server** (starts all apps):
    ```bash
    bun run dev
    # or specifically for one app:
    bun run dev --filter=@questpie/admin
    ```
*   **Build Project**:
    ```bash
    bun run build
    ```
*   **Linting & Formatting**:
    ```bash
    bun run lint
    bun run format
    ```
*   **Type Checking**:
    ```bash
    bun run check-types
    ```

## Development Conventions

*   **Language**: TypeScript is used exclusively across the entire monorepo.
*   **Styling**: **Tailwind CSS v4** is the standard for styling.
*   **UI Components**: The admin app uses **Shadcn UI** components.
*   **Routing**: **TanStack Router** is used for client-side routing.
*   **Linting**: The project largely uses **Biome** for fast linting and formatting (configured in `biome.json` at the root), though the admin app currently uses ESLint + Prettier.
*   **Database**: Database schemas and queries should be managed via **Drizzle ORM**.
*   **CMS Pattern**: Content models are defined using the `collection` pattern in `@questpie/cms` (e.g., `defineCollection("posts").fields(...)`).
