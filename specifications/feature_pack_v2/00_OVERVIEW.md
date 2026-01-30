# Feature Pack V2 - Overview

> **Status:** In Progress
> **Last Updated:** 2026-01-23

## Summary

Tento feature pack obsahuje sadu izolovanych funkcionalit pre rozsirenie QUESTPIE CMS o:

1. **Vylepseny i18n system** - Application-side fallback namiesto SQL COALESCE
2. **Nested Localized JSONB** - `$i18n` marker pattern pre deep lokalizaciu
3. **Block System** - Visual page builder s drag-drop editingom

---

## Documents

| #   | Document                                                                 | Priority | Dependencies | Status         |
| --- | ------------------------------------------------------------------------ | -------- | ------------ | -------------- |
| 01  | [I18N_APPLICATION_SIDE_FALLBACK](./01_I18N_APPLICATION_SIDE_FALLBACK.md) | High     | None         | ✅ Implemented |
| 02  | [NESTED_LOCALIZED_JSONB](./02_NESTED_LOCALIZED_JSONB.md)                 | High     | 01           | ✅ Implemented |
| 03  | [BLOCK_SYSTEM](./03_BLOCK_SYSTEM.md)                                     | High     | 02           | ✅ Implemented |
| 04  | [BLOCK_EDITOR_UI](./04_BLOCK_EDITOR_UI.md)                               | High     | 03           | ✅ Implemented |
| 05  | [COLLECTION_PREVIEW](./05_COLLECTION_PREVIEW.md)                         | Medium   | None         | ✅ Implemented |
| 06  | [BLOCK_PREFETCH](./06_BLOCK_PREFETCH.md)                                 | Medium   | 03           | ✅ Implemented |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SQL Layer                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Simple LEFT JOINs for i18n data:                                        │
│  - main_table.*                                                          │
│  - i18n_current (locale = $current)                                      │
│  - i18n_fallback (locale = $fallback)                                    │
│                                                                          │
│  COALESCE only for WHERE/ORDER on flat localized fields                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Application Layer (questpie/server)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Unified merge logic:                                                    │
│  - Flat fields: current ?? fallback                                      │
│  - Nested JSONB: deep merge with $i18n markers                           │
│  - Locale chain support (optional)                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Admin Layer (@questpie/admin)                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  - r.object() / r.array() with localized: true on sub-fields             │
│  - r.blocks() - specialized block editor field                           │
│  - qa.block() - block definition builder                                 │
│  - Block Editor UI components                                            │
│  - Collection Preview system                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Frontend (user's app)                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  - BlockRenderer component                                               │
│  - useCollectionPreview() hook                                           │
│  - prefetchBlockData() utility (SSR)                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Application-side Fallback (vs SQL COALESCE)

**Reasoning:**

- Jednoduchsie SQL queries (len LEFT JOINs)
- Flexibilita pre locale chains
- Jednotny pattern pre flat aj nested fields
- Lepsie debugovanie (JS breakpoints)

**Trade-off:**

- COALESCE stale potrebny pre WHERE/ORDER na flat fields

### 2. `$i18n` Marker Pattern

**Reasoning:**

- Single source of truth pre strukturu
- Explicitny indikator lokalizovanych fieldov
- Funguje pre lubovolnu hlbku nestingu
- Reusable pre r.object(), r.array(), r.blocks()

**Format:**

```typescript
// Static structure s markermi
{
  alignment: "center",           // static value
  title: { $i18n: true },        // lokalizovany field
  nested: {
    deep: {
      field: { $i18n: true }     // deep lokalizovany field
    }
  }
}
```

### 3. Server-Agnostic Blocks

**Reasoning:**

- Server spracuva len JSONB s markermi
- Block definitions su v admin package
- Cista separacia concernov
- Flexibilita pre rozne rendering implementacie

### 4. Nested JSONB = Nesearchable

**Reasoning:**

- Zjednodusenie implementacie
- Full-text search na nested JSONB je komplexny
- Flat lokalizovane fields (title, description) su searchable
- Moze byt rozsirene v buducnosti (generated columns)

---

## Migration Strategy

1. **Phase 1-2:** Internal refactor, no breaking changes
2. **Phase 3-4:** New APIs, backward compatible
3. **Phase 5-6:** Optional features, independent

Existujuce kolekcie funguju bez zmien. Nove features su opt-in.

---

## Package Distribution

| Feature                | Package           | Exports                     |
| ---------------------- | ----------------- | --------------------------- |
| I18n merge utilities   | `questpie/server` | Internal                    |
| Nested localized hooks | `questpie/server` | Internal                    |
| Block types            | `@questpie/admin` | `BlockNode`, `BlockContent` |
| Block builder          | `@questpie/admin` | `qa.block()`                |
| Block field            | `@questpie/admin` | `r.blocks()`                |
| Block Editor UI        | `@questpie/admin` | Components                  |
| Preview hooks          | `@questpie/admin` | `useCollectionPreview()`    |
| Block renderer         | `@questpie/admin` | `BlockRenderer`             |
| Prefetch utility       | `@questpie/admin` | `prefetchBlockData()`       |

**Note:** Server nevie o blokoch - len uklada JSONB s `$i18n` markermi. Vsetko block-related je v `@questpie/admin` package a exportuje sa pre pouzitie na frontende.
