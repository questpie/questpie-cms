# @questpie/tanstack-query

Type-safe TanStack Query integration for QUESTPIE CMS with optional TanStack DB helpers for realtime sync.

## Features

- **Query Options Factory** - Pre-built query/mutation options for all CMS operations
- **SSR Ready** - Prefetch data on server, hydrate on client
- **Type-Safe** - Full TypeScript inference from your CMS schema
- **TanStack DB** - Optional realtime sync with local-first collections
- **Realtime** - Automatic SSE subscriptions

## Installation

```bash
bun add @questpie/tanstack-query @questpie/cms @tanstack/react-query
```

For TanStack DB helpers:

```bash
bun add @tanstack/db @tanstack/query-core @tanstack/query-db-collection
```

## Quick Start

### 1. Create Query Options

```typescript
// src/lib/queries.ts
import { createQCMSClient } from "@questpie/cms/client";
import { createQCMSQueryOptions } from "@questpie/tanstack-query";
import type { AppCMS } from "@/cms";

const cmsClient = createQCMSClient<AppCMS>({
  baseURL: "http://localhost:3000",
  basePath: "/api/cms",
});

export const q = createQCMSQueryOptions(cmsClient, {
  keyPrefix: ["cms"], // Optional: prefix for all query keys
});
```

### 2. Use in Components

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { q } from "@/lib/queries"

