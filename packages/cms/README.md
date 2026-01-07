# @questpie/cms

**The "Batteries Included" Core for QUESTPIE CMS**

A type-safe, modular headless CMS engine built with Drizzle ORM. Includes authentication, storage, background jobs, email, and realtime - all integrated out of the box.

## Features

- **Type-Safe End-to-End** - Full TypeScript from schema to API
- **Drizzle ORM** - Native field types, relations, and migrations
- **Better Auth** - Authentication with plugins (admin, organization, 2FA, API keys)
- **Flydrive Storage** - S3, R2, GCS, or local filesystem
- **pg-boss Queue** - Background jobs with retry and scheduling
- **React Email** - Beautiful email templates with Nodemailer
- **Realtime** - PostgreSQL NOTIFY/LISTEN with SSE
- **Access Control** - Granular permissions at operation and field level

## Installation

```bash
bun add @questpie/cms

# Required peer dependencies
bun add drizzle-orm pg zod
```

## Quick Start

### 1. Define Collections

```typescript
// src/cms/collections/posts.ts
import { defineCollection } from "@questpie/cms";
import { varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const posts = defineCollection("posts")
  .fields({
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    content: text("content"),
    excerpt: text("excerpt"),
    publishedAt: timestamp("published_at", { mode: "date" }),
    featured: boolean("featured").default(false),
  })
  .title("title")
  .timestamps()
  .softDelete()
  .searchable(["title", "content"]);
```

### 2. Define Globals

```typescript
// src/cms/globals/site-settings.ts
import { defineGlobal } from "@questpie/cms";
import { varchar, text, jsonb } from "drizzle-orm/pg-core";

export const siteSettings = defineGlobal("site_settings").fields({
  siteName: varchar("site_name", { length: 255 }).notNull(),
  tagline: text("tagline"),
  logo: varchar("logo_url", { length: 500 }),
  socialLinks: jsonb("social_links").$type<{
    twitter?: string;
    github?: string;
  }>(),
});
```

### 3. Configure the CMS

```typescript
// src/cms/index.ts
import { defineQCMS } from "@questpie/cms";
import { posts } from "./collections/posts";
import { siteSettings } from "./globals/site-settings";

export const cms = defineQCMS()
  .db({ connectionString: process.env.DATABASE_URL! })
  .collections({ posts })
  .globals({ siteSettings })
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
  .queue({ connectionString: process.env.DATABASE_URL! })
  .email({
    transport: {
      host: process.env.SMTP_HOST!,
      port: 587,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    },
    from: "noreply@example.com",
  })
  .build();

export type AppCMS = typeof cms;
```

### 4. Run Migrations

```bash
# Generate migrations from schema
bunx qcms migrate:generate

# Apply migrations
bunx qcms migrate:up
```

## Collections

Collections are multi-record content types with full CRUD operations.

### Builder API

```typescript
import { varchar, text, integer, boolean, jsonb } from "drizzle-orm/pg-core";

const products = defineCollection("products")
  // Define database fields using Drizzle column types
  .fields({
    name: varchar("name", { length: 255 }).notNull(),
    price: integer("price").notNull(), // in cents
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    description: text("description"),
    inStock: boolean("in_stock").default(true),
    metadata: jsonb("metadata").$type<ProductMetadata>(),
  })

  // Set title field for admin display
  .title("name")

  // Add timestamps (createdAt, updatedAt)
  .timestamps()

  // Enable soft delete (deletedAt)
  .softDelete()

  // Enable versioning
  .versioned()

  // Enable localization
  .localized()

  // Full-text search fields
  .searchable(["name", "description"])

  // Database indexes
  .indexes((t) => [{ columns: [t.sku] }, { columns: [t.price, t.inStock] }])

  // Virtual computed fields
  .virtuals({
    displayPrice: (product) => `$${product.price}`,
  })

  // Relations
  .relations(({ one, many }) => ({
    category: one("categories", { from: "categoryId", to: "id" }),
    reviews: many("reviews", { from: "id", to: "productId" }),
  }))

  // Lifecycle hooks
  .hooks({
    beforeChange: async ({ data, operation }) => {
      if (operation === "create" && !data.sku) {
        data.sku = generateSku();
      }
      return data;
    },
    afterChange: async ({ doc, operation }) => {
      if (operation === "create") {
        await notifyInventory(doc);
      }
    },
  })

  // Access control
  .access({
    read: true,
    create: ({ user }) => !!user,
    update: ({ user }) => user?.role === "admin",
    delete: ({ user }) => user?.role === "admin",
  })

  // Collection options
  .options({
    singular: "Product",
    plural: "Products",
  });
```

