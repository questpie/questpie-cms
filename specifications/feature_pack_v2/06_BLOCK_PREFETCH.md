# 06 - Block Prefetch

> **Status:** Implemented
> **Priority:** Medium
> **Dependencies:** 03_BLOCK_SYSTEM
> **Package:** `@questpie/admin`

## Overview

SSR data prefetch pre bloky ktore potrebuju fetchovat externe data. Umoznuje blokom deklarovat `prefetch` funkciu ktora sa vykona v route loaderi na serveri.

---

## Two Approaches

### 1. With Prefetch (SSR)

Blok deklaruje `prefetch` funkciu - data sa nacitaju na serveri:

```typescript
const latestPostsBlock = qa
  .block("latestPosts")
  .fields(({ r }) => ({
    title: r.text({ label: "Title", localized: true }),
    count: r.number({ label: "Post Count", defaultValue: 3 }),
    category: r.relation({
      label: "Category",
      targetCollection: "categories",
      type: "single"
    }),
  }))
  .prefetch(async ({ values, cms, locale }) => {
    const posts = await cms.posts.find({
      where: values.category
        ? { categoryId: values.category }
        : undefined,
      limit: values.count || 3,
      locale,
      orderBy: { createdAt: "desc" },
    });
    return { posts };
  })
  .renderer(({ values, data }) => (
    <section>
      <h2>{values.title}</h2>
      <div className="grid grid-cols-3 gap-4">
        {data?.posts?.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  ))
```

### 2. Without Prefetch (Client-side)

Blok bez `prefetch` - data sa nacitaju na klientovi:

```typescript
const dynamicProductsBlock = qa
  .block("dynamicProducts")
  .fields(({ r }) => ({
    category: r.relation({
      targetCollection: "categories",
      type: "single"
    }),
  }))
  .renderer(({ values }) => {
    // Client-side data fetching
    const { data, isLoading, error } = useQuery({
      queryKey: ["products", values.category],
      queryFn: () => fetchProducts(values.category),
    });

    if (isLoading) return <ProductsSkeleton />;
    if (error) return <ProductsError error={error} />;

    return <ProductGrid products={data} />;
  })
```

---

## Prefetch Types

```typescript
// packages/admin/src/client/blocks/prefetch.ts

/**
 * Context passed to block prefetch function.
 */
export type BlockPrefetchContext = {
  /** Block field values */
  values: Record<string, any>;
  /** CMS client for data fetching */
  cms: CMSClient;
  /** Current locale */
  locale: string;
  /** Default locale (for fallback) */
  defaultLocale: string;
  /** Original request (for headers, cookies, etc.) */
  request?: Request;
};

/**
 * Block prefetch function signature.
 */
export type BlockPrefetch<TData = any> = (
  context: BlockPrefetchContext,
) => Promise<TData>;

/**
 * Result of prefetching all blocks.
 */
export type BlockPrefetchResult = Record<string, any>;
```

---

## prefetchBlockData Utility

```typescript
// packages/admin/src/client/blocks/prefetch.ts

import type { BlockContent, BlockNode } from "./types";
import type { BlockDefinition } from "../builder/block/types";

/**
 * Prefetch data for all blocks that have prefetch functions.
 * Executes all prefetch functions in parallel.
 */
export async function prefetchBlockData(
  /** Block content from collection */
  content: BlockContent,
  /** Registered block definitions */
  blocks: Record<string, BlockDefinition>,
  /** Prefetch context */
  context: Omit<BlockPrefetchContext, "values">,
): Promise<BlockPrefetchResult> {
  const requirements: Array<{
    blockId: string;
    prefetch: BlockPrefetch;
    values: Record<string, any>;
  }> = [];

  // Recursively collect all blocks with prefetch
  function collectPrefetch(node: BlockNode) {
    const blockDef = blocks[node.type];

    if (blockDef?.prefetch) {
      requirements.push({
        blockId: node.id,
        prefetch: blockDef.prefetch,
        values: content._values[node.id] || {},
      });
    }

    // Process children
    node.children?.forEach(collectPrefetch);
  }

  content._tree.forEach(collectPrefetch);

  // No prefetch needed
  if (requirements.length === 0) {
    return {};
  }

  // Execute all prefetch functions in parallel
  const results = await Promise.allSettled(
    requirements.map(async ({ blockId, prefetch, values }) => {
      const data = await prefetch({ ...context, values });
      return { blockId, data };
    }),
  );

  // Build result map
  const prefetchResult: BlockPrefetchResult = {};

  for (const result of results) {
    if (result.status === "fulfilled") {
      prefetchResult[result.value.blockId] = result.value.data;
    } else {
      // Log error but don't fail entire page
      console.error("Block prefetch failed:", result.reason);
    }
  }

  return prefetchResult;
}
```

