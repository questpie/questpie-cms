# 01 - I18N Application-Side Fallback

> **Status:** ✅ Implemented
> **Priority:** High
> **Dependencies:** None
> **Package:** `questpie/server`

## Overview

Refactor existujuceho i18n systemu z SQL-side COALESCE na application-side merge. Toto umozni:

- Jednoduchsie SQL queries
- Flexibilitu pre locale chains
- Zaklad pre nested localized JSONB (Phase 02)

---

## Current Implementation (SQL-side)

### Problem

```sql
-- Aktualne: COALESCE subquery per field
SELECT
  pages.id,
  pages.slug,
  COALESCE(
    i18n.title,
    (SELECT title FROM pages_i18n
     WHERE parent_id = pages.id
     AND locale = 'en')
  ) as title,
  COALESCE(
    i18n.description,
    (SELECT description FROM pages_i18n
     WHERE parent_id = pages.id
     AND locale = 'en')
  ) as description
FROM pages
LEFT JOIN pages_i18n i18n
  ON pages.id = i18n.parent_id
  AND i18n.locale = 'sk'
```

**Issues:**

- N subqueries per N lokalizovanych fields
- Komplexne SQL, tazke debugovat
- Neda sa rozsirit na nested JSONB
- Kazdy field potrebuje vlastny COALESCE

---

## Proposed Implementation (Application-side)

### SQL Layer - Simple LEFT JOINs

```sql
-- Nove: Len LEFT JOINs, ziadne COALESCE v SELECT
SELECT
  main.*,
  current_i18n.title as _i18n_title,
  current_i18n.description as _i18n_description,
  fallback_i18n.title as _i18n_fallback_title,
  fallback_i18n.description as _i18n_fallback_description
FROM pages main
LEFT JOIN pages_i18n current_i18n
  ON main.id = current_i18n.parent_id
  AND current_i18n.locale = $currentLocale
LEFT JOIN pages_i18n fallback_i18n
  ON main.id = fallback_i18n.parent_id
  AND fallback_i18n.locale = $fallbackLocale
```

### WHERE/ORDER - COALESCE stale potrebny

```sql
-- Pre filtrovanie a sortovanie potrebujeme COALESCE
WHERE COALESCE(current_i18n.title, fallback_i18n.title) ILIKE $search
ORDER BY COALESCE(current_i18n.title, fallback_i18n.title)
```

### Application Layer - Merge Logic

```typescript
// packages/questpie/src/server/collection/utils/i18n-merge.ts

export type MergeI18nOptions = {
  localizedFields: string[];
  locale: string;
  fallbackLocale: string;
};

export function mergeI18nRow<T extends Record<string, any>>(
  row: T,
  options: MergeI18nOptions,
): T {
  const result = { ...row };

  for (const field of options.localizedFields) {
    const currentKey = `_i18n_${field}`;
    const fallbackKey = `_i18n_fallback_${field}`;

    // Priorita: current locale > fallback locale
    result[field] = row[currentKey] ?? row[fallbackKey] ?? null;

    // Cleanup internal keys
    delete result[currentKey];
    delete result[fallbackKey];
  }

  return result;
}
```

---

## Implementation Details

### 1. Select Builder Changes

```typescript
// packages/questpie/src/server/collection/crud/query-builders/select-builder.ts

export function buildI18nSelect(
  state: CollectionState,
  table: PgTable,
  i18nTable: PgTable | null,
  context: RequestContext,
): SelectConfig {
  const select: Record<string, any> = {};
  const joins: JoinConfig[] = [];

  // Add main table fields
  for (const [name, column] of Object.entries(state.fields)) {
    if (!state.localized.includes(name)) {
      select[name] = column;
    }
  }

  if (i18nTable && context.locale) {
    const { locale, defaultLocale } = context;

    // JOIN for current locale
    joins.push({
      table: i18nTable,
      alias: "i18n_current",
      on: (main, i18n) =>
        and(eq(main.id, i18n.parentId), eq(i18n.locale, locale)),
    });

    // JOIN for fallback locale (only if different)
    if (locale !== defaultLocale && context.localeFallback !== false) {
      joins.push({
        table: i18nTable,
        alias: "i18n_fallback",
        on: (main, i18n) =>
          and(eq(main.id, i18n.parentId), eq(i18n.locale, defaultLocale)),
      });
    }

    // Add i18n fields to select (with prefixes)
    for (const field of state.localized) {
      select[`_i18n_${field}`] = sql`i18n_current.${sql.identifier(field)}`;
      if (locale !== defaultLocale && context.localeFallback !== false) {
        select[`_i18n_fallback_${field}`] =
          sql`i18n_fallback.${sql.identifier(field)}`;
      }
    }
  }

  return { select, joins };
}
```

