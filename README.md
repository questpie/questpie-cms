# QUESTPIE CMS

**The "Batteries Included" Headless CMS for TypeScript**

A type-safe, modular headless CMS that runs in your codebase. Built with Drizzle ORM, Better Auth, Flydrive, pg-boss, and more.

## Why QUESTPIE CMS?

- **Type-Safe End-to-End** - Full TypeScript from database schema to API responses
- **Batteries Included** - Auth, storage, queue, email, realtime - all integrated
- **Framework Agnostic** - Adapters for Hono, Elysia, Next.js, TanStack Start
- **Your Code, Your Control** - Runs in your codebase, not a hosted service
- **Modular Architecture** - Compose reusable modules, extend with plugins

## Packages

| Package                                                 | Description                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------- |
| [`@questpie/cms`](./packages/cms)                       | Core CMS engine with collections, globals, hooks, and access control |
| [`@questpie/admin`](./packages/admin)                   | Config-driven admin UI (React + Tailwind v4 + shadcn)                |
| [`@questpie/hono`](./packages/hono)                     | Hono framework adapter                                               |
| [`@questpie/elysia`](./packages/elysia)                 | Elysia framework adapter with Eden Treaty support                    |
| [`@questpie/next`](./packages/next)                     | Next.js App Router adapter                                           |
| [`@questpie/tanstack-start`](./packages/tanstack-start) | TanStack Start adapter                                               |
| [`@questpie/tanstack-query`](./packages/tanstack-query) | TanStack Query integration + TanStack DB helpers                     |

## Quick Start

### Requirements

- [Bun](https://bun.sh) 1.0+ (recommended) or Node.js 18+
- PostgreSQL 15+

### Installation

```bash
# Core package
bun add @questpie/cms

# Choose your framework adapter
bun add @questpie/hono    # or @questpie/elysia, @questpie/next, @questpie/tanstack-start

# Optional: Admin UI
bun add @questpie/admin
```

### Define Your First Collection

```typescript
// src/cms/collections/posts.ts
import { defineCollection } from "@questpie/cms";
import { varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const posts = defineCollection("posts")
  .fields({
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    content: text("content"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    featured: boolean("featured").default(false),
  })
  .title("title")
  .timestamps()
  .softDelete();
```

### Configure the CMS

```typescript
// src/cms/index.ts
import { defineQCMS } from "@questpie/cms";
import { posts } from "./collections/posts";

export const cms = defineQCMS()
  .db({ connectionString: process.env.DATABASE_URL! })
  .collections({ posts })
  .auth({
    baseURL: process.env.AUTH_URL!,
    secret: process.env.AUTH_SECRET!,
  })
  .storage({
    default: "local",
    disks: {
      local: { driver: "fs", root: "./uploads" },
    },
  })
  .build();

export type AppCMS = typeof cms;
```

### Connect to Your Framework

**Hono:**

```typescript
import { Hono } from "hono";
import { questpieHono } from "@questpie/hono";
import { cms } from "./cms";

const app = new Hono().route("/api", questpieHono(cms));

export default app;
```

**Elysia:**

```typescript
import { Elysia } from "elysia";
import { questpieElysia } from "@questpie/elysia";
import { cms } from "./cms";

const app = new Elysia().use(questpieElysia(cms)).listen(3000);
```

**Next.js:**

```typescript
// app/api/[[...questpie]]/route.ts
import { questpieNextRouteHandlers } from "@questpie/next";
import { cms } from "@/cms";

export const { GET, POST, PUT, PATCH, DELETE } = questpieNextRouteHandlers(cms);
```

### Run Migrations

```bash
# Generate migrations from your schema
bunx qcms migrate:generate

# Apply migrations
bunx qcms migrate:up
```

## Core Concepts

### Collections

Multi-record content types with full CRUD operations:

```typescript
import { varchar, text, integer, boolean } from "drizzle-orm/pg-core";

const products = defineCollection("products")
  .fields({
    name: varchar("name", { length: 255 }).notNull(),
    price: integer("price").notNull(), // in cents
    description: text("description"),
    inStock: boolean("in_stock").default(true),
  })
  .title("name")
  .timestamps()
  .hooks({
    beforeChange: async ({ data, operation }) => {
      if (operation === "create") {
        data.slug = slugify(data.name);
      }
      return data;
    },
  })
  .access({
    read: true, // Public read
    create: ({ user }) => !!user, // Authenticated users
    update: ({ user }) => user?.role === "admin",
    delete: ({ user }) => user?.role === "admin",
  });
```

### Globals

Singleton content for site-wide settings:

```typescript
import { defineGlobal } from "@questpie/cms";
import { varchar, text, jsonb } from "drizzle-orm/pg-core";

const siteSettings = defineGlobal("site_settings").fields({
  siteName: varchar("site_name", { length: 255 }).notNull(),
  tagline: text("tagline"),
  socialLinks: jsonb("social_links").$type<SocialLinks>(),
});
```

### Relations

Define relationships between collections:

```typescript
import { varchar } from "drizzle-orm/pg-core";

const posts = defineCollection("posts")
  .fields({
    title: varchar("title", { length: 255 }).notNull(),
    authorId: varchar("author_id", { length: 255 }).notNull(),
  })
  .relations(({ one, table }) => ({
    author: one("users", {
      fields: [table.authorId],
      references: ["id"],
    }),
  }));

const users = defineCollection("users")
  .fields({
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
  })
  .relations(({ many }) => ({
    posts: many("posts"),
  }));
```

### Hooks

Lifecycle callbacks for business logic:

```typescript
.hooks({
  beforeValidate: async ({ data }) => { /* ... */ },
  beforeChange: async ({ data, operation }) => { /* ... */ },
  afterChange: async ({ doc, operation }) => { /* ... */ },
  beforeRead: async ({ query }) => { /* ... */ },
  afterRead: async ({ docs }) => { /* ... */ },
  beforeDelete: async ({ id }) => { /* ... */ },
  afterDelete: async ({ id }) => { /* ... */ },
})
```

### Access Control

Granular permissions at operation and field level:

```typescript
.access({
  // Operation-level access
  read: true,
  create: ({ user }) => !!user,
  update: ({ user, doc }) => user?.id === doc.authorId,
  delete: ({ user }) => user?.role === "admin",

  // Field-level access
  fields: {
    internalNotes: {
      read: ({ user }) => user?.role === "admin",
      update: ({ user }) => user?.role === "admin",
    },
  },
})
```

## Integrated Services

### Authentication (Better Auth)

```typescript
cms.auth({
  baseURL: process.env.AUTH_URL!,
  secret: process.env.AUTH_SECRET!,
  plugins: {
    admin: true,
    organization: true,
    twoFactor: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

### Storage (Flydrive)

```typescript
cms.storage({
  default: "s3",
  disks: {
    local: { driver: "fs", root: "./uploads" },
    s3: {
      driver: "s3",
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION!,
    },
  },
});
```

### Background Jobs (pg-boss)

```typescript
import { defineJob } from "@questpie/cms";

const sendWelcomeEmail = defineJob("send-welcome-email")
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input }) => {
    // Send email logic
  })

  // Trigger from a hook
  .hooks({
    afterChange: async ({ doc, operation }) => {
      if (operation === "create") {
        await sendWelcomeEmail.trigger({ userId: doc.id });
      }
    },
  });