---

## Usage in Route Loaders

### TanStack Start

```typescript
// app/routes/$locale/pages/$slug.tsx
import { createFileRoute } from "@tanstack/react-router";
import { prefetchBlockData } from "@questpie/admin/client";
import { blocks } from "~/admin/blocks";

export const Route = createFileRoute("/$locale/pages/$slug")({
  loader: async ({ params, context }) => {
    const { cms } = context;
    const { locale, slug } = params;

    // Fetch page
    const page = await cms.pages.findOne({
      where: { slug },
      locale,
    });

    if (!page) {
      throw new Error("Page not found");
    }

    // Prefetch block data
    const blockData = await prefetchBlockData(
      page.content,
      blocks,
      {
        cms,
        locale,
        defaultLocale: context.defaultLocale,
      }
    );

    return { page, blockData };
  },
});

// Component
function PageComponent() {
  const { page, blockData } = Route.useLoaderData();

  return (
    <article>
      <h1>{page.title}</h1>
      <BlockRenderer
        content={page.content}
        blocks={blocks}
        data={blockData}  // Pass prefetched data
      />
    </article>
  );
}
```

### Next.js App Router

```typescript
// app/[locale]/pages/[slug]/page.tsx
import { prefetchBlockData } from "@questpie/admin/client";
import { blocks } from "~/admin/blocks";
import { cms } from "~/cms";

export default async function Page({
  params
}: {
  params: { locale: string; slug: string }
}) {
  const { locale, slug } = params;

  const page = await cms.pages.findOne({
    where: { slug },
    locale,
  });

  if (!page) {
    notFound();
  }

  const blockData = await prefetchBlockData(
    page.content,
    blocks,
    { cms, locale, defaultLocale: "en" }
  );

  return <PageContent page={page} blockData={blockData} />;
}
```

### Hono

```typescript
// src/routes/pages.tsx
import { Hono } from "hono";
import { prefetchBlockData } from "@questpie/admin/client";

const app = new Hono();

app.get("/:locale/pages/:slug", async (c) => {
  const { locale, slug } = c.req.param();
  const cms = c.get("cms");

  const page = await cms.pages.findOne({ where: { slug }, locale });
  if (!page) return c.notFound();

  const blockData = await prefetchBlockData(
    page.content,
    blocks,
    { cms, locale, defaultLocale: "en", request: c.req.raw }
  );

  return c.html(
    <PageTemplate page={page} blockData={blockData} />
  );
});
```

---

## BlockRenderer with Data

