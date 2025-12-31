# @questpie/tanstack-start

TanStack Start adapter for QUESTPIE CMS using file route handlers.

## Installation

```bash
bun add @questpie/tanstack-start @questpie/cms
```

## File Route Setup

```typescript
// src/routes/api/cms/$.ts
import { createFileRoute } from "@tanstack/react-router";
import { questpieStartHandlers } from "@questpie/tanstack-start";
import { cms } from "@/cms";

export const Route = createFileRoute("/api/cms/$")({
	server: {
		handlers: questpieStartHandlers(cms, {
			basePath: "/api/cms", // Use "/cms" for server-only apps
		}),
	},
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