### CRUD Operations

```typescript
// Create
const product = await cms.collections.products.create({
  name: "Widget",
  price: "19.99",
  sku: "WGT-001",
});

// Find many
const products = await cms.collections.products.find({
  where: { inStock: true },
  orderBy: { price: "asc" },
  limit: 10,
  offset: 0,
});

// Find one
const product = await cms.collections.products.findOne({
  where: { sku: "WGT-001" },
  with: { category: true, reviews: true },
});

// Update
const updated = await cms.collections.products.update("product-id", {
  price: "24.99",
});

// Delete
await cms.collections.products.delete("product-id");

// Restore (soft delete)
await cms.collections.products.restore("product-id");
```

## Fields

Fields use native Drizzle ORM column types from `drizzle-orm/pg-core`:

### String Fields

```typescript
import { text, varchar, char } from "drizzle-orm/pg-core";

text("content"); // TEXT
varchar("name", { length: 255 }); // VARCHAR(255)
char("code", { length: 3 }); // CHAR(3)
```

### Number Fields

```typescript
import {
  integer,
  bigint,
  smallint,
  serial,
  real,
  doublePrecision,
  numeric,
} from "drizzle-orm/pg-core";

integer("count"); // INTEGER
bigint("views", { mode: "number" }); // BIGINT
smallint("rating"); // SMALLINT
serial("id"); // SERIAL (auto-increment)
real("score"); // REAL (float)
doublePrecision("amount"); // DOUBLE PRECISION
numeric("price", { precision: 10, scale: 2 }); // NUMERIC(10,2)
```

### Other Types

```typescript
import {
  boolean,
  timestamp,
  date,
  time,
  uuid,
  json,
  jsonb,
} from "drizzle-orm/pg-core";

boolean("active"); // BOOLEAN
timestamp("publishedAt", { mode: "date" }); // TIMESTAMP
date("birthDate"); // DATE
time("startTime"); // TIME
uuid("externalId"); // UUID
json("metadata"); // JSON
jsonb("data"); // JSONB
```

### Field Modifiers

```typescript
varchar("title", { length: 255 })
  .notNull() // NOT NULL constraint
  .default("Untitled") // Default value
  .unique() // UNIQUE constraint
  .$type<CustomType>(); // TypeScript type override
```

### Arrays

```typescript
text("tags").array(); // TEXT[]
integer("scores").array(); // INTEGER[]
```

### Enums

```typescript
import { pgEnum } from "drizzle-orm/pg-core";

const statusEnum = pgEnum("status", ["draft", "published", "archived"])
  // Use in collection
  .fields({
    status: statusEnum("status").default("draft"),
  });
```

## Relations

### One (Many-to-One)

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
```

### Many (One-to-Many)

```typescript
const users = defineCollection("users")
  .fields({
    name: varchar("name", { length: 255 }).notNull(),
  })
  .relations(({ many }) => ({
    posts: many("posts"),
  }));
```

### Many-to-Many (Junction Table)

```typescript
const posts = defineCollection("posts")
  .fields({ title: varchar("title", { length: 255 }).notNull() })
  .relations(({ many }) => ({
    postTags: many("post_tags"),
  }));

const tags = defineCollection("tags")
  .fields({ name: varchar("name", { length: 255 }).notNull() })
  .relations(({ many }) => ({
    postTags: many("post_tags"),
  }));

const postTags = defineCollection("post_tags")
  .fields({
    postId: varchar("post_id", { length: 255 }).notNull(),
    tagId: varchar("tag_id", { length: 255 }).notNull(),
  })
  .relations(({ one, table }) => ({
    post: one("posts", {
      fields: [table.postId],
      references: ["id"],
    }),
    tag: one("tags", {
      fields: [table.tagId],
      references: ["id"],
    }),
  }));
