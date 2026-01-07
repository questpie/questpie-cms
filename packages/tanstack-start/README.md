# @questpie/tanstack-start

TanStack Start adapter for QUESTPIE CMS.

## Features

- **File-Based Routes** - Native TanStack Start route handlers
- **Type-Safe Client** - Full TypeScript support with `@questpie/cms/client`
- **SSR Ready** - Server-side rendering with prefetching
- **Realtime** - SSE subscriptions for live updates

## Installation

```bash
bun add @questpie/tanstack-start @questpie/cms
```

## Quick Start

### 1. Configure CMS

```typescript
// src/cms/index.ts
import { defineQCMS } from "@questpie/cms";

export const cms = defineQCMS()
  .db({ connectionString: process.env.DATABASE_URL! })
  .collections({
    /* your collections */
  })
  .auth({
    baseURL: process.env.VITE_APP_URL!,
    secret: process.env.AUTH_SECRET!,
  })
  .build();

export type AppCMS = typeof cms;
```

### 2. Create Route Handler

```typescript
// src/routes/api/cms/$.ts
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { questpieStartHandlers } from "@questpie/tanstack-start";
import { cms } from "@/cms";

export const APIRoute = createAPIFileRoute("/api/cms/$")({
  ...questpieStartHandlers(cms, {
    basePath: "/api/cms",
  }),
});
```

### 3. Create Client

```typescript
// src/lib/cms-client.ts
import { createQCMSClient } from "@questpie/cms/client";
import type { AppCMS } from "@/cms";

export const cmsClient = createQCMSClient<AppCMS>({
  baseURL: import.meta.env.VITE_APP_URL,
  basePath: "/api/cms",
});
```

## Configuration Options

```typescript
questpieStartHandlers(cms, {
  // Base path for CMS routes (must match your route location)
  basePath: "/api/cms",
});
```

## API Routes

The adapter creates the following routes under your base path:

### Collections

| Method | Route                                    | Description          |
| ------ | ---------------------------------------- | -------------------- |
| GET    | `/api/cms/collections/:name`             | List items           |
| POST   | `/api/cms/collections/:name`             | Create item          |
| GET    | `/api/cms/collections/:name/:id`         | Get item             |
| PATCH  | `/api/cms/collections/:name/:id`         | Update item          |
| DELETE | `/api/cms/collections/:name/:id`         | Delete item          |
| POST   | `/api/cms/collections/:name/:id/restore` | Restore soft-deleted |

### Globals

| Method | Route                    | Description   |
| ------ | ------------------------ | ------------- |
| GET    | `/api/cms/globals/:name` | Get global    |
| PATCH  | `/api/cms/globals/:name` | Update global |

### Storage

| Method | Route                     | Description |
| ------ | ------------------------- | ----------- |
| POST   | `/api/cms/storage/upload` | Upload file |

### Authentication

| Method | Route             | Description        |
| ------ | ----------------- | ------------------ |
| ALL    | `/api/cms/auth/*` | Better Auth routes |

### Realtime

| Method | Route                                  | Description      |
| ------ | -------------------------------------- | ---------------- |
| GET    | `/api/cms/collections/:name/subscribe` | SSE subscription |
| GET    | `/api/cms/globals/:name/subscribe`     | SSE subscription |

## Usage Examples

### Route Loader (SSR)

```typescript
// src/routes/posts.tsx
import { createFileRoute } from "@tanstack/react-router"
import { cmsClient } from "@/lib/cms-client"

export const Route = createFileRoute("/posts")({
  loader: async () => {
    const posts = await cmsClient.collections.posts.find({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      limit: 10,
    })
    return { posts }
  },
  component: PostsPage,
})

function PostsPage() {
  const { posts } = Route.useLoaderData()

  return (
    <ul>
      {posts.data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### With TanStack Query

```typescript
// src/routes/posts.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createQCMSQueryOptions } from "@questpie/tanstack-query"
import { cmsClient } from "@/lib/cms-client"

const q = createQCMSQueryOptions(cmsClient)

export const Route = createFileRoute("/posts")({
  loader: async ({ context }) => {
    // Prefetch on server
    await context.queryClient.ensureQueryData(
      q.collections.posts.find({ limit: 10 })
    )
  },
  component: PostsPage,
})

function PostsPage() {
  const { data: posts } = useSuspenseQuery(
    q.collections.posts.find({ limit: 10 })
  )

  return (
    <ul>
      {posts.data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### With Relations

```typescript
const post = await cmsClient.collections.posts.findOne({
  where: { slug: params.slug },
  with: {
    author: true,
    category: true,
    comments: {
      with: { author: true },
    },
  },
});
```

### Mutations

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { cmsClient } from "@/lib/cms-client"

function CreatePostForm() {
  const queryClient = useQueryClient()

  const createPost = useMutation({
    mutationFn: (data: { title: string; content: string }) =>
      cmsClient.collections.posts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createPost.mutate({
      title: formData.get("title") as string,
      content: formData.get("content") as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Title" />
      <textarea name="content" placeholder="Content" />
      <button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? "Creating..." : "Create Post"}
      </button>
    </form>
  )
}
```

### File Upload

```typescript
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/cms/storage/upload", {
    method: "POST",
    body: formData,
  });

  return response.json();
}
```

### Realtime Subscriptions

```typescript
import { useEffect, useState } from "react"

function LivePosts() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    const eventSource = new EventSource("/api/cms/collections/posts/subscribe")

    eventSource.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data)
      if (type === "snapshot") {
        setPosts(data)
      }
    }

    return () => eventSource.close()
  }, [])

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### With TanStack DB

```typescript
import { createQCMSDBHelpers } from "@questpie/tanstack-query/db";
import { useQuery } from "@tanstack/react-query";

const db = createQCMSDBHelpers(cmsClient);

// Create a live collection
const postsCollection = db.collections.posts.createCollection({
  queryClient,
  getKey: (item) => item.id,
  syncMode: "on-demand",
  realtime: true,
});

// Use in component
function LivePosts() {
  const posts = useQuery(postsCollection);
  // Automatically syncs with realtime updates
}
```

### Authentication

```typescript
// Sign in
await cmsClient.auth.signIn({
  email: "user@example.com",
  password: "password",
});

// Get session
const session = await cmsClient.auth.getSession();

// Protected route
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context }) => {
    const session = await cmsClient.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
});
```

## Server Functions

Use the CMS directly in server functions:

```typescript
// src/server/posts.ts
import { createServerFn } from "@tanstack/react-start";
import { cms } from "@/cms";

export const createPost = createServerFn({ method: "POST" })
  .validator((data: { title: string; content: string }) => data)
  .handler(async ({ data }) => {
    return cms.collections.posts.create(data);
  });

// Use in component
import { createPost } from "@/server/posts";

function CreatePostForm() {
  const handleSubmit = async (formData: FormData) => {
    await createPost({
      data: {
        title: formData.get("title") as string,
        content: formData.get("content") as string,
      },
    });
  };
}
```

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
VITE_APP_URL=http://localhost:3000
AUTH_SECRET=your-secret-key

# Optional (for storage)
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

## Related Packages

- [`@questpie/cms`](../cms) - Core CMS engine
- [`@questpie/admin`](../admin) - Admin UI
- [`@questpie/tanstack-query`](../tanstack-query) - TanStack Query integration

## License

MIT
