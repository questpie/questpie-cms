# Adapter Standard (HTTP)

This document defines the shared contract for HTTP adapters that expose QUESTPIE CMS APIs over web frameworks.

## Purpose

- Keep all framework adapters behaviorally compatible.
- Centralize parsing, context creation, and error handling.
- Provide a single e2e compatibility test suite.

## Reference Implementation

Use the shared adapter core in `packages/cms/src/server/adapters/http.ts`:

- `createCMSAdapterContext`
- `createCMSAdapterRoutes`
- `createCMSFetchHandler`

Adapters should delegate to these helpers rather than re-implementing logic.

## Base Path

- Default `basePath` is `/cms`.
- `basePath` is the CMS root (no extra `/cms` segment).
- For fullstack apps, use `/api/cms`.
- Legacy `{basePath}/cms/*` is still accepted for backwards compatibility.

## Routes

### Auth
- `ALL {basePath}/auth/*`

Delegates to `cms.auth.handler(request)`.

### Storage
- `POST {basePath}/storage/upload`

Accepts `multipart/form-data` with a `file` field. Returns the created `questpie_assets` record.

### Collections
- `GET {basePath}/:collection`
- `POST {basePath}/:collection`
- `GET {basePath}/:collection/:id`
- `PATCH {basePath}/:collection/:id`
- `DELETE {basePath}/:collection/:id`
- `POST {basePath}/:collection/:id/restore`

Supported query params on `GET`:
- `limit`, `offset`, `page`
- `where`, `orderBy`, `with`
- `includeDeleted`

### Globals
- `GET {basePath}/globals/:global`
- `PATCH {basePath}/globals/:global`

### Realtime (SSE)
- `GET {basePath}/realtime/:collection`
- `GET {basePath}/realtime/globals/:global`

## Request Context

- Use `createCMSAdapterContext` to build `cmsContext`.
- `accessMode` defaults to `"user"` for HTTP requests.
- Locale is derived from the `Accept-Language` header (or CMS defaults).
- Auth session is resolved via `cms.auth.api.getSession` when available.

## Error Responses

- JSON shape: `{ "error": "..." }`
- Status codes:
  - `404` for missing collection/global or missing records
  - `400` for invalid JSON or mutation errors
  - `500` for unexpected errors

## Compatibility Test Suite

Run the adapter compatibility tests from:

```
packages/adapter-compat
```

Command:

```
bun test
```

The suite validates CRUD, globals, and storage routes across all adapters.