```

### Querying Relations

```typescript
const post = await cms.collections.posts.findOne({
  where: { id: "post-id" },
  with: {
    author: true,
    tags: {
      with: { tag: true },
    },
  },
});
```

## Hooks

Lifecycle callbacks for business logic:

```typescript
.hooks({
  // Before validation
  beforeValidate: async ({ data, operation }) => {
    return data
  },

  // Before create/update
  beforeChange: async ({ data, operation, existingDoc }) => {
    if (operation === "update") {
      data.updatedAt = new Date()
    }
    return data
  },

  // After create/update
  afterChange: async ({ doc, operation, previousDoc }) => {
    if (operation === "create") {
      await sendNotification(doc)
    }
  },

  // Before read query
  beforeRead: async ({ query }) => {
    // Modify query
    return query
  },

  // After read
  afterRead: async ({ docs }) => {
    // Transform results
    return docs.map(transformDoc)
  },

  // Before delete
  beforeDelete: async ({ id }) => {
    await cleanupRelated(id)
  },

  // After delete
  afterDelete: async ({ id }) => {
    await notifyDeletion(id)
  },
})
```

### Hook Context

```typescript
beforeChange: async ({ data, operation, existingDoc, user, cms }) => {
  // operation: "create" | "update"
  // existingDoc: current document (update only)
  // user: authenticated user
  // cms: CMS instance
  return data;
};
```

## Access Control

### Operation-Level Access

```typescript
.access({
  // Boolean or function
  read: true,                                    // Public
  create: ({ user }) => !!user,                  // Authenticated
  update: ({ user, doc }) => user?.id === doc.ownerId,  // Owner only
  delete: ({ user }) => user?.role === "admin",  // Admin only
})
```

### WHERE Conditions

```typescript
.access({
  read: ({ user }) => {
    if (!user) return { published: true }  // Public sees published only
    if (user.role === "admin") return true  // Admin sees all
    return { OR: [{ published: true }, { authorId: user.id }] }
  },
})
```

### Field-Level Access

```typescript
.access({
  read: true,
  fields: {
    internalNotes: {
      read: ({ user }) => user?.role === "admin",
      update: ({ user }) => user?.role === "admin",
    },
    salary: {
      read: ({ user, doc }) => user?.id === doc.id || user?.role === "hr",
    },
  },
})
```

### Access Modes

```typescript
import {
  getCMSFromContext,
  runInUserMode,
  runInSystemMode,
} from "@questpie/cms";

// User mode (default) - applies access control
const posts = await cms.collections.posts.find();

// System mode - bypasses access control
const allPosts = await runInSystemMode(async () => {
  return cms.collections.posts.find();
});
```

## Authentication

Built-in Better Auth integration:

```typescript
cms.auth({
  baseURL: process.env.AUTH_URL!,
  secret: process.env.AUTH_SECRET!,

  // Enable plugins
  plugins: {
    admin: true,
    organization: true,
    twoFactor: true,
    apiKey: true,
  },

  // Social providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  // Extend user model
  user: {
    additionalFields: {
      bio: text("bio"),
      avatarUrl: varchar("avatar_url", { length: 500 }),
    },
  },
});
```

## Storage

File storage with Flydrive:

```typescript
cms.storage({
  default: "s3",
  disks: {
    local: {
      driver: "fs",
      root: "./uploads",
      urlBuilder: { baseUrl: "/uploads" },
    },
    s3: {
      driver: "s3",
      bucket: process.env.S3_BUCKET!,
      region: process.env.S3_REGION!,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    },
    r2: {
      driver: "s3",
      bucket: process.env.R2_BUCKET!,
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
    },
  },
});
```

### Built-in Assets Collection

The CMS automatically creates an `assets` collection for uploaded files:

```typescript
// Upload via API
POST /cms/storage/upload
Content-Type: multipart/form-data

// Response
{
  "id": "asset-uuid",
  "filename": "image.jpg",
  "mimeType": "image/jpeg",
  "size": 12345,
  "url": "https://..."
}
```

## Queue (Background Jobs)

Built-in pg-boss integration:

```typescript
// Define a job
import { defineJob } from "@questpie/cms";

export const processImage = defineJob("process-image")
  .input(
    z.object({
      assetId: z.string(),
      operations: z.array(z.enum(["resize", "optimize", "watermark"])),
    }),
  )
  .handler(async ({ input, cms }) => {
    const asset = await cms.collections.assets.findOne({
      where: { id: input.assetId },
    });
    // Process image...
  });

