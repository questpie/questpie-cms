# QUESTPIE CMS Core

The "Batteries Included" Core for QUESTPIE CMS.

## Documentation

*   **[Architecture](./docs/architecture.md)**: High-level overview of the system.
*   **[Collections](./docs/collections.md)**: Defining content models.
*   **[Authentication](./docs/auth.md)**: Better Auth integration.
*   **[Storage & Assets](./docs/storage.md)**: File management.
*   **[Queue System](./docs/queue.md)**: Background jobs.

## Quick Start

```typescript
import { CMS, collection, fields } from "@questpie/cms";

// 1. Define Content
const posts = defineCollection("posts")
  .fields({
    title: fields.text("title"),
    image: fields.image("cover"),
  });

// 2. Initialize CMS
const cms = new CMS({
  collections: [posts],
  db: dbInstance,
  auth: { /* ... */ },
  storage: { /* ... */ },
  queue: { /* ... */ },
  email: { /* ... */ },
});

// 3. Connect to Elysia
const app = new Elysia()
  .use(qcms(cms.config))
  .listen(3000);
```
