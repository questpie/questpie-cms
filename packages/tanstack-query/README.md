# @questpie/tanstack-query

Type-safe TanStack Query option builders for QUESTPIE CMS, with optional TanStack DB helpers.

## Installation

```bash
bun add @questpie/tanstack-query @questpie/cms
```

If you use the `./db` helpers:

```bash
bun add @tanstack/db @tanstack/query-core @tanstack/query-db-collection
```

## Query Options (SSR-friendly)

```ts
import { createQCMSClient } from "@questpie/cms/client";
import { createQCMSQueryOptions } from "@questpie/tanstack-query";
import type { cms } from "@/cms";

const client = createQCMSClient<typeof cms>({
	baseURL: "http://localhost:3000",
	basePath: "/api/cms",
});

const q = createQCMSQueryOptions(client, {
	keyPrefix: ["qcms", "http://localhost:3000"],
});

// TanStack Query usage
useQuery(q.collections.posts.find({ limit: 10 }));
useMutation(q.collections.posts.create());

// SSR prefetch
await queryClient.prefetchQuery(q.collections.posts.find({ limit: 10 }));
```

## Custom Endpoints

```ts
const search = q.custom.query({
	key: ["search", { query }],
	queryFn: () => fetch(`/api/search?q=${query}`).then((r) => r.json()),
});

useQuery(search);
```

## TanStack DB Helpers

```ts
import {
	createQCMSDBHelpers,
	mapLoadSubsetOptionsToFindOptions,
} from "@questpie/tanstack-query/db";

const db = createQCMSDBHelpers(client, {
	keyPrefix: ["qcms", "http://localhost:3000"],
});

const postsCollection = db.collections.posts.createCollection({
	queryClient,
	getKey: (item) => item.id,
	syncMode: "on-demand",
	realtime: true,
});
```

## Load-Subset Mapping (On-Demand Sync)

```ts
const postsCollection = db.collections.posts.createCollection({
	queryClient,
	getKey: (item) => item.id,
	syncMode: "on-demand",
	mapLoadSubsetOptions: (options) => {
		const { where, orderBy, limit } =
			mapLoadSubsetOptionsToFindOptions(options);
		return { where, orderBy, limit };
	},
});
```

## Realtime (Automatic SSE)

```ts
const postsCollection = db.collections.posts.createCollection({
	queryClient,
	getKey: (item) => item.id,
	syncMode: "on-demand",
	realtime: {
		basePath: "/api/cms",
		query: { limit: 50 },
	},
});

// Optional cleanup
postsCollection.realtime?.close();
```