```typescript
// packages/admin/src/client/components/blocks/block-renderer.tsx

export type BlockRendererProps = {
  content: BlockContent;
  blocks: Record<string, BlockDefinition>;
  /** Prefetched data by block ID */
  data?: BlockPrefetchResult;
  selectedBlockId?: string | null;
  onBlockClick?: (blockId: string) => void;
};

export function BlockRenderer({
  content,
  blocks,
  data = {},
  selectedBlockId,
  onBlockClick,
}: BlockRendererProps) {

  function renderBlock(node: BlockNode): React.ReactNode {
    const blockDef = blocks[node.type];
    if (!blockDef?.renderer) return null;

    const Component = blockDef.renderer;
    const values = content._values[node.id] || {};
    const blockData = data[node.id];  // Data from prefetch

    return (
      <div
        key={node.id}
        data-block-id={node.id}
        onClick={(e) => {
          e.stopPropagation();
          onBlockClick?.(node.id);
        }}
      >
        <Component
          id={node.id}
          values={values}
          data={blockData}  // Pass to renderer
          isSelected={selectedBlockId === node.id}
        >
          {node.children?.map(renderBlock)}
        </Component>
      </div>
    );
  }

  return <>{content._tree.map(renderBlock)}</>;
}
```

---

## Error Handling

### Graceful Degradation

```typescript
// Block renderer handles missing data gracefully
function LatestPostsRenderer({ values, data }: BlockRendererProps) {
  // data.posts might be undefined if prefetch failed
  const posts = data?.posts || [];

  if (posts.length === 0) {
    return (
      <section>
        <h2>{values.title}</h2>
        <p className="text-muted-foreground">No posts available</p>
      </section>
    );
  }

  return (
    <section>
      <h2>{values.title}</h2>
      <div className="grid grid-cols-3 gap-4">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>
    </section>
  );
}
```

### Fallback to Client-side

```typescript
function SmartPostsRenderer({ values, data }: BlockRendererProps) {
  // If SSR data available, use it
  if (data?.posts) {
    return <PostGrid posts={data.posts} />;
  }

  // Otherwise, fetch client-side
  const { data: clientData, isLoading } = useQuery({
    queryKey: ["posts", values.count],
    queryFn: () => fetchPosts(values.count),
  });

  if (isLoading) return <PostsSkeleton />;

  return <PostGrid posts={clientData?.posts || []} />;
}
```

---

## Caching Considerations

```typescript
// Example: Cache prefetch results
import { unstable_cache } from "next/cache";

const cachedPrefetch = unstable_cache(
  async (content, locale) => {
    return prefetchBlockData(content, blocks, {
      cms,
      locale,
      defaultLocale: "en",
    });
  },
  ["block-prefetch"],
  { revalidate: 60 }, // Cache for 60 seconds
);

// In loader
const blockData = await cachedPrefetch(page.content, locale);
```

---

## Type Safety

```typescript
// Block with typed prefetch data
type LatestPostsData = {
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
  }>;
};

const latestPostsBlock = qa
  .block("latestPosts")
  .fields(({ r }) => ({
    title: r.text({ label: "Title", localized: true }),
    count: r.number({ label: "Count" }),
  }))
  .prefetch<LatestPostsData>(async ({ values, cms, locale }) => {
    const posts = await cms.posts.find({ limit: values.count, locale });
    return { posts };
  })
  .renderer(({ values, data }: BlockRendererProps<
    { title: string; count: number },
    LatestPostsData
  >) => {
    // data is typed as LatestPostsData | undefined
    return (
      <section>
        <h2>{values.title}</h2>
        {data?.posts.map(post => (
          <article key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
          </article>
        ))}
      </section>
    );
  })
```

---

## File Structure

```
packages/admin/src/client/
└── blocks/
    ├── types.ts          # BlockNode, BlockContent, BlockRendererProps
    ├── prefetch.ts       # prefetchBlockData(), BlockPrefetchContext
    ├── block-renderer.tsx
    └── index.ts
```

---

## Exports

```typescript
// packages/admin/src/exports/client.ts

export {
  prefetchBlockData,
  type BlockPrefetch,
  type BlockPrefetchContext,
  type BlockPrefetchResult,
  type BlockNode,
  type BlockContent,
  type BlockRendererProps,
  BlockRenderer,
} from "../client/blocks";
```

**Note:** Vsetko block-related sa exportuje z `@questpie/admin/client` pre pouzitie v user's app (frontend routing, SSR loaders).
