---
"questpie": patch
"@questpie/admin": patch
"@questpie/hono": patch
"@questpie/elysia": patch
"@questpie/next": patch
"@questpie/tanstack-query": patch
---

Remove internal @questpie/typescript-config package and inline tsconfig settings

This removes the workspace:* dependency that was causing issues when installing published packages from npm.
