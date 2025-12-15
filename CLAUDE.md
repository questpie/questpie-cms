# Questpie CMS Project Context

## Project Overview

`questpie-cms` is a modern Content Management System (CMS) structured as a monorepo. It leverages **Turborepo** for build orchestration and **Bun** as the package manager and runtime. The project is built with a focus on full-stack TypeScript safety, utilizing **TanStack Start** for the frontend and **Convex** for the backend data layer.

## Architecture & Structure

The project is organized as a workspace with the following structure:

### Applications (`apps/`)

*   **`apps/docs` (`@qcms/docs`)**:
    *   **Purpose**: The official documentation website for the project.
    *   **Tech Stack**: [Vite](https://vitejs.dev/), [React](https://react.dev/), [TanStack Start](https://tanstack.com/start), [Fumadocs](https://fumadocs.vercel.app/).
    *   **Key Scripts**: `dev`, `build`, `start`.

*   **`apps/template` (`template`)**:
    *   **Purpose**: A comprehensive template application, likely serving as a starter for users or the main admin interface.
    *   **Tech Stack**: [Vite](https://vitejs.dev/), [React](https://react.dev/), [TanStack Start](https://tanstack.com/start), [Tailwind CSS v4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Recharts](https://recharts.org/).
    *   **Key Scripts**: `dev` (port 3000), `build`, `test` (Vitest).

### Packages (`packages/`)

*   **`packages/core` (`@qcms/core`)**:
    *   **Purpose**: The foundational library containing the core logic, schema definitions, and backend integration for the CMS.
    *   **Tech Stack**: [Convex](https://www.convex.dev/), [Zod](https://zod.dev/), [use-intl](https://next-intl-docs.vercel.app/).
    *   **Key Features**: Abstractions for collection definitions (`define-collection.ts`), configuration (`define-config.ts`), and CRUD operations.

## Technology Stack

*   **Languages**: TypeScript (100% usage across the repo).
*   **Package Manager**: [Bun](https://bun.sh/) (v1.3.0).
*   **Monorepo Tools**: [Turborepo](https://turbo.build/).
*   **Frontend Framework**: React 19, Vite, TanStack Start (Router).
*   **Styling**: Tailwind CSS v4.
*   **Backend/Database**: Convex.
*   **Validation**: Zod.
*   **Linting/Formatting**: Biome, Prettier, ESLint.

## Development Workflow

### Prerequisites
*   **Bun**: Ensure Bun is installed (`v1.3.0` or compatible).
*   **Convex**: You may need a Convex account and local setup for backend development.

### Common Commands

Run these commands from the root directory:

*   **Install Dependencies**:
    ```bash
    bun install
    ```

*   **Start Development Server** (starts all apps):
    ```bash
    bun run dev
    # or
    turbo dev
    ```

*   **Build Project**:
    ```bash
    bun run build
    # or
    turbo build
    ```

*   **Lint & Format**:
    ```bash
    bun run lint       # Runs linting via Turbo
    bun run format     # Runs Prettier
    bun run check-types # Runs TypeScript type checking
    ```

### Specific App Development

To work on a specific app (e.g., `docs`), you can use Turbo's filtering or go into the directory:

```bash
# Using Turbo from root
turbo dev --filter=@qcms/docs

# Or navigate to directory
cd apps/docs
bun dev
```

## Conventions

*   **Code Style**: The project enforces strict TypeScript rules. Prettier and Biome are used for formatting.
*   **File Naming**: All file and directory names must use **kebab-case** (e.g., `my-component.tsx`, `user-profile/`). However, files within the `convex/` folder (e.g., `packages/core/convex/`) must use **camelCase** (e.g., `myFunction.ts`, `dataModel.ts`).
*   **Component Library**: `apps/template` uses Shadcn UI. When adding new UI components, follow the existing patterns in `apps/template/src/components/ui`.
*   **Backend Logic**: Core CMS logic belongs in `packages/core`. Do not duplicate business logic in the apps if it can be shared.
