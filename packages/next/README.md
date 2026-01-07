# @questpie/next

Next.js App Router adapter for QUESTPIE CMS.

## Features

- **App Router Support** - Catch-all route handlers for Next.js 13+
- **Type-Safe Client** - Full TypeScript support with `@questpie/cms/client`
- **Server Components** - Works with React Server Components
- **Edge Runtime** - Compatible with Edge Runtime (with limitations)

## Installation

```bash
bun add @questpie/next @questpie/cms
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
    baseURL: process.env.NEXT_PUBLIC_URL!,
    secret: process.env.AUTH_SECRET!,
  })
  .build();

export type AppCMS = typeof cms;
```

### 2. Create Route Handler

```typescript
// app/api/cms/[...path]/route.ts
import { questpieNextRouteHandlers } from "@questpie/next";
import { cms } from "@/cms";

export const { GET, POST, PUT, PATCH, DELETE } = questpieNextRouteHandlers(
  cms,
  {
    basePath: "/api/cms",
  },
);

// Enable dynamic rendering
export const dynamic = "force-dynamic";
```

### 3. Use the Client

```typescript
// src/lib/cms-client.ts
import { createQCMSClient } from "@questpie/cms/client";
import type { AppCMS } from "@/cms";

export const cmsClient = createQCMSClient<AppCMS>({
  baseURL: process.env.NEXT_PUBLIC_URL!,
  basePath: "/api/cms",
});
```

## Configuration Options

```typescript
questpieNextRouteHandlers(cms, {
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

### Server Component

```typescript
// app/posts/page.tsx
import { cmsClient } from "@/lib/cms-client"

export default async function PostsPage() {
  const posts = await cmsClient.collections.posts.find({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    limit: 10,
  })

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
  },
});
```

### Client Component with TanStack Query

```typescript
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cmsClient } from "@/lib/cms-client";

export function PostsList() {
  const { data: posts } = useQuery({
    queryKey: ["posts"],
    queryFn: () => cmsClient.collections.posts.find({ limit: 10 }),
  });

  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: (data: { title: string }) =>
      cmsClient.collections.posts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  // ...
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

### Authentication

```typescript
// Sign in
await cmsClient.auth.signIn({
  email: "user@example.com",
  password: "password",
});

// Get session
const session = await cmsClient.auth.getSession();

// Sign out
await cmsClient.auth.signOut();
```

## Server Actions

You can also use the CMS directly in Server Actions:

```typescript
// app/actions.ts
"use server";

import { cms } from "@/cms";
import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const post = await cms.collections.posts.create({
    title: formData.get("title") as string,
    content: formData.get("content") as string,
  });

  revalidatePath("/posts");
  return post;
}
```

## Middleware

Protect routes with Next.js middleware:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("session");

  if (!session && request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://...
NEXT_PUBLIC_URL=http://localhost:3000
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