### 2. AfterRead Hook Integration

```typescript
// packages/questpie/src/server/collection/crud/crud-generator.ts

async findOne(options: FindOneOptions): Promise<T | null> {
  const { context } = options;

  // Build query with LEFT JOINs
  const query = this.buildSelectQuery(options);
  const row = await query.execute();

  if (!row) return null;

  // Application-side merge
  const merged = mergeI18nRow(row, {
    localizedFields: this.state.localized,
    locale: context.locale,
    fallbackLocale: context.defaultLocale,
  });

  // Run afterRead hooks
  return this.runAfterReadHooks(merged, context);
}
```

### 3. Filter/Sort - COALESCE Helper

```typescript
// packages/questpie/src/server/collection/crud/query-builders/where-builder.ts

export function buildLocalizedFieldRef(
  field: string,
  state: CollectionState,
  context: RequestContext,
): SQL {
  if (!state.localized.includes(field)) {
    return sql.identifier(field);
  }

  // Pre WHERE/ORDER potrebujeme COALESCE
  return sql`COALESCE(
    i18n_current.${sql.identifier(field)},
    i18n_fallback.${sql.identifier(field)}
  )`;
}

// Usage in filter
const whereClause = and(
  ilike(buildLocalizedFieldRef("title", state, context), `%${search}%`),
);
```

---

## Locale Chain Support (Optional)

Pre buducnost mozeme podporovat locale chains:

```typescript
// Config
const localeConfig = {
  locales: [
    { code: "sk", fallbackChain: ["cz", "en"] },
    { code: "cz", fallbackChain: ["en"] },
    { code: "en", fallbackChain: [] }
  ]
};

// SQL - dynamic JOINs
SELECT main.*,
  l0.title as _i18n_0_title,  -- sk
  l1.title as _i18n_1_title,  -- cz (fallback 1)
  l2.title as _i18n_2_title   -- en (fallback 2)
FROM pages main
LEFT JOIN pages_i18n l0 ON ... AND locale = 'sk'
LEFT JOIN pages_i18n l1 ON ... AND locale = 'cz'
LEFT JOIN pages_i18n l2 ON ... AND locale = 'en'

// Application merge
function mergeWithChain(row, fields, chain) {
  for (const field of fields) {
    for (let i = 0; i < chain.length; i++) {
      const value = row[`_i18n_${i}_${field}`];
      if (value != null) {
        result[field] = value;
        break;
      }
    }
  }
}
```

**Note:** Pre v1 implementujeme len `current -> default` fallback. Chain moze byt pridany neskor.

---

## Migration Strategy

Breaking change, deprecated code gets removed.

## API Compatibility

**Ziadne breaking changes v API responses:**

```typescript
// Before (SQL-side)
{ id: "1", title: "Ahoj", slug: "/home" }

// After (Application-side)
{ id: "1", title: "Ahoj", slug: "/home" }
```

Internal implementation sa meni, ale API response zostava rovnaky.

---

## Testing

```typescript
describe("I18n Application-Side Fallback", () => {
  it("should return current locale value when available", async () => {
    const result = await cms.pages.findOne({
      where: { id: "1" },
      locale: "sk",
    });
    expect(result.title).toBe("Ahoj"); // SK value
  });

  it("should fallback to default locale when current is missing", async () => {
    // SK translation for description is missing
    const result = await cms.pages.findOne({
      where: { id: "1" },
      locale: "sk",
    });
    expect(result.description).toBe("Welcome"); // EN fallback
  });

  it("should return null when localeFallback is disabled", async () => {
    const result = await cms.pages.findOne({
      where: { id: "1" },
      locale: "sk",
      localeFallback: false,
    });
    expect(result.description).toBe(null); // No fallback
  });

  it("should filter using COALESCE", async () => {
    const results = await cms.pages.find({
      where: { title: { contains: "kontakt" } },
      locale: "sk",
    });
    // Should find pages where SK or EN title contains "kontakt"
  });
});
```

---

## File Changes Summary

| File                                                      | Change                             |
| --------------------------------------------------------- | ---------------------------------- |
| `server/collection/crud/query-builders/select-builder.ts` | Replace COALESCE with LEFT JOINs   |
| `server/collection/crud/query-builders/where-builder.ts`  | Add `buildLocalizedFieldRef()`     |
| `server/collection/utils/i18n-merge.ts`                   | **NEW** - merge utilities          |
| `server/collection/crud/crud-generator.ts`                | Add merge step in findOne/findMany |
| `server/collection/crud/shared/localization.ts`           | Update/extend                      |

---