// Register with CMS
cms
  .queue({
    connectionString: process.env.DATABASE_URL!,
    jobs: [processImage],
  })

  // Trigger from hook
  .hooks({
    afterChange: async ({ doc }) => {
      await processImage.trigger({
        assetId: doc.id,
        operations: ["resize", "optimize"],
      });
    },
  });
```

### Scheduling

```typescript
const dailyCleanup = defineJob("daily-cleanup")
  .input(z.object({}))
  .schedule("0 0 * * *") // Cron: midnight daily
  .handler(async () => {
    // Cleanup logic
  });
```

## Email

React Email templates with Nodemailer:

```typescript
// Define template
import { defineEmailTemplate } from "@questpie/cms"
import { Html, Body, Text, Link } from "@react-email/components"

export const welcomeEmail = defineEmailTemplate("welcome")
  .input(z.object({
    name: z.string(),
    verifyUrl: z.string(),
  }))
  .subject(({ name }) => `Welcome, ${name}!`)
  .render(({ name, verifyUrl }) => (
    <Html>
      <Body>
        <Text>Hi {name}, welcome to our platform!</Text>
        <Link href={verifyUrl}>Verify your email</Link>
      </Body>
    </Html>
  ))

// Register
cms.email({
  transport: { /* nodemailer config */ },
  from: "noreply@example.com",
  templates: [welcomeEmail],
})

// Send
await cms.email.send({
  template: "welcome",
  to: user.email,
  data: { name: user.name, verifyUrl: "https://..." },
})
```

## Realtime

PostgreSQL NOTIFY/LISTEN with SSE:

```typescript
// Client-side subscription
const eventSource = new EventSource("/cms/collections/posts/subscribe");

eventSource.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  // type: "snapshot" | "insert" | "update" | "delete"
  console.log("Change:", type, data);
};

// With query parameters
const url = new URL("/cms/collections/posts/subscribe", baseURL);
url.searchParams.set("where", JSON.stringify({ published: true }));
url.searchParams.set("limit", "50");

const eventSource = new EventSource(url);
```

## Modular Composition

Create reusable CMS modules:

```typescript
// modules/blog.ts
import { defineCMSModule } from "@questpie/cms";

export const blogModule = defineCMSModule()
  .collections({
    posts: defineCollection("posts").fields({
      /* ... */
    }),
    categories: defineCollection("categories").fields({
      /* ... */
    }),
  })
  .globals({
    blogSettings: defineGlobal("blog_settings").fields({
      /* ... */
    }),
  });

// Use in CMS
const cms = defineQCMS()
  .use(blogModule)
  .use(ecommerceModule)
  .use(authModule)
  .build();
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

# Reset database (drops all tables)
bunx qcms migrate:reset

# Fresh migration (reset + generate + up)
bunx qcms migrate:fresh
```

### Configuration

Create `qcms.config.ts` in your project root:

```typescript
import { defineQCMSConfig } from "@questpie/cms/cli";
import { cms } from "./src/cms";

export default defineQCMSConfig({
  cms,
  migrations: {
    directory: "./migrations",
  },
});
```

## Client Usage

Use the generic HTTP client for type-safe API calls:

```typescript
import { createQCMSClient } from "@questpie/cms/client";
import type { cms } from "./cms";

const client = createQCMSClient<typeof cms>({
  baseURL: "http://localhost:3000",
  basePath: "/cms",
});

// Collections
const posts = await client.collections.posts.find({ limit: 10 });
const post = await client.collections.posts.findOne({
  where: { slug: "hello" },
});
const created = await client.collections.posts.create({ title: "New Post" });
const updated = await client.collections.posts.update("id", {
  title: "Updated",
});
await client.collections.posts.delete("id");

// Globals
const settings = await client.globals.siteSettings.get();
await client.globals.siteSettings.update({ siteName: "New Name" });

// Auth
const session = await client.auth.getSession();
await client.auth.signIn({ email, password });
await client.auth.signOut();
```

## Framework Adapters

Connect to your preferred framework:

| Adapter        | Package                                         |
| -------------- | ----------------------------------------------- |
| Hono           | [`@questpie/hono`](../hono)                     |
| Elysia         | [`@questpie/elysia`](../elysia)                 |
| Next.js        | [`@questpie/next`](../next)                     |
| TanStack Start | [`@questpie/tanstack-start`](../tanstack-start) |

## License

MIT
