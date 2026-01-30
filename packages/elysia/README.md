# @questpie/elysia

Elysia adapter for QUESTPIE with full end-to-end type safety using Eden Treaty.

## Features

- **Full Type Safety**: End-to-end type safety using Elysia's Eden Treaty
- **High Performance**: Built on Elysia's blazing-fast framework
- **Auto-complete**: IntelliSense for all CMS routes and methods
- **Zero Config**: Works out of the box with minimal setup

## Installation

```bash
bun add @questpie/elysia questpie elysia
```

## Quick Start

### Server Setup

```typescript
import { Elysia } from "elysia";
import { questpieElysia } from "@questpie/elysia";
import { cms } from "./cms";

const app = new Elysia().use(questpieElysia(cms)).listen(3000);

console.log(
  `Server running at http://${app.server?.hostname}:${app.server?.port}`,
);

// Export type for Eden Treaty client
export type App = typeof app;
```

### Client Setup with Unified Client

```typescript
import { createClientFromEden } from "@questpie/elysia/client";
import { cms } from "./cms";
import type { App } from "./server";

// IMPORTANT: Use `typeof cms` directly (not a type alias) for proper type inference
const client = createClientFromEden<App, typeof cms>({
  server: "localhost:3000",
});

// Use CMS CRUD operations (fully typed!)
const posts = await client.collections.posts.find({ limit: 10 });

// Use Eden Treaty for custom routes (fully type-safe!)
const result = await client.api.custom.route.get();
```

## Configuration

### Custom Options

```typescript
import { Elysia } from "elysia";
import { questpieElysia } from "@questpie/elysia";
import { cms } from "./cms";

const app = new Elysia().use(
  questpieElysia(cms, {
    basePath: "/cms-api", // Default: '/cms'
    cors: {
      origin: "https://example.com",
      credentials: true,
    },
  }),
);
```

### Disable CORS

```typescript
const app = new Elysia().use(
  questpieElysia(cms, {
    cors: false, // Disable CORS middleware
  }),
);
```

## API Routes

The adapter automatically creates the following routes:

### Collections

- `GET /cms/:collection` - Find all items
- `POST /cms/:collection` - Create item
- `GET /cms/:collection/:id` - Find one item
- `PATCH /cms/:collection/:id` - Update item
- `DELETE /cms/:collection/:id` - Delete item
- `POST /cms/:collection/:id/restore` - Restore soft-deleted item

### Globals

- `GET /cms/globals/:global` - Get global settings
- `PATCH /cms/globals/:global` - Update global settings

### Storage

- `POST /cms/storage/upload` - Upload file

### Authentication

- `ALL /cms/auth/*` - Better Auth routes

## Type-Safe Client Examples

### CRUD Operations

```typescript
import { createClientFromEden } from "@questpie/elysia/client";
import { cms } from "./cms";
import type { App } from "./server";

// IMPORTANT: Use `typeof cms` directly for proper type inference
const client = createClientFromEden<App, typeof cms>({
  server: "localhost:3000",
});

// CMS CRUD operations (fully typed with autocomplete!)
const posts = await client.collections.posts.find({
  where: { published: true },
  limit: 10,
  orderBy: { createdAt: "desc" },
});

const newPost = await client.collections.posts.create({
  title: "New Post",
  content: "Content here",
});

const updated = await client.collections.posts.update("123", {
  title: "Updated Title",
});

await client.collections.posts.delete("123");
```

### With Relations

```typescript
const post = await client.collections.posts.findOne({
  where: { id: "123" },
  with: {
    author: true,
    comments: true,
  },
});
```

### Custom Routes with Eden Treaty

```typescript
// Custom business logic routes are fully type-safe!
const availability = await client.api.barbers[":id"].availability.get({
  params: { id: "barber-123" },
  query: { date: "2025-01-15" },
});

const booking = await client.api.appointments.book.post({
  barberId: "123",
  serviceId: "456",
  scheduledAt: "2025-01-15T10:00:00Z",
});
```

### File Upload

```typescript
const formData = new FormData();
formData.append("file", file);

const asset = await client.api.storage.upload.post(formData);
```

## Generic HTTP Client

If you prefer a generic HTTP client (not Eden Treaty), use the shared client from `questpie`:

```typescript
import { createClient } from "questpie/client";
import type { cms } from "./server";

const client = createClient<typeof cms>({
  baseURL: "http://localhost:3000",
  basePath: "/cms",
});

// Still type-safe but uses fetch under the hood
const posts = await client.collections.posts.find({ limit: 10 });
```

## Comparison with Hono

### Elysia + Eden Treaty (Recommended)

```typescript
import { createClientFromEden } from "@questpie/elysia/client";
import { cms } from "./cms";
import type { App } from "./server";

// Use `typeof cms` directly (not type alias!)
const client = createClientFromEden<App, typeof cms>({
  server: "localhost:3000",
});

// Fully type-safe end-to-end
// Auto-complete for all routes and collections
// Runtime type checking
// CMS CRUD + custom routes in one client
const posts = await client.collections.posts.find();
const custom = await client.api.custom.route.get();
```

### Hono RPC

```typescript
import { createClientFromHono } from "@questpie/hono/client";
import type { AppType } from "./server";
import type { cms } from "./cms";

const client = createClientFromHono<AppType, typeof cms>({
  baseURL: "http://localhost:3000",
});

// Limited type safety for custom routes
// Good CMS CRUD type safety
// Single unified client
const posts = await client.collections.posts.find();
const custom = await client.api.custom.route.$get();
```

## Why Elysia?

- **Better Type Safety**: Elysia with Eden Treaty provides superior end-to-end type safety compared to Hono
- **Performance**: Elysia is one of the fastest JavaScript web frameworks
- **Developer Experience**: Better IntelliSense and auto-complete
- **Modern**: Built with TypeScript from the ground up

## License

MIT
