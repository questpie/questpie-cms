# 02 - Nested Localized JSONB

> **Status:** ✅ Implemented
> **Priority:** High
> **Dependencies:** 01_I18N_APPLICATION_SIDE_FALLBACK
> **Package:** `questpie/server`

## Overview

Pattern pre deep lokalizáciu hodnôt vnútri JSONB fieldov pomocou `{ $i18n: value }` wrapper syntaxe.

**Kľúčové vlastnosti:**

- JSONB fields označené ako localized cez `.localized(["content"])`
- Client wrapuje lokalizované hodnoty do `{ $i18n: "value" }`
- Server auto-detekuje a rozdeľuje na štruktúru + i18n hodnoty
- Jeden `_localized` stĺpec v i18n tabuľke pre všetky nested hodnoty
- JSONB štruktúra zostáva v main table, len extrahované hodnoty idú do i18n

---

## Syntax

### Client Wrapper Syntax

```typescript
// Client posiela - wrapuje lokalizované hodnoty:
{
  content: {
    title: { $i18n: "Hello World" },     // localized
    subtitle: { $i18n: "Welcome" },      // localized
    alignment: "center",                  // static
    maxItems: 10,                         // static
  }
}

// Server uloží do MAIN table (štruktúra s markermi):
{
  content: {
    title: { $i18n: true },
    subtitle: { $i18n: true },
    alignment: "center",
    maxItems: 10,
  }
}

// Server uloží do I18N table (_localized stĺpec):
{
  _localized: {
    content: {
      title: "Hello World",
      subtitle: "Welcome"
    }
  }
}
```

---

## Storage Structure

### I18n Table Schema

```typescript
// Automaticky generovaná i18n tabuľka
{
  id: text("id").primaryKey(),
  parentId: text("parent_id").references(() => mainTable.id),
  locale: text("locale").notNull(),

  // Flat localized fields (existujúce)
  title: text("title"),
  description: text("description"),

  // NEW: Jeden stĺpec pre všetky nested lokalizované hodnoty
  _localized: jsonb("_localized"),
}
```

### Príklad uloženia

```
┌─────────────────────────────────────────────────────────────────┐
│  pages (main table)                                             │
├─────────────────────────────────────────────────────────────────┤
│  id: "page-1"                                                   │
│  slug: "home"                                                   │
│  content: {                                                     │
│    "title": { "$i18n": true },                                 │
│    "alignment": "center",                                       │
│    "features": {                                                │
│      "_order": ["f1", "f2"],                                   │
│      "f1": {                                                    │
│        "icon": "star",                                          │
│        "title": { "$i18n": true }                              │
│      },                                                         │
│      "f2": {                                                    │
│        "icon": "heart",                                         │
│        "title": { "$i18n": true }                              │
│      }                                                          │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  pages_i18n (i18n table)                                        │
├─────────────────────────────────────────────────────────────────┤
│  id: "i18n-1"                                                   │
│  parentId: "page-1"                                             │
│  locale: "en"                                                   │
│  name: "Home Page"              <- flat localized field         │
│  _localized: {                  <- nested localized values      │
│    "content": {                                                 │
│      "title": "Welcome",                                        │
│      "features": {                                              │
│        "f1": { "title": "Star Feature" },                      │
│        "f2": { "title": "Heart Feature" }                      │
│      }                                                          │
│    }                                                            │
│  }                                                              │
├─────────────────────────────────────────────────────────────────┤
│  id: "i18n-2"                                                   │
│  parentId: "page-1"                                             │
│  locale: "sk"                                                   │
│  name: "Domovská stránka"                                       │
│  _localized: {                                                  │
│    "content": {                                                 │
│      "title": "Vitajte",                                        │
│      "features": {                                              │
│        "f1": { "title": "Hviezda" }                            │
│        // f2 chýba - fallback na EN                            │
│      }                                                          │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Patterns

### 1. Primitive Values

```typescript
// Static - bez wrappera
{ alignment: "center", maxItems: 10 }

// Localized - s wrapperom
{ title: { $i18n: "Hello" }, subtitle: { $i18n: "World" } }
```

### 2. Array of Primitives

Celý array je lokalizovaný ako jednotka:

```typescript
// Client posiela:
{
  tags: {
    $i18n: ["design", "web", "dev"];
  }
}

