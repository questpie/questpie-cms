# @questpie/next

Next.js adapter for QUESTPIE CMS using route handlers.

## Installation

```bash
bun add @questpie/next @questpie/cms
```

## App Router Setup

Create a catch-all route handler:

```typescript
// app/api/cms/[...path]/route.ts
import { questpieNextRouteHandlers } from "@questpie/next";
import { cms } from "@/cms";

export const { GET, POST, PATCH, DELETE } = questpieNextRouteHandlers(cms, {
	basePath: "/api/cms", // Use "/cms" for server-only apps
});
```

## Client

```typescript
import { createQCMSClient } from "@questpie/cms/client";
import type { cms } from "@/cms";

const client = createQCMSClient<typeof cms>({
	baseURL: "http://localhost:3000",
	basePath: "/api/cms", // Use "/cms" for server-only apps
});
```
