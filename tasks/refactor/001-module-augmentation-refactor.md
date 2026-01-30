# Module Augmentation Refactor - Audit Log

## Overview

Refactoring from generic type passing (`<AppCMS>`, `<TCMS>`) to module augmentation pattern for type-safe CMS access in hooks, functions, jobs, and access control.

## Changes Made

### 1. Context Registry (`context.ts`)

**File:** `packages/questpie/src/server/config/context.ts`

**Added:**

- `QuestpieContext` interface for module augmentation

```typescript
export interface QuestpieContext {
  app: unknown;
}
```

**Usage (in user's cms.ts):**

```typescript
declare module "questpie" {
  interface QuestpieContext {
    app: typeof cms;
  }
}
```

---

### 2. Function Types (`functions/types.ts`)

**File:** `packages/questpie/src/server/functions/types.ts`

**Changes:**

- Added `SafeApp` type (strips functions to prevent circular refs)
- Added `FunctionHandlerArgs<TInput>` interface
- Added `RawFunctionHandlerArgs` interface
- Changed handler signature from `(input: TInput) => TOutput` to `(args: FunctionHandlerArgs<TInput>) => TOutput`

**New handler signature:**

```typescript
handler: async ({ input, app, user, locale, db }) => {
  // input is validated input
  // app is SafeApp (CMS with functions stripped)
  return app.api.collections.x.find({...})
}
```

---

### 3. Function Execute (`functions/execute.ts`)

**File:** `packages/questpie/src/server/functions/execute.ts`

**Changed:**

- Handler call now passes object: `{ input, app, user, session, locale, db }`

---

### 4. Collection Hook Types (`collection/builder/types.ts`)

**File:** `packages/questpie/src/server/collection/builder/types.ts`

**Changes:**

- Added `SafeApp` type locally
- Removed `TCMS` generic from `HookContext`, `HookFunction`, all hook types
- Changed `cms` property to `app` in `HookContext`
- Removed deprecated `input` and `row` properties from `HookContext`
- Updated `AccessContext` to include `app` and renamed `row` to `data`
- Updated `CollectionHooks` interface (removed TCMS)

**New HookContext:**

```typescript
interface HookContext<TData, TOriginal, TOperation> {
  data: TData;
  original: TOriginal | undefined;
  app: SafeApp;
  user?: User & { role?: string };
  session?: Session;
  locale?: string;
  accessMode?: AccessMode;
  operation: TOperation;
  db: any;
}
```

---

### 5. Collection CRUD Generator (`collection/crud/crud-generator.ts`)

**File:** `packages/questpie/src/server/collection/crud/crud-generator.ts`

**Changes:**

- Updated `createHookContext` to use `app` instead of `cms`
- Updated `enforceAccessControl` to pass `app`, `data` instead of `row`
- Updated field access control contexts

---

### 6. Job Types (`integrated/queue/types.ts`)

**File:** `packages/questpie/src/server/integrated/queue/types.ts`

**Changes:**

- Added `SafeApp` type locally
- Added `JobHandlerArgs<TPayload>` interface
- Changed handler signature from `(payload, context)` to `(args: JobHandlerArgs<TPayload>)`

**New handler signature:**

```typescript
handler: async ({ payload, app, user, locale, db }) => {
  await app.email.send({...})
}
```

---

### 7. Job Worker (`integrated/queue/worker.ts`)

**File:** `packages/questpie/src/server/integrated/queue/worker.ts`

**Changed:**

- Handler call now passes object: `{ payload, app, user, session, locale, db }`

---

### 8. HTTP Adapter (`adapters/http.ts`)

**File:** `packages/questpie/src/server/adapters/http.ts`

**Changed:**

- Raw function handler call now passes object: `{ request, app, user, session, locale, db }`

---

### 9. Global Hook Types (`global/builder/types.ts`)

**File:** `packages/questpie/src/server/global/builder/types.ts`

**Changes:**

- Added `SafeApp` type locally
- Updated `GlobalHookContext` - renamed `row` to `data`, added `app`, `session`, `accessMode`
- Updated `GlobalAccessContext` - renamed `row` to `data`, added `app`, `session`

---

### 10. Assets Collection (`collection/defaults/assets.ts`)

**File:** `packages/questpie/src/server/collection/defaults/assets.ts`

**Changed:**

- Hook uses `app` instead of `cms` (with `as any` cast for now)

---

### 11. Trigger Job Function (`modules/jobs/functions/trigger-job.function.ts`)

**File:** `packages/questpie/src/server/modules/jobs/functions/trigger-job.function.ts`

**Changed:**

- Uses new handler signature `({ input, app })`
- Removed `getAppFromContext` import

---

## Remaining Work

### High Priority (Type Errors)

1. **Global CRUD Generator** (`global/crud/global-crud-generator.ts`)
   - Multiple inline hook context creations need to use `createHookContext`
   - ~12 locations with `row` that need to be `data`
   - ~2 access control contexts need `app`

2. **Collection Builder** (`collection/builder/collection-builder.ts`)
   - Already fixed - no remaining issues

### Medium Priority (Test Files)

3. **Test files need updating:**
   - `test/collection/collection-hooks.test.ts`
   - `test/collection/field-access.test.ts`
   - `test/collection/type-safe-hooks.test.ts`
   - `test/integration/error-handling.test.ts`
   - `test/integration/integration-cms.test.ts`
   - `test/integration/jobs-control-plane.test.ts`
   - `test/integration/rpc.test.ts`

### Low Priority (Examples)

4. **Example apps need updating:**
   - `examples/tanstack-barbershop/src/questpie/server/collections/appointments.ts`
   - `examples/tanstack-barbershop/src/questpie/server/cms.ts`

---

## Breaking Changes Summary

| Before                           | After                                |
| -------------------------------- | ------------------------------------ |
| `handler: (input) => ...`        | `handler: ({ input, app }) => ...`   |
| `handler: (payload, ctx) => ...` | `handler: ({ payload, app }) => ...` |
| `{ data, cms, operation }`       | `{ data, app, operation }`           |
| `{ row, user, db }`              | `{ data, app, user, db }`            |
| `getAppFromContext<AppCMS>()`    | Use `app` from context               |
| `CollectionHooks<S,I,U,TCMS>`    | `CollectionHooks<S,I,U>`             |

---

## Migration Guide

### For hook callbacks:

```typescript
// Before
.hooks({
  afterChange: async ({ data, cms, operation }) => {
    await cms.queue.job.publish({...})
  }
})

// After
.hooks({
  afterChange: async ({ data, app, operation }) => {
    await app.queue.job.publish({...})
  }
})
```

### For function handlers:

```typescript
// Before
handler: async (input) => {
  const cms = getAppFromContext<AppCMS>()
  return cms.api.collections.x.find({...})
}

// After
handler: async ({ input, app }) => {
  return app.api.collections.x.find({...})
}
```

### For job handlers:

```typescript
// Before
handler: async (payload, context) => {
  // need getAppFromContext
}

// After
handler: async ({ payload, app }) => {
  await app.email.send({...})
}
```

### For access control:

```typescript
// Before
access: {
  read: ({ user, row, db }) => row.userId === user?.id;
}

// After
access: {
  read: ({ user, data, app, db }) => data.userId === user?.id;
}
```

---

## User Setup Required

After updating to this version, users must add module augmentation to their `cms.ts`:

```typescript
export const cms = q({ name: "my-app" })
  .use(starterModule)
  .collections({...})
  .build({...})

// Add this declaration
declare module "questpie" {
  interface QuestpieContext {
    app: typeof cms
  }
}
```

This enables full type safety for `app` in all hooks, functions, jobs, and access control callbacks.