```

### Email (Nodemailer + React Email)

```typescript
import { defineEmailTemplate } from "@questpie/cms"

const WelcomeEmail = defineEmailTemplate("welcome")
  .input(z.object({ name: z.string() }))
  .render(({ name }) => (
    <Email>
      <Text>Welcome, {name}!</Text>
    </Email>
  ))

// Send email
await cms.email.send({
  template: "welcome",
  to: user.email,
  data: { name: user.name },
})
```

### Realtime (SSE)

```typescript
// Subscribe to collection changes
const eventSource = new EventSource("/api/collections/posts/subscribe");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Posts updated:", data);
};
```

## Admin UI

The `@questpie/admin` package provides a config-driven admin interface:

```tsx
import { AdminApp } from "@questpie/admin"
import { defineAdminConfig } from "@questpie/admin/config"

const adminConfig = defineAdminConfig<AppCMS>()({
  app: {
    brand: { name: "My CMS" },
  },
  collections: {
    posts: {
      label: "Blog Posts",
      list: {
        defaultColumns: ["title", "author", "publishedAt"],
        defaultSort: { field: "publishedAt", direction: "desc" },
      },
      edit: {
        sections: [
          { title: "Content", fields: ["title", "content"] },
          { title: "Publishing", fields: ["status", "publishedAt"] },
        ],
      },
    },
  },
})

function App() {
  return <AdminApp client={cmsClient} config={adminConfig} router={...} />
}
```

## CLI Reference

```bash
# Generate migrations from schema changes
bunx qcms migrate:generate

# Apply pending migrations
bunx qcms migrate:up

# Rollback last migration
bunx qcms migrate:down

# Show migration status
bunx qcms migrate:status

# Reset database (dev only)
bunx qcms migrate:reset

# Fresh migration (reset + up)
bunx qcms migrate:fresh
```

## Examples

See the [`examples/`](./examples) directory for complete implementations:

- [`examples/tanstack-barbershop`](./examples/tanstack-barbershop) - TanStack Start + Admin UI
- [`examples/elysia-barbershop`](./examples/elysia-barbershop) - Elysia + Eden Treaty
- [`examples/portfolio-hono`](./examples/portfolio-hono) - Hono portfolio site

## Development

This is a Turborepo monorepo using Bun as the package manager.

```bash
# Install dependencies
bun install

# Run all packages in dev mode
bun run dev

# Build all packages
bun run build

# Run tests
bun test

# Type check
bun run check-types

# Lint
bun run lint

# Format
bun run format
```

## Documentation

Full documentation is available at the [docs site](./apps/docs) or run locally:

```bash
bun run dev --filter=docs
```

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) / Node.js
- **Database**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)
- **Validation**: [Zod v4](https://zod.dev)
- **Authentication**: [Better Auth](https://better-auth.com)
- **Storage**: [Flydrive](https://flydrive.dev)
- **Queue**: [pg-boss](https://github.com/timgit/pg-boss)
- **Email**: [Nodemailer](https://nodemailer.com) + [React Email](https://react.email)
- **Logging**: [Pino](https://getpino.io)
- **Admin UI**: React + [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)

## License

MIT
