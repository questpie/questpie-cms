# Faceted Search Implementation Plan

## Overview

Add type-safe faceted search to QuestPie CMS with:

- Collection-level facet definition via `.searchable()`
- Separate facets table for efficient aggregation
- Multi-value facets (arrays), numeric range buckets, and hierarchical facets
- Dynamic facet counts that reflect current query/filters
- Adapter-agnostic API (Postgres implements, others can optimize differently)

## Design Principles

1. **Universal API** - Same syntax regardless of adapter (Postgres, Meilisearch, Elasticsearch)
2. **Type-Safe** - Compile-time validation from definition to query to response
3. **Adapter Transforms** - Each adapter optimizes for its backend (Postgres uses separate table, Meilisearch uses native facets)
4. **Dynamic Counts** - Facet counts reflect current query and filters

---

## Phase 1: Type Definitions

### 1.1 Facet Configuration Types

```ts
/**
 * Facet field definition options
 */
export type FacetFieldConfig =
  | true // Simple string facet
  | { type: "array" } // Multi-value facet (e.g., tags)
  | {
      type: "range";
      buckets: Array<{
        label: string;
        min?: number;
        max?: number;
      }>;
    }
  | {
      type: "hierarchy";
      separator?: string; // Default: " > "
    };

/**
 * Facets configuration object
 * Keys must be a subset of metadata keys
 */
export type FacetsConfig<TMetadata extends Record<string, any>> = {
  [K in keyof TMetadata]?: FacetFieldConfig;
};
```

### 1.2 Updated SearchableConfig

```ts
export type SearchableConfig<
  TRecord = any,
  TMetadata extends Record<string, any> = Record<string, any>,
  TFacets extends FacetsConfig<TMetadata> = FacetsConfig<TMetadata>,
> = {
  title?: boolean;
  content?: (record: TRecord) => string | null;
  embeddings?: (
    record: TRecord,
    context: SearchableContext,
  ) => Promise<number[]>;
  metadata?: (record: TRecord) => TMetadata;
  facets?: TFacets;
  manual?: boolean;
};
```

### 1.3 Query and Response Types

```ts
export type FacetRequest = {
  field: string;
  limit?: number; // Default: 10
  sortBy?: "count" | "alpha"; // Default: "count"
};

export type FacetValue = {
  value: string;
  count: number;
};

export type FacetStats = {
  min: number;
  max: number;
};

export type FacetResult = {
  field: string;
  values: FacetValue[];
  stats?: FacetStats;
};

export type SearchResponse = {
  results: SearchResult[];
  total: number;
  facets?: FacetResult[];
};
```

---

## Phase 2: Database Schema

### 2.1 Facets Table

```sql
CREATE TABLE questpie_search_facets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  search_id TEXT NOT NULL REFERENCES questpie_search(id) ON DELETE CASCADE,
  collection_name TEXT NOT NULL,
  locale TEXT NOT NULL,
  facet_name TEXT NOT NULL,
  facet_value TEXT NOT NULL,
  numeric_value NUMERIC,  -- For range bucket stats
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_facets_agg ON questpie_search_facets (collection_name, locale, facet_name, facet_value);
CREATE INDEX idx_facets_search_id ON questpie_search_facets (search_id);
```

### 2.2 Why Separate Table?

| Approach             | Pros                        | Cons                                     |
| -------------------- | --------------------------- | ---------------------------------------- |
| JSONB metadata       | Simple                      | Slow aggregation, no multi-value support |
| Denormalized columns | Fast                        | Schema changes needed for each facet     |
| **Separate table**   | Flexible, fast, multi-value | Slightly more complex indexing           |

---

## Phase 3: Implementation Details

### 3.1 Indexing Flow

```
Record Update
     │
     ▼
┌─────────────────┐
│ Extract metadata │ ─→ metadata: { status, category, tags, price }
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Extract facets   │ ─→ Based on facets config in .searchable()
└─────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────┐
│ For each facet field:                               │
│  - true: Single value → 1 row                       │
│  - array: Multiple values → N rows                  │
│  - range: Find bucket → 1 row + numeric_value       │
│  - hierarchy: Expand path → N rows                  │
└─────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────┐
│ Insert to        │
│ questpie_search  │ (main record)
│ questpie_search_ │
│ facets           │ (facet values)
└─────────────────┘
```

### 3.2 Search Flow

```
Search Request { query, filters, facets: ["status", "category"] }
     │
     ▼
┌─────────────────┐
│ Build FTS query  │ ─→ Get matching search_ids
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ Apply filters    │ ─→ Narrow down search_ids
└─────────────────┘
     │
     ├─────────────────────────────┐
     ▼                             ▼
┌─────────────────┐    ┌─────────────────────────┐
│ Get results     │    │ For each requested facet │
│ (paginated)     │    │ GROUP BY facet_value     │
│                 │    │ WHERE search_id IN (...)  │
└─────────────────┘    └─────────────────────────┘
     │                             │
     ▼                             ▼
┌─────────────────────────────────────────────────┐
│ Return { results, total, facets }               │
└─────────────────────────────────────────────────┘
```