// Main table:
{
  tags: {
    $i18n: true;
  }
}

// _localized:
{
  tags: ["design", "web", "dev"];
}
```

### 3. Nested Objects

```typescript
// Client posiela:
{
  cta: {
    label: { $i18n: "Click me" },
    url: "/contact",              // static
    style: "primary"              // static
  }
}

// Main table:
{
  cta: {
    label: { $i18n: true },
    url: "/contact",
    style: "primary"
  }
}

// _localized:
{
  cta: {
    label: "Click me"
  }
}
```

### 4. Array of Objects (ID-Based Map)

```typescript
// Client posiela:
{
  features: {
    _order: ["f1", "f2"],
    f1: {
      icon: "star",                        // static
      title: { $i18n: "Star Feature" },    // localized
      description: { $i18n: "Desc 1" }     // localized
    },
    f2: {
      icon: "heart",
      title: { $i18n: "Heart Feature" },
      description: { $i18n: "Desc 2" }
    }
  }
}

// Main table:
{
  features: {
    _order: ["f1", "f2"],
    f1: {
      icon: "star",
      title: { $i18n: true },
      description: { $i18n: true }
    },
    f2: {
      icon: "heart",
      title: { $i18n: true },
      description: { $i18n: true }
    }
  }
}

// _localized:
{
  features: {
    f1: { title: "Star Feature", description: "Desc 1" },
    f2: { title: "Heart Feature", description: "Desc 2" }
  }
}
```

### 5. Blocks Structure

```typescript
// Client posiela:
{
  content: {
    _tree: [
      { id: "b1", type: "hero", children: [] },
      { id: "b2", type: "text", children: [] }
    ],
    _values: {
      b1: {
        alignment: "center",                // static
        title: { $i18n: "Welcome" },        // localized
        subtitle: { $i18n: "Hello" }        // localized
      },
      b2: {
        content: { $i18n: "<p>Text...</p>" } // localized rich text
      }
    }
  }
}

// Main table:
{
  content: {
    _tree: [...],  // unchanged
    _values: {
      b1: {
        alignment: "center",
        title: { $i18n: true },
        subtitle: { $i18n: true }
      },
      b2: {
        content: { $i18n: true }
      }
    }
  }
}

// _localized:
{
  content: {
    _values: {
      b1: { title: "Welcome", subtitle: "Hello" },
      b2: { content: "<p>Text...</p>" }
    }
  }
}
```

---

## Implementation

### Write Flow

```typescript
// 1. Client sends data with $i18n wrappers
const input = {
  slug: "home",
  content: {
    title: { $i18n: "Hello" },
    alignment: "center",
  },
};

// 2. Server auto-splits using autoSplitNestedI18n()
// Scans ALL fields for { $i18n: value } wrappers

// 3. Result:
// - Main table: { slug: "home", content: { title: { $i18n: true }, alignment: "center" } }
// - I18n table: { locale: "en", _localized: { content: { title: "Hello" } } }
```

### Read Flow

```typescript
// 1. SELECT with JOINs
SELECT
  main.*,
  i18n_current._localized as _i18n__localized,
  i18n_fallback._localized as _i18n_fallback__localized
FROM pages main
LEFT JOIN pages_i18n i18n_current ON ... AND locale = 'sk'
LEFT JOIN pages_i18n i18n_fallback ON ... AND locale = 'en'

// 2. Application-side merge
// For each field with { $i18n: true } markers:
// - Find value in _localized (current locale first, then fallback)
// - Replace marker with value
```

### Key Functions

```typescript
// nested-i18n-split.ts
export function autoSplitNestedI18n(data: unknown): SplitResult {
  // Recursively find { $i18n: value } wrappers
  // Return { structure, i18nValues }
}

// nested-i18n-merge.ts
export function deepMergeI18n(
  structure: unknown,
  i18nChain: Array<unknown>,
): unknown {
  // Recursively replace { $i18n: true } with values from chain
}

// i18n-merge.ts
export function mergeI18nRow(row, options): Row {
  // 1. Handle flat localized fields (existing)
  // 2. Handle _localized column (new)
}
```

---

## Schema Changes

### Collection Builder

```typescript
// NO configuration needed!
// Just define JSONB fields normally:

const pages = collection("pages")
  .fields({
    slug: varchar("slug", { length: 100 }),
    content: jsonb("content"), // Automatically supports { $i18n: value }
  })
  .localized(["name", "description"]); // Flat localized fields
```

### Generated I18n Table

```typescript
// Automatically includes _localized column
pgTable("pages_i18n", {
  id: text("id").primaryKey(),
  parentId: text("parent_id").notNull().references(...),
  locale: text("locale").notNull(),

  // Flat localized fields
  name: text("name"),
  description: text("description"),

  // Nested localized values (auto-added)
  _localized: jsonb("_localized"),
});
```

---

## Fallback Behavior

```typescript
// Structure (main table):
{
  content: {
    title: { $i18n: true },
    features: {
      _order: ["f1", "f2"],
      f1: { title: { $i18n: true } },
      f2: { title: { $i18n: true } }
    }
  }
}

// SK _localized (partial):
{
  content: {
    title: "Vitajte",
    features: {
      f1: { title: "Hviezda" }
      // f2 missing
    }
  }
}

// EN _localized (complete):
{
  content: {
    title: "Welcome",
    features: {
      f1: { title: "Star" },
      f2: { title: "Heart" }
    }
  }
}

// Merged result (SK with EN fallback):
{
  content: {
    title: "Vitajte",           // SK
    features: {
      _order: ["f1", "f2"],
      f1: { title: "Hviezda" }, // SK
      f2: { title: "Heart" }    // EN fallback
    }
  }
}
```

---

## File Changes

| File                                    | Change                                    |
| --------------------------------------- | ----------------------------------------- |
| `builder/types.ts`                      | Remove `nestedLocalized` from state       |
| `builder/collection-builder.ts`         | Remove `.nestedLocalized()` method        |
| `builder/collection.ts`                 | Add `_localized: jsonb()` to i18n table   |
| `crud/shared/nested-i18n-split.ts`      | `autoSplitNestedI18n()` - detect wrappers |
| `crud/shared/localization.ts`           | Update `splitLocalizedFields()`           |
| `crud/shared/i18n-merge.ts`             | Handle `_localized` column in merge       |
| `crud/query-builders/select-builder.ts` | Select `_localized` from i18n tables      |
| `crud/crud-generator.ts`                | Use new split/merge flow                  |

---

## Testing

```typescript
describe("Nested Localized JSONB with $i18n wrapper", () => {
  it("auto-splits { $i18n: value } wrappers", () => {
    const input = {
      title: { $i18n: "Hello" },
      alignment: "center",
    };

    const { structure, i18nValues } = autoSplitNestedI18n(input);

    expect(structure).toEqual({
      title: { $i18n: true },
      alignment: "center",
    });
    expect(i18nValues).toEqual({
      title: "Hello",
    });
  });

  it("creates and reads with nested localization", async () => {
    const created = await cms.api.collections.pages.create(
      {
        slug: "home",
        content: {
          title: { $i18n: "Welcome" },
          alignment: "center",
        },
      },
      { locale: "en" },
    );

    const found = await cms.api.collections.pages.findOne(
      { where: { id: created.id } },
      { locale: "en" },
    );

    expect(found.content.title).toBe("Welcome");
    expect(found.content.alignment).toBe("center");
  });

  it("falls back to default locale for missing translations", async () => {
    // Create in EN
    const created = await cms.api.collections.pages.create(
      {
        slug: "about",
        content: { title: { $i18n: "About Us" } },
      },
      { locale: "en" },
    );

    // Read in SK (no translation) - should fallback
    const found = await cms.api.collections.pages.findOne(
      { where: { id: created.id } },
      { locale: "sk" },
    );

    expect(found.content.title).toBe("About Us"); // EN fallback
  });
});
```

---

## Migration from Previous Approach

Ak existuje `.nestedLocalized()` konfigurácia:

1. Odstrániť `.nestedLocalized()` z definície kolekcie
2. Migrovať existujúce dáta z jednotlivých JSONB stĺpcov do `_localized`
3. Upraviť client kód na používanie `{ $i18n: value }` wrapperu