function PostsList() {
  // Queries
  const { data: posts } = useQuery(q.collections.posts.find({ limit: 10 }))

  // Mutations
  const queryClient = useQueryClient()

  const createPost = useMutation({
    ...q.collections.posts.create(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cms", "collections", "posts"] })
    },
  })

  return (
    <div>
      {posts?.data.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
      <button onClick={() => createPost.mutate({ title: "New Post" })}>
        Create Post
      </button>
    </div>
  )
}
```

## Query Options API

### Collections

```typescript
// Find many
q.collections.posts.find({
  where: { published: true },
  orderBy: { createdAt: "desc" },
  limit: 10,
  offset: 0,
  with: { author: true },
});

// Find one
q.collections.posts.findOne({
  where: { slug: "hello-world" },
  with: { author: true, comments: true },
});

// Create
q.collections.posts.create();
// Usage: mutation.mutate({ title: "...", content: "..." })

// Update
q.collections.posts.update();
// Usage: mutation.mutate({ id: "...", data: { title: "..." } })

// Delete
q.collections.posts.delete();
// Usage: mutation.mutate({ id: "..." })

// Restore (soft delete)
q.collections.posts.restore();
// Usage: mutation.mutate({ id: "..." })
```

### Globals

```typescript
// Get
q.globals.siteSettings.get();

// Update
q.globals.siteSettings.update();
// Usage: mutation.mutate({ siteName: "..." })
```

### Custom Queries

```typescript
const searchQuery = q.custom.query({
  key: ["search", query],
  queryFn: () => fetch(`/api/search?q=${query}`).then((r) => r.json()),
});

useQuery(searchQuery);
```

## SSR Prefetching

### TanStack Start

```typescript
// src/routes/posts.tsx
import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { q } from "@/lib/queries"

export const Route = createFileRoute("/posts")({
  loader: async ({ context }) => {
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

### Next.js

```typescript
// app/posts/page.tsx
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/query-client"
import { q } from "@/lib/queries"
import { PostsList } from "./posts-list"

export default async function PostsPage() {
  const queryClient = getQueryClient()

  await queryClient.prefetchQuery(
    q.collections.posts.find({ limit: 10 })
  )

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsList />
    </HydrationBoundary>
  )
}
```

## TanStack DB Helpers

For local-first collections with automatic sync and realtime updates:

```typescript
import { createQCMSDBHelpers } from "@questpie/tanstack-query/db";
import { useQuery } from "@tanstack/react-query";

const db = createQCMSDBHelpers(cmsClient, {
  keyPrefix: ["cms"],
});

// Create a synced collection
const postsCollection = db.collections.posts.createCollection({
  queryClient,
  getKey: (item) => item.id,
  syncMode: "on-demand", // or "realtime"
});
```

### Sync Modes

**On-Demand** - Fetches data when needed:

```typescript
const postsCollection = db.collections.posts.createCollection({
  queryClient,
  getKey: (item) => item.id,
  syncMode: "on-demand",
  mapLoadSubsetOptions: (options) => {
    // Map TanStack DB query options to CMS find options
    return mapLoadSubsetOptionsToFindOptions(options);
  },
});
```

**Realtime** - Automatic SSE sync:

```typescript
const postsCollection = db.collections.posts.createCollection({
  queryClient,
  getKey: (item) => item.id,
  syncMode: "on-demand",
  realtime: {
    basePath: "/api/cms",
    query: { limit: 100 }, // Initial query params
  },
});

// Cleanup on unmount
useEffect(() => {
  return () => postsCollection.realtime?.close();
}, []);
```

### Using Collections

```typescript
import { useDBCollection } from "@tanstack/react-query-db"

function LivePosts() {
  const posts = useDBCollection(postsCollection, {
    where: { published: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

## Load-Subset Mapping

Map TanStack DB query options to CMS find options:

```typescript
import { mapLoadSubsetOptionsToFindOptions } from "@questpie/tanstack-query/db";

const postsCollection = db.collections.posts.createCollection({
  queryClient,
  getKey: (item) => item.id,
  syncMode: "on-demand",
  mapLoadSubsetOptions: (options) => {
    const { where, orderBy, limit, offset } =
      mapLoadSubsetOptionsToFindOptions(options);

    // Add custom transformations
    return {
      where: {
        ...where,
        published: true, // Always filter by published
      },
      orderBy,
      limit,
      offset,
    };
  },
});
```

## Optimistic Updates

```typescript
const queryClient = useQueryClient();

const updatePost = useMutation({
  ...q.collections.posts.update(),
  onMutate: async ({ id, data }) => {
    await queryClient.cancelQueries({
      queryKey: ["cms", "collections", "posts"],
    });

    const previousPosts = queryClient.getQueryData([
      "cms",
      "collections",
      "posts",
    ]);

    queryClient.setQueryData(["cms", "collections", "posts"], (old) => ({
      ...old,
      data: old.data.map((post) =>
        post.id === id ? { ...post, ...data } : post,
      ),
    }));

    return { previousPosts };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(
      ["cms", "collections", "posts"],
      context?.previousPosts,
    );
  },
  onSettled: () => {
    queryClient.invalidateQueries({
      queryKey: ["cms", "collections", "posts"],
    });
  },
});
```

## Infinite Queries

```typescript
import { useInfiniteQuery } from "@tanstack/react-query"
import { cmsClient } from "@/lib/cms-client"

function InfinitePosts() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ["cms", "collections", "posts", "infinite"],
    queryFn: ({ pageParam = 0 }) =>
      cmsClient.collections.posts.find({
        limit: 10,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.flatMap((p) => p.data).length
      return lastPage.data.length === 10 ? totalFetched : undefined
    },
    initialPageParam: 0,
  })

  return (
    <div>
      {data?.pages.flatMap((page) =>
        page.data.map((post) => <div key={post.id}>{post.title}</div>)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>Load More</button>
      )}
    </div>
  )
}
```

## Query Key Structure

All query keys follow this structure:

```typescript
// Collections
[...keyPrefix, "collections", collectionName, "find", options]
[...keyPrefix, "collections", collectionName, "findOne", options]

// Globals
[...keyPrefix, "globals", globalName]

// Custom
[...keyPrefix, ...customKey]
```

## TypeScript

Full type inference from your CMS schema:

```typescript
import type { InferCollectionItem, InferGlobalData } from "@questpie/cms";
import type { AppCMS } from "@/cms";

// Collection item type
type Post = InferCollectionItem<AppCMS, "posts">;

// Global data type
type SiteSettings = InferGlobalData<AppCMS, "siteSettings">;

// Query result types are automatically inferred
const { data } = useQuery(q.collections.posts.find({ limit: 10 }));
//    ^? { data: Post[], meta: { total: number, ... } }
```

## Related Packages

- [`@questpie/cms`](../cms) - Core CMS engine
- [`@questpie/hono`](../hono) - Hono adapter
- [`@questpie/elysia`](../elysia) - Elysia adapter
- [`@questpie/next`](../next) - Next.js adapter
- [`@questpie/tanstack-start`](../tanstack-start) - TanStack Start adapter

## License

MIT
