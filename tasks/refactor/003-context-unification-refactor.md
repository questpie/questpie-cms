# Context Unification Refactor - Audit Log

## Overview

Refaktoring kontextového systému:

1. **Zjednotenie `user`/`session`** do jedného `session` objektu inferovaného z Better Auth
2. **Odstránenie AsyncLocalStorage** (`runWithContext`, `getAppFromContext`, `getRequestContext`)
3. **Lepší typ pre `db`** inferovaný z app

## Motivácia

- Nekonzistentný pojem "context" naprieč kódom
- `user` a `session` sú vždy spolu (Better Auth ich vracia ako jeden objekt)
- Hardcoded `User & { role?: string }` namiesto inferovaného typu
- `db: any` bez dokumentácie že môže byť transakcia
- AsyncLocalStorage je "mágia" - explicitné posúvanie kontextu je čistejšie

---

## Changes Made

### 1. Context Types (`context.ts`)

**File:** `packages/questpie/src/server/config/context.ts`

**Removed:**

- `cmsContextStorage` (AsyncLocalStorage)
- `runWithContext()`
- `getAppFromContext()`
- `getRequestContext()`
- `CMSContextStore` type
- Import `AsyncLocalStorage`

**Added:**

```typescript
/**
 * Infer Session type from QuestpieContext.app.auth.$Infer.Session
 * Falls back to base Better Auth types if not augmented
 */
export type InferSession = QuestpieContext extends { app: infer TApp }
  ? TApp extends { auth: { $Infer: { Session: infer S } } }
    ? S
    : { user: User; session: Session }
  : { user: User; session: Session };

/**
 * Infer Db type from QuestpieContext.app.db
 */
export type InferDb = QuestpieContext extends { app: infer TApp }
  ? TApp extends { db: infer TDb }
    ? TDb
    : unknown
  : unknown;
```

**Updated `RequestContext`:**

```typescript
export interface RequestContext {
  /**
   * Auth session from Better Auth (contains user + session).
   * - undefined = session not resolved (e.g. system operation without request)
   * - null = explicitly unauthenticated
   * - object = authenticated session with user
   */
  session?: InferSession | null;
  locale?: string;
  defaultLocale?: string;
  accessMode?: AccessMode;
  db?: InferDb;
  [key: string]: unknown;
}
```

---

### 2. Function Types (`functions/types.ts`)

**File:** `packages/questpie/src/server/functions/types.ts`

**Updated interfaces** - replaced `user`/`session` with unified `session`:

```typescript
export interface FunctionHandlerArgs<TInput = any> {
  input: TInput;
  app: QuestpieApp;
  session?: InferSession | null;
  locale?: string;
  db: InferDb;
}
```

---

### 3. Collection Hook Types (`collection/builder/types.ts`)

**File:** `packages/questpie/src/server/collection/builder/types.ts`

**Updated `HookContext` and `AccessContext`** - replaced `user`/`session` with unified `session`.

---

### 4. Global Types (`global/builder/types.ts`)

**File:** `packages/questpie/src/server/global/builder/types.ts`

**Updated `GlobalHookContext` and `GlobalAccessContext`** - replaced `user`/`session` with unified `session`.

---

### 5. Queue Types (`integrated/queue/types.ts`)

**File:** `packages/questpie/src/server/integrated/queue/types.ts`

**Updated `JobHandlerArgs`** - replaced `user`/`session` with unified `session`.

---

### 6. HTTP Adapter (`adapters/http.ts`)

**File:** `packages/questpie/src/server/adapters/http.ts`

**Updated:**

- `AdapterContext` - replaced `user`/`session` with `session`
- `AdapterBaseContext` - replaced `user`/`session` with `session`
- Runtime context building

---

### 7. CRUD Generators

**Files:**

- `packages/questpie/src/server/collection/crud/crud-generator.ts`
- `packages/questpie/src/server/global/crud/global-crud-generator.ts`

**Removed:**

- `runWithContext` imports and wrappers

**Updated:**

- Hook context building to use unified `session`
- Access control context building

---

### 8. Function Execute (`functions/execute.ts`)

**File:** `packages/questpie/src/server/functions/execute.ts`

**Removed:**

- `runWithContext` import and wrapper

**Updated:**

- Handler call to use unified `session`

---

### 9. Queue Worker (`integrated/queue/worker.ts`)

**File:** `packages/questpie/src/server/integrated/queue/worker.ts`

**Removed:**

- `runWithContext` import and wrapper

**Updated:**

- Handler call to use unified `session`

---

### 10. CMS Class (`config/cms.ts`)

**File:** `packages/questpie/src/server/config/cms.ts`

**Updated `createContext`:**

- Accepts `session` instead of `user`/`session` separately

---

### 11. Exports (`exports/server.ts`)

**File:** `packages/questpie/src/exports/server.ts`

**Removed from exports:**

- `getAppFromContext`
- `getRequestContext`
- `runWithContext`

**Added to exports:**

- `InferSession`
- `InferDb`

---

## Breaking Changes Summary

| Before                            | After                            |
| --------------------------------- | -------------------------------- |
| `ctx.user?.id`                    | `ctx.session?.user.id`           |
| `ctx.user?.role`                  | `ctx.session?.user.role`         |
| `ctx.session?.expiresAt`          | `ctx.session?.session.expiresAt` |
| `user?: User & { role?: string }` | `session?: InferSession \| null` |
| `getAppFromContext<T>()`          | Use `ctx.app`                    |
| `getRequestContext()`             | Removed                          |
| `runWithContext(cms, ctx, fn)`    | Removed (call directly)          |

---

## Migration Guide

### Hook callbacks:

```typescript
// Before
afterChange: async ({ data, user, session }) => {
  if (user?.role === 'admin') { ... }
}

// After
afterChange: async ({ data, session }) => {
  if (session?.user.role === 'admin') { ... }
}
```

### Access control:

```typescript
// Before
access: {
  read: ({ user, data }) => data.userId === user?.id;
}

// After
access: {
  read: ({ session, data }) => data.userId === session?.user.id;
}
```

### Function/Job handlers:

```typescript
// Before
handler: async ({ input, user }) => {
  const cms = getAppFromContext();
  ...
}

// After
handler: async ({ input, session, app }) => {
  // app is already available
  ...
}
```

---

## Remaining Work

### TODO: Documentation Updates

- [ ] Update all code examples in `apps/docs`
- [ ] Update README examples
- [ ] Update JSDoc comments with new patterns

---

## Files Changed

| File                                                                | Status |
| ------------------------------------------------------------------- | ------ |
| `packages/questpie/src/server/config/context.ts`                    | Done   |
| `packages/questpie/src/server/config/cms.ts`                        | Done   |
| `packages/questpie/src/server/functions/types.ts`                   | Done   |
| `packages/questpie/src/server/functions/execute.ts`                 | Done   |
| `packages/questpie/src/server/collection/builder/types.ts`          | Done   |
| `packages/questpie/src/server/collection/crud/crud-generator.ts`    | Done   |
| `packages/questpie/src/server/global/builder/types.ts`              | Done   |
| `packages/questpie/src/server/global/crud/global-crud-generator.ts` | Done   |
| `packages/questpie/src/server/integrated/queue/types.ts`            | Done   |
| `packages/questpie/src/server/integrated/queue/worker.ts`           | Done   |
| `packages/questpie/src/server/adapters/http.ts`                     | Done   |
| `packages/questpie/src/exports/server.ts`                           | Done   |
| `test/**/*.ts`                                                      | Done   |
| `examples/**/*.ts`                                                  | Done   |
