# Admin Module Augmentation Refactor - Audit Log

## Overview

Refactoring from generic type passing (`<TApp>`, `<T extends Questpie<any>>`) to module augmentation pattern for type-safe admin access in hooks, providers, and components.

Following the same pattern as `001-module-augmentation-refactor.md` for the backend.

## Changes Made

### 1. Admin Type Registry (`builder/registry.ts`)

**File:** `packages/admin/src/builder/registry.ts`

**Added:**

- `AdminTypeRegistry` interface for module augmentation
- `RegisteredCMS` type helper
- `RegisteredAdmin` type helper
- `RegisteredCollectionNames` type helper
- `RegisteredGlobalNames` type helper

```typescript
export interface AdminTypeRegistry {
  // Augmented by user
}

export type RegisteredCMS = AdminTypeRegistry extends { cms: infer T }
  ? T extends Questpie<any>
    ? T
    : unknown
  : unknown;
```

**Usage (in user's admin.ts):**

```typescript
declare module "@questpie/admin/builder" {
  interface AdminTypeRegistry {
    cms: typeof cms;
    admin: typeof admin;
  }
}
```

---

### 2. Admin Types Update (`builder/admin-types.ts`)

**File:** `packages/admin/src/builder/admin-types.ts`

**Changes:**

- Re-export registry types for convenience

---

### 3. Admin Class (`builder/admin.ts`)

**File:** `packages/admin/src/builder/admin.ts`

**Added:**

- `Admin` class that wraps `AdminBuilder` with runtime methods
- Methods: `getCollections()`, `getGlobals()`, `getPages()`, `getDashboard()`, `getSidebar()`, `getLocale()`, etc.

---

### 4. Runtime Provider (`runtime/provider.tsx`)

**File:** `packages/admin/src/runtime/provider.tsx`

**Changes:**

- Removed `TApp` generic parameter from `useAdminContext()`
- Now uses `RegisteredCMS` from registry
- `AdminContextValue` no longer requires explicit generic

**New signature:**

```typescript
// Before
export function useAdminContext<
  TApp extends Questpie<any>,
>(): AdminContextValue<TApp>;

// After
export function useAdminContext(): AdminContextValue;
```

---

### 5. Collection Hooks (`hooks/use-collection.ts`)

**File:** `packages/admin/src/hooks/use-collection.ts`

**Changes:**

- Removed double generic `<T extends Questpie<any>, K extends ...>`
- Now uses `RegisteredCMS` and `RegisteredCollectionNames`

**New signatures:**

```typescript
// Before
export function useCollectionList<
  T extends Questpie<any>,
  K extends keyof QuestpieClient<T>["collections"],
>(collection: K, options?: ...)

// After
export function useCollectionList<K extends RegisteredCollectionNames>(
  collection: K,
  options?: ...
)
```

---

### 6. Builder Index Exports (`builder/index.ts`)

**File:** `packages/admin/src/builder/index.ts`

**Added:**

- Export `AdminTypeRegistry`, `RegisteredCMS`, `RegisteredAdmin`, etc.
- Export `Admin` class

---

### 7. Root Index (`src/index.ts`)

**File:** `packages/admin/src/index.ts`

**Added:**

- New root entry point for module augmentation
- Re-exports registry types from `./builder/registry`
- Re-exports key utilities from `./builder` and `./runtime/provider`

This enables `declare module "@questpie/admin"` to work.

---

### 8. Package.json Updates

**File:** `packages/admin/package.json`

**Added:**

- Root export `"."` pointing to `./src/index.ts`
- Corresponding `publishConfig.exports` entry

---

### 9. Legacy Admin Provider (`hooks/admin-provider.tsx`)

**File:** `packages/admin/src/hooks/admin-provider.tsx`

**Changes:**

- Updated `useAdminContext()` to use `RegisteredCMS` instead of generic
- Added `@deprecated` notice recommending `@questpie/admin/runtime` provider

---

### 10. Admin Routes Hook (`hooks/use-admin-routes.ts`)

**File:** `packages/admin/src/hooks/use-admin-routes.ts`

**Changes:**

- Removed generic parameter from `useAdminContext()` call

---

## Breaking Changes Summary

| Before                         | After                                               |
| ------------------------------ | --------------------------------------------------- |
| `useCollectionList<T, K>(...)` | `useCollectionList(collection)`                     |
| `useAdminContext<T>()`         | `useAdminContext()`                                 |
| `AdminProvider<TApp>`          | `AdminProvider`                                     |
| N/A                            | Requires `declare module "@questpie/admin/builder"` |

---

## Migration Guide

### For user setup:

```typescript
// admin.ts
import { qa } from "@questpie/admin/builder";
import { coreAdminModule } from "@questpie/admin/builder/defaults";
import type { AppCMS } from "./server/cms";

export const admin = qa()
  .use(coreAdminModule)
  .collections({...});

// Add this declaration for full type safety
declare module "@questpie/admin/builder" {
  interface AdminTypeRegistry {
    cms: AppCMS;
    admin: typeof admin;
  }
}
```

### For hooks:

```typescript
// Before
const { data } = useCollectionList<AppCMS, "barbers">("barbers");
const { client } = useAdminContext<AppCMS>();

// After
const { data } = useCollectionList("barbers");
const { client } = useAdminContext();
```

---

## User Setup Required

After updating to this version, users should add module augmentation to their `admin.ts`:

```typescript
export const admin = qa()
  .use(coreAdminModule)
  .collections({...})

// Add this declaration
declare module "@questpie/admin/builder" {
  interface AdminTypeRegistry {
    cms: AppCMS
    admin: typeof admin
  }
}
```

This enables full type safety for collection names, field keys, and client methods throughout the admin UI.

---

## Remaining Work

### Pre-existing Issues (not related to this refactor)

The following type errors exist in the codebase but are **not** caused by this refactor:

1. **Missing type exports from builder:**
   - `FieldComponentProps`, `FormViewConfig`, `FieldUIConfig`, `SectionConfig`, etc.
   - These are referenced but not exported from `@questpie/admin/builder`

2. **Runtime routes type issues:**
   - `CollectionConfig` missing `meta` property
   - Generic constraints on collection/global names

3. **Widget component props:**
   - `WidgetComponentProps` not exported

These should be addressed in a separate cleanup task.