### 3.3 Facet Extraction Logic

```ts
function extractFacetValues(metadata, facetsConfig) {
  const results = [];

  for (const [field, config] of Object.entries(facetsConfig)) {
    const value = metadata[field];
    if (value == null) continue;

    if (config === true) {
      // Simple string
      results.push({ name: field, value: String(value) });
    } else if (config.type === "array") {
      // Multi-value: one row per value
      for (const v of Array.isArray(value) ? value : [value]) {
        results.push({ name: field, value: String(v) });
      }
    } else if (config.type === "range") {
      // Find matching bucket
      const bucket = config.buckets.find(
        (b) =>
          (b.min === undefined || value >= b.min) &&
          (b.max === undefined || value < b.max),
      );
      if (bucket) {
        results.push({ name: field, value: bucket.label, numericValue: value });
      }
    } else if (config.type === "hierarchy") {
      // Expand "A > B > C" into ["A", "A > B", "A > B > C"]
      const sep = config.separator ?? " > ";
      const parts = String(value).split(sep);
      let path = "";
      for (const part of parts) {
        path = path ? `${path}${sep}${part}` : part;
        results.push({ name: field, value: path });
      }
    }
  }

  return results;
}
```

---

## Phase 4: File Changes

| File                                       | Action | Description                                                             |
| ------------------------------------------ | ------ | ----------------------------------------------------------------------- |
| `search/types.ts`                          | MODIFY | Add facet types, update SearchableConfig, SearchOptions, SearchResponse |
| `search/collection.ts`                     | MODIFY | Add `questpieSearchFacetsTable`                                         |
| `search/adapters/postgres.ts`              | MODIFY | Add facets migration, update index(), update search()                   |
| `search/service.ts`                        | MODIFY | Update search() return type                                             |
| `search/facet-utils.ts`                    | CREATE | Facet value extraction logic                                            |
| `collection/builder/collection-builder.ts` | MODIFY | Update .searchable() for type inference                                 |
| `test/search/search-facets.test.ts`        | CREATE | Facet tests                                                             |
| `test/search/search-adapter.test.ts`       | MODIFY | Update for new response shape                                           |

---

## Phase 5: Usage Examples

### Collection Definition

```ts
const products = collection("products")
  .fields({
    name: varchar("name"),
    price: integer("price"),
    category: varchar("category"),
    tags: jsonb("tags"),
  })
  .title(({ f }) => f.name)
  .searchable({
    content: (record) => record.name,
    metadata: (record) => ({
      category: record.category,
      price: record.price,
      tags: record.tags as string[],
    }),
    facets: {
      category: true,
      tags: { type: "array" },
      price: {
        type: "range",
        buckets: [
          { label: "Under $50", max: 50 },
          { label: "$50-$100", min: 50, max: 100 },
          { label: "$100+", min: 100 },
        ],
      },
    },
  });
```

### Search Query

```ts
const response = await cms.search.search({
  query: "laptop",
  collections: ["products"],
  filters: { category: "electronics" },
  facets: [
    { field: "category", limit: 10 },
    { field: "tags", limit: 20 },
    { field: "price" },
  ],
});

// Response:
// {
//   results: [...],
//   total: 42,
//   facets: [
//     { field: "category", values: [{ value: "electronics", count: 30 }, ...] },
//     { field: "tags", values: [{ value: "sale", count: 15 }, ...] },
//     { field: "price", values: [...], stats: { min: 29, max: 1299 } },
//   ]
// }
```

---

## Phase 6: Test Plan

### Test Cases

1. **String facets**
   - Returns correct counts
   - Respects limit
   - Sorts by count (default)
   - Sorts alphabetically

2. **Multi-value facets (array)**
   - Record counted in multiple facet values
   - Handles empty arrays
   - Handles single value as array

3. **Range facets**
   - Buckets values correctly
   - Returns min/max stats
   - Handles boundary values

4. **Hierarchical facets**
   - Expands paths correctly
   - Uses custom separator
   - Counts at each level

5. **Dynamic counts**
   - Reflects query filter
   - Reflects facet filters
   - Empty query returns all

6. **Edge cases**
   - No matching results
   - Unknown facet field (should error)
   - Null/undefined values in metadata

---

## Implementation Order

1. Update types.ts with new facet types
2. Add facets table to collection.ts
3. Create facet-utils.ts
4. Update postgres.ts (migrations + index + search)
5. Update service.ts
6. Update existing tests for new response shape
7. Add new facet tests
8. Update collection-builder.ts for type inference (optional, for stricter types)
