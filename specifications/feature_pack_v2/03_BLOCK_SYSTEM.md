# 03 - Block System

> **Status:** ✅ Implemented
> **Priority:** High
> **Dependencies:** 02_NESTED_LOCALIZED_JSONB
> **Package:** `@questpie/admin`

## Overview

Block system pre vizualne page building. Server nevie o blokoch - spracuva len JSONB s `$i18n` markermi. Bloky su definovane v admin package a renderovane na frontende.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SERVER (questpie/server)                                                │
│  - JSONB field s nested localized support (Phase 02)                     │
│  - NEVIE o block types, renderers, categories                            │
│  - Len uklada/vracia JSONB data                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API (JSON)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  ADMIN (@questpie/admin)                                                 │
│  - qa.block() - block definition builder                                 │
│  - r.blocks() - block editor field type                                  │
│  - Block definitions (hero, columns, text, etc.)                         │
│  - Block Editor UI (Phase 04)                                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Block definitions + renderers
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (user's app)                                                   │
│  - BlockRenderer component                                               │
│  - Custom block renderers                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Structure

### Block Content Format

```typescript
// Stored in JSONB field
{
  // Block tree structure + order
  _tree: [
    { id: "b1", type: "hero", children: [] },
    {
      id: "b2",
      type: "columns",
      children: [
        { id: "b3", type: "text", children: [] },
        { id: "b4", type: "image", children: [] }
      ]
    }
  ],

  // Block values by ID (with $i18n markers for localized fields)
  _values: {
    b1: {
      title: { $i18n: true },
      subtitle: { $i18n: true },
      alignment: "center",
      backgroundImage: "asset-uuid"
    },
    b2: {
      columns: 2,
      gap: "md"
    },
    b3: {
      content: { $i18n: true }
    },
    b4: {
      image: "asset-uuid",
      alt: { $i18n: true }
    }
  }
}
```

### I18n Table Content

```typescript
// pages_i18n.content (per locale)
{
  _values: {
    b1: {
      title: "Ahoj svet",
      subtitle: "Vitajte na nasom webe"
    },
    b3: {
      content: "<p>Toto je text blok...</p>"
    },
    b4: {
      alt: "Obrazok produktu"
    }
  }
}
```

---

## Block Types

```typescript
// packages/admin/src/client/blocks/types.ts

/**
 * Block node in the tree structure.
 */
export type BlockNode = {
  /** Unique block instance ID (UUID) */
  id: string;
  /** Block type name (e.g., "hero", "columns") */
  type: string;
  /** Child blocks (for layout blocks) */
  children: BlockNode[];
};

/**
 * Block content structure stored in JSONB.
 */
export type BlockContent = {
  /** Block tree with hierarchy and order */
  _tree: BlockNode[];
  /** Block values indexed by block ID */
  _values: Record<string, Record<string, unknown>>;
};

/**
 * Block category for organization in block picker.
 */
export type BlockCategory =
  | "layout" // Columns, Grid, Container
  | "content" // Text, Heading, List
  | "media" // Image, Video, Gallery
  | "sections" // Hero, Features, Testimonials
  | "interactive" // Form, Accordion, Tabs
  | (string & {}); // Custom categories

/**
 * Props passed to block renderer component.
 */
export type BlockRendererProps<TValues = Record<string, any>> = {
  /** Block instance ID */
  id: string;
  /** Block field values (merged with i18n) */
  values: TValues;
  /** Data from prefetch (if defined) */
  data?: unknown;
  /** Rendered child blocks (for layout blocks) */
  children?: React.ReactNode;
  /** Whether this block is selected in editor */
  isSelected?: boolean;
  /** Whether in preview mode */
  isPreview?: boolean;
};
```

---

## Block Builder: `qa.block()`

```typescript
// packages/admin/src/client/builder/block/block-builder.ts

export type BlockBuilderState = {
  name: string;
  label?: I18nText;
  description?: I18nText;
  icon?: string;
  category?: BlockCategory;
  fields?: Record<string, FieldDefinition>;
  allowChildren?: boolean;
  maxChildren?: number;
  allowedChildTypes?: string[];
  renderer?: React.ComponentType<BlockRendererProps<any>>;
  prefetch?: BlockPrefetch<any>;
};

export class BlockBuilder<TState extends BlockBuilderState> {
  constructor(private state: TState) {}

  label(label: I18nText): BlockBuilder<TState & { label: I18nText }> {
    return new BlockBuilder({ ...this.state, label });
  }

  description(
    desc: I18nText,
  ): BlockBuilder<TState & { description: I18nText }> {
    return new BlockBuilder({ ...this.state, description: desc });
  }

  icon(icon: string): BlockBuilder<TState & { icon: string }> {
    return new BlockBuilder({ ...this.state, icon });
  }

  category(
    category: BlockCategory,
  ): BlockBuilder<TState & { category: BlockCategory }> {
    return new BlockBuilder({ ...this.state, category });
  }

  fields<TFields extends Record<string, FieldDefinition>>(
    callback: (ctx: { r: FieldRegistryProxy }) => TFields,
  ): BlockBuilder<TState & { fields: TFields }> {
    const r = createFieldRegistryProxy(builtInFields);
    const fields = callback({ r });
    return new BlockBuilder({ ...this.state, fields });
  }

  allowChildren(
    allow: boolean,
    options?: { max?: number; allowedTypes?: string[] },
  ): BlockBuilder<TState & { allowChildren: boolean }> {
    return new BlockBuilder({
      ...this.state,
      allowChildren: allow,
      maxChildren: options?.max,
      allowedChildTypes: options?.allowedTypes,
    });
  }

  renderer<TValues>(
    component: React.ComponentType<BlockRendererProps<TValues>>,
  ): BlockBuilder<TState & { renderer: typeof component }> {
    return new BlockBuilder({ ...this.state, renderer: component });
  }

  prefetch<TData>(
    fn: BlockPrefetch<TData>,
  ): BlockBuilder<TState & { prefetch: BlockPrefetch<TData> }> {
    return new BlockBuilder({ ...this.state, prefetch: fn });
  }

  build(): BlockDefinition<TState> {
    if (!this.state.name) throw new Error("Block name is required");
    if (!this.state.renderer) throw new Error("Block renderer is required");
    return this.state as BlockDefinition<TState>;
  }
}

export function block<TName extends string>(name: TName) {
  return new BlockBuilder({ name, children: [] });
}
```

---

## Block Definition Examples

### Hero Block

```typescript
// src/admin/blocks/hero.tsx
import { qa } from "@questpie/admin/client";

export const heroBlock = qa
  .block("hero")
  .label({ en: "Hero Section", sk: "Hero sekcia" })
  .description({ en: "Large header with background" })
  .icon("Image")
  .category("sections")
  .fields(({ r }) => ({
    // Localized fields
    title: r.text({
      label: "Title",
      localized: true,
      required: true
    }),
    subtitle: r.textarea({
      label: "Subtitle",
      localized: true
    }),
    ctaText: r.text({
      label: "CTA Button Text",
      localized: true
    }),
    ctaUrl: r.text({
      label: "CTA Button URL",
      localized: true
    }),

    // Static fields
    alignment: r.select({
      label: "Alignment",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
      defaultValue: "center"
    }),
    backgroundImage: r.upload({
      label: "Background Image"
    }),
    overlayOpacity: r.number({
      label: "Overlay Opacity",
      min: 0,
      max: 100,
      defaultValue: 50
    }),
  }))
  .renderer(HeroRenderer)

function HeroRenderer({ id, values, isSelected }: BlockRendererProps) {
  return (
    <section
      data-block-id={id}
      className={cn(
        "relative py-24 px-8",
        values.alignment === "center" && "text-center",
        values.alignment === "right" && "text-right",
        isSelected && "ring-2 ring-primary"
      )}
      style={{
        backgroundImage: values.backgroundImage
          ? `url(${values.backgroundImage})`
          : undefined
      }}
    >
      {values.backgroundImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: (values.overlayOpacity || 50) / 100 }}
        />
      )}
      <div className="relative z-10">
        <h1 className="text-5xl font-bold">{values.title}</h1>
        {values.subtitle && (
          <p className="text-xl mt-4 opacity-80">{values.subtitle}</p>
        )}
        {values.ctaText && values.ctaUrl && (
          <a
            href={values.ctaUrl}
            className="inline-block mt-8 px-6 py-3 bg-primary text-white rounded"
          >
            {values.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}
```

### Layout Block with Children

```typescript
// src/admin/blocks/columns.tsx
export const columnsBlock = qa
  .block("columns")
  .label({ en: "Columns", sk: "Stlpce" })
  .icon("Columns")
  .category("layout")
  .fields(({ r }) => ({
    columns: r.select({
      label: "Number of Columns",
      options: [
        { value: "2", label: "2 Columns" },
        { value: "3", label: "3 Columns" },
        { value: "4", label: "4 Columns" },
      ],
      defaultValue: "2"
    }),
    gap: r.select({
      label: "Gap",
      options: [
        { value: "sm", label: "Small" },
        { value: "md", label: "Medium" },
        { value: "lg", label: "Large" },
      ],
      defaultValue: "md"
    }),
    verticalAlign: r.select({
      label: "Vertical Alignment",
      options: [
        { value: "start", label: "Top" },
        { value: "center", label: "Center" },
        { value: "end", label: "Bottom" },
      ],
      defaultValue: "start"
    }),
  }))
  .allowChildren(true, { max: 4 })
  .renderer(ColumnsRenderer)

function ColumnsRenderer({ values, children }: BlockRendererProps) {
  const gapClasses = {
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-8"
  };

  return (
    <div
      className={cn(
        "grid",
        gapClasses[values.gap || "md"],
        `grid-cols-${values.columns || 2}`,
        `items-${values.verticalAlign || "start"}`
      )}
    >
      {children}
    </div>
  );
}
```

### Text Block

```typescript
// src/admin/blocks/text.tsx
export const textBlock = qa
  .block("text")
  .label({ en: "Text", sk: "Text" })
  .icon("TextAa")
  .category("content")
  .fields(({ r }) => ({
    content: r.richText({
      label: "Content",
      localized: true,
      outputFormat: "html"
    }),
  }))
  .renderer(({ values }) => (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: values.content || "" }}
    />
  ))
```

---

## Block Field: `r.blocks()`

```typescript
// packages/admin/src/client/builder/defaults/fields.tsx

export const blocksField = field("blocks", {
  component: lazy(() => import("../../components/fields/blocks/blocks-field")),
  config: {} as BlocksFieldConfig,
  createZod: () =>
    z.object({
      _tree: z.array(blockNodeSchema),
      _values: z.record(z.string(), z.record(z.string(), z.any())),
    }),
});

// Config type
export type BlocksFieldConfig = {
  /** Allowed block types (if not set, all registered blocks are allowed) */
  allowedBlocks?: string[];
  /** Minimum number of blocks */
  minBlocks?: number;
  /** Maximum number of blocks */
  maxBlocks?: number;
};
```

### Usage in Collection

```typescript
// src/admin/collections/pages.ts
export const pagesCollection = qa
  .collection("pages")
  .meta({ label: "Pages", icon: FileText })
  .fields(({ r }) => ({
    title: r.text({
      label: "Title",
      localized: true,
      required: true,
    }),
    slug: r.text({
      label: "Slug",
      required: true,
    }),

    // Block editor field
    content: r.blocks({
      label: "Page Content",
      allowedBlocks: ["hero", "columns", "text", "image", "features"],
      minBlocks: 1,
    }),
  }))
  .list(({ v, f }) => v.table({ columns: [f.title, f.slug] }))
  .form(({ v, f }) =>
    v.form({
      fields: [f.title, f.slug, f.content],
    }),
  );
```

---

## Admin Registration

```typescript
// src/admin/index.ts
import { qa, adminModule } from "@questpie/admin/client";
import type { AppCMS } from "../questpie/server/cms";

// Import blocks
import { heroBlock } from "./blocks/hero";
import { columnsBlock } from "./blocks/columns";
import { textBlock } from "./blocks/text";
import { imageBlock } from "./blocks/image";
import { featuresBlock } from "./blocks/features";

// Import collections
import { pagesCollection } from "./collections/pages";

export const admin = qa<AppCMS>()
  .use(adminModule)

  // Register blocks
  .blocks({
    hero: heroBlock,
    columns: columnsBlock,
    text: textBlock,
    image: imageBlock,
    features: featuresBlock,
  })

  // Register collections
  .collections({
    pages: pagesCollection,
  });
```

---

## BlockRenderer Component

```typescript
// packages/admin/src/client/components/blocks/block-renderer.tsx

export type BlockRendererProps = {
  /** Block content from API */
  content: BlockContent;
  /** Registered block definitions */
  blocks: Record<string, BlockDefinition>;
  /** Prefetched data by block ID */
  data?: Record<string, unknown>;
  /** Currently selected block ID (for editor) */
  selectedBlockId?: string | null;
  /** Block click handler (for editor) */
  onBlockClick?: (blockId: string) => void;
};

export function BlockRenderer({
  content,
  blocks,
  data = {},
  selectedBlockId,
  onBlockClick,
}: BlockRendererProps) {

  function renderBlock(node: BlockNode): React.ReactNode {
    const blockDef = blocks[node.type];
    if (!blockDef?.renderer) {
      console.warn(`Block type "${node.type}" not found`);
      return null;
    }

    const Component = blockDef.renderer;
    const values = content._values[node.id] || {};
    const blockData = data[node.id];

    const handleClick = (e: React.MouseEvent) => {
      if (onBlockClick) {
        e.stopPropagation();
        onBlockClick(node.id);
      }
    };

    return (
      <div
        key={node.id}
        data-block-id={node.id}
        data-block-type={node.type}
        onClick={handleClick}
        className={cn(
          onBlockClick && "cursor-pointer",
          selectedBlockId === node.id && "ring-2 ring-primary ring-offset-2"
        )}
      >
        <Component
          id={node.id}
          values={values}
          data={blockData}
          isSelected={selectedBlockId === node.id}
        >
          {node.children?.length > 0 && (
            node.children.map(renderBlock)
          )}
        </Component>
      </div>
    );
  }

  return <>{content._tree.map(renderBlock)}</>;
}
```

---

## Server-Side Collection

Server collection je jednoducha - len JSONB field s nested localized support:

```typescript
// src/questpie/server/collections/pages.ts
import { q } from "questpie";
import { varchar, jsonb, text } from "drizzle-orm/pg-core";

export const pages = q
  .collection("pages")
  .fields({
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    content: jsonb("content").default({ _tree: [], _values: {} }),
  })
  .localized(["title"])
  .nestedLocalized(["content"]); // <- Enable nested i18n for blocks
```

---

## File Structure

```
packages/admin/src/client/
├── blocks/
│   ├── types.ts              # BlockNode, BlockContent, BlockRendererProps
│   ├── block-renderer.tsx    # BlockRenderer component
│   ├── prefetch.ts           # prefetchBlockData()
│   └── index.ts
│
├── builder/
│   ├── block/
│   │   ├── block-builder.ts  # qa.block() builder
│   │   ├── types.ts          # BlockDefinition, BlockBuilderState
│   │   └── index.ts
│   ├── defaults/
│   │   └── fields.tsx        # + blocksField
│   └── qa.ts                 # + .blocks() method
│
└── components/
    └── blocks/
        ├── ... (editor UI components - see 04_BLOCK_EDITOR_UI.md)
        └── index.ts
```

**Note:** Vsetko block-related je v `@questpie/admin` package. Server nevie o blokoch.

---

## Usage Example (Frontend)

```typescript
// app/routes/$locale/pages/$slug.tsx
import { BlockRenderer } from "@questpie/admin/client";
import { blocks } from "~/admin/blocks";

export default function PageRoute() {
  const { page } = Route.useLoaderData();

  return (
    <article>
      <BlockRenderer
        content={page.content}
        blocks={blocks}
      />
    </article>
  );
}
```
