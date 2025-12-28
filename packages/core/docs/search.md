# Search Architecture

## Overview

QuestiPie CMS uses Postgres 18+ native search capabilities (BM25, FTS, trigramas, embeddings) instead of external services like Elasticsearch.

## Features

### 1. BM25 Ranking (Postgres 18+)
- Okabe-Robertson ranking algorithm
- Better relevance than `ts_rank`
- No need for Elasticsearch

### 2. Full-Text Search (FTS)
- `tsvector` for tokenization
- Language-aware stemming
- Phrase matching, prefix matching

### 3. Trigram Fuzzy Matching
- `pg_trgm` extension
- Typo tolerance
- Similarity search

### 4. Semantic Search (Optional)
- `pgvector` extension
- Embedding-based similarity
- Neural search capabilities

### 5. UUIDv7
- Time-sortable IDs
- Better index performance
- Native in Postgres 18+

## Architecture

### Search Index Table

```sql
CREATE TABLE questpie_search (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  collection_name text NOT NULL,
  record_id uuid NOT NULL,
  locale text NOT NULL,
  title text NOT NULL,
  content text,
  metadata jsonb DEFAULT '{}',

  -- Full-text search
  fts_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B')
  ) STORED,

  -- Embeddings (optional)
  embedding vector(1536),

  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  UNIQUE(collection_name, record_id, locale)
);

-- BM25 index (Postgres 18+)
CREATE INDEX idx_search_bm25 ON questpie_search USING GIN(fts_vector) WITH (bm25 = true);

-- Trigram index for fuzzy search
CREATE INDEX idx_search_trigram ON questpie_search USING GIN(title gin_trgm_ops);

-- Embedding index (optional)
CREATE INDEX idx_search_embedding ON questpie_search USING ivfflat(embedding vector_cosine_ops);

-- Collection + locale index
CREATE INDEX idx_search_collection_locale ON questpie_search(collection_name, locale);
```

### Collection Builder API

```typescript
const articles = collection("articles")
  .fields({
    title: text("title").notNull(),
    content: jsonb("content"),
    excerpt: text("excerpt"),
  })
  .title((t) => sql`${t.title}`)
  .searchable({
    // Title is always indexed
    title: true,

    // Index content field
    content: (record) => extractTextFromJson(record.content),

    // Generate embeddings (optional)
    embeddings: async (record, { cms }) => {
      const text = `${record.title} ${extractTextFromJson(record.content)}`;
      return await cms.embeddings.generate(text);
    },

    // Custom metadata
    metadata: (record) => ({
      status: record.status,
      authorId: record.authorId,
    }),
  });
```

### Search API

```typescript
// Global search across collections
const results = await cms.search({
  query: "typescript tutorial",
  collections: ["articles", "pages"], // optional filter
  locale: "en",
  limit: 10,

  // Search strategies
  strategy: "hybrid", // "bm25" | "trigram" | "semantic" | "hybrid"

  // Filters
  filters: {
    metadata: {
      status: "published",
    },
  },
});

// Collection-specific search
const articles = await cms.crud("articles").search({
  query: "typescript",
  locale: "en",
});
```

### Search Results

```typescript
type SearchResult = {
  id: string;
  collection: string;
  record: any; // Full record with relations
  score: number;
  highlights: {
    title?: string;
    content?: string;
  };
  metadata: Record<string, any>;
};
```

## Implementation Plan

### Phase 1: Core Search
1. Create `questpie_search` collection
2. Implement `.searchable()` builder method
3. Auto-index on create/update/delete hooks
4. Basic BM25 search

### Phase 2: Advanced Features
5. Trigram fuzzy matching
6. Highlighting
7. Faceted search (metadata filters)

### Phase 3: Semantic Search (Optional)
8. pgvector integration
9. Embedding generation service
10. Hybrid search (BM25 + semantic)

## Migration from Current _title

**Before:**
- `_title` as GENERATED ALWAYS AS stored column
- Storage overhead
- Hard to change

**After:**
- `_title` as virtual field (SQL expression)
- Indexed in `questpie_search` table
- Flexible, no storage overhead in main table

## Configuration

```typescript
const cms = new QCMS({
  search: {
    enabled: true,

    // BM25 parameters (Postgres 18+)
    bm25: {
      k1: 1.2, // term frequency saturation
      b: 0.75, // length normalization
    },

    // Trigram similarity threshold
    similarity: 0.3,

    // Embeddings (optional)
    embeddings: {
      provider: "openai", // or custom
      model: "text-embedding-3-small",
      dimensions: 1536,
    },
  },
});
```

## Benefits

✅ **No External Dependencies** - Pure Postgres
✅ **Better Performance** - Native BM25 faster than Elasticsearch for small-medium datasets
✅ **Transactional** - Search index updates in same transaction
✅ **Multi-language** - Per-locale indexing
✅ **Flexible** - BM25, trigrams, semantic, or hybrid
✅ **Cost-effective** - No separate search service costs
