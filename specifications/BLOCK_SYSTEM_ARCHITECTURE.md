# Block System Architecture Specification

> **Status:** Draft
> **Author:** AI Assistant
> **Last Updated:** 2026-01-22

## Overview

Visual page builder / block system pre QUESTPIE CMS. Umoznuje drag-drop editing blokov s lokalizovanym obsahom a live preview.

---

## Implementation Phases

| Phase | Feature                    | Priority | Dependencies  | Package           |
| ----- | -------------------------- | -------- | ------------- | ----------------- |
| **1** | Nested Localized JSONB     | High     | Existing i18n | `questpie/server` |
| **2** | Block Definitions & Editor | High     | Phase 1       | `@questpie/admin` |
| **3** | Collection Preview         | Medium   | -             | `@questpie/admin` |
| **4** | Block Data Prefetch        | Medium   | Phase 2       | `questpie/shared` |

---

# Phase 1: Nested Localized JSONB

> **Package:** `questpie/server`
> **Priority:** High
> **Dependencies:** Existing i18n system

Vseobecny server-side pattern pre JSONB fieldy s mixed localized/non-localized hodnotami. **Pouzitelne aj bez blokov** - pre settings, metadata, alebo akykolvek nested JSON.

## 1.1 Problem

Existujuci i18n system funguje na urovni stlpcov (COALESCE). Pre nested JSONB potrebujeme:

- Niektore fieldy vnutri JSON su lokalizovane (title, description)
- Niektore fieldy su staticke (alignment, color)
- Deep merge s locale fallback

## 1.2 Solution: `.nestedLocalized()` Fluent API

```typescript
// Collection definition
const pages = q
  .collection("pages")
  .fields({
    title: varchar("title", { length: 255 }),
    slug: varchar("slug", { length: 255 }),
  })
  .nestedLocalized("content") // Creates internal fields, exposes merged
  .localized(["title"])
  .build();
```

## 1.3 Internal Storage

```
┌─────────────────────────────────────────────────────────────────────┐
│  Database (internal - hidden from API)                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  pages (main table):                                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ id   │ slug   │ content_static                                │  │
│  │ uuid │ text   │ jsonb (non-localized values)                  │  │
│  │      │        │ { "b1": { alignment: "center", bg: "#fff" } } │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  pages_i18n (i18n table):                                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ locale │ title  │ content_i18n                                │  │
│  │ "en"   │ "Home" │ { "b1": { title: "Hello", sub: "World" } }  │  │
│  │ "sk"   │ "Domov"│ { "b1": { title: "Ahoj", sub: "Svet" } }    │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 1.4 API Response (Merged)

```typescript
// Frontend NEVER sees the split - only merged result
{
  id: "...",
  title: "Domov",
  slug: "/home",
  content: {
    "b1": {
      title: "Ahoj",        // from content_i18n (SK)
      sub: "Svet",          // from content_i18n (SK)
      alignment: "center",  // from content_static
      bg: "#fff"            // from content_static
    }
  }
}
```

## 1.5 Collection Builder Implementation

```typescript
// packages/questpie/src/server/collection/builder/collection-builder.ts

class CollectionBuilder<TState> {
  /**
   * Add nested localized JSONB field.
   *
   * Creates two internal fields:
   * - {name}_static (main table) - non-localized values
   * - {name}_i18n (i18n table) - localized values
   *
   * Exposes single merged field in API responses.
   */
  nestedLocalized<TFieldName extends string>(
    fieldName: TFieldName
  ): CollectionBuilder<...> {
    const staticField = `${fieldName}_static`;
    const i18nField = `${fieldName}_i18n`;

    return new CollectionBuilder({
      ...this.state,
      internalFields: {
        ...(this.state.internalFields || {}),
        [staticField]: jsonb(staticField).default({}),
        [i18nField]: jsonb(i18nField).default({}),
      },
      localized: [...(this.state.localized || []), i18nField],
      nestedLocalizedFields: [
        ...(this.state.nestedLocalizedFields || []),
        fieldName,
      ],
    });
  }

  build() {
    // Auto-register hooks for nestedLocalized fields
    if (this.state.nestedLocalizedFields?.length) {
      this.hooks(createNestedLocalizedHook(this.state.nestedLocalizedFields));
    }
    return super.build();
  }
}
```

## 1.6 Hooks: Auto-Merge & Auto-Split

```typescript
// packages/questpie/src/server/collection/hooks/nested-localized-hook.ts

export function createNestedLocalizedHook(fieldNames: string[]) {
  return {
    /**
     * AfterRead: Merge static + i18n into single field
     */
    afterRead: async ({ result, context }) => {
      if (!result) return result;

      for (const fieldName of fieldNames) {
        const staticField = `${fieldName}_static`;
        const i18nField = `${fieldName}_i18n`;

        const staticValues = result[staticField] || {};
        const i18nValues = result[i18nField] || {};

        // Deep merge: static (base) + i18n (override)
        result[fieldName] = mergeNestedLocalized(staticValues, i18nValues);

        // Remove internal fields from response
        delete result[staticField];
        delete result[i18nField];
      }

      return result;
    },

    /**
     * BeforeWrite: Split merged input back into static + i18n
     */
    beforeWrite: async ({ data, context }) => {
      const { localizedFieldsMeta } = context; // From request _meta

      for (const fieldName of fieldNames) {
        if (data[fieldName]) {
          const localizedKeys = localizedFieldsMeta?.[fieldName] || [];

          const { staticPart, i18nPart } = splitNestedLocalized(
            data[fieldName],
            localizedKeys,
          );

          data[`${fieldName}_static`] = staticPart;
          data[`${fieldName}_i18n`] = i18nPart;
          delete data[fieldName];
        }
      }

      return data;
    },
  };
}
```

## 1.7 Merge & Split Utilities

```typescript
// packages/questpie/src/server/collection/utils/nested-localized.ts

/**
 * Merge static + i18n values into single object.
 * I18n values override static values.
 */
export function mergeNestedLocalized(
  staticValues: Record<string, Record<string, any>>,
  i18nValues: Record<string, Record<string, any>>,
): Record<string, Record<string, any>> {
  const allKeys = new Set([
    ...Object.keys(staticValues),
    ...Object.keys(i18nValues),
  ]);

  const result: Record<string, Record<string, any>> = {};

  for (const key of allKeys) {
    result[key] = {
      ...(staticValues[key] || {}), // Static base
      ...(i18nValues[key] || {}), // I18n override
    };
  }

  return result;
}

/**
 * Split merged values into static + i18n based on localized field list.
 */
export function splitNestedLocalized(
  mergedValues: Record<string, Record<string, any>>,
  localizedKeys: string[],
): { staticPart: Record<string, any>; i18nPart: Record<string, any> } {
  const staticPart: Record<string, Record<string, any>> = {};
  const i18nPart: Record<string, Record<string, any>> = {};

  for (const [blockId, fields] of Object.entries(mergedValues)) {
    staticPart[blockId] = {};
    i18nPart[blockId] = {};

    for (const [fieldKey, fieldValue] of Object.entries(fields)) {
      if (localizedKeys.includes(fieldKey)) {
        i18nPart[blockId][fieldKey] = fieldValue;
      } else {
        staticPart[blockId][fieldKey] = fieldValue;
      }
    }
  }

  return { staticPart, i18nPart };
}
```

## 1.8 Locale Fallback for I18n Part

```typescript
/**
 * Deep merge i18n values with fallback locale.
 * Called when localeFallback: true (default for frontend).
 */
export function mergeI18nWithFallback(
  currentLocaleValues: Record<string, Record<string, any>> | undefined,
  fallbackLocaleValues: Record<string, Record<string, any>> | undefined,
): Record<string, Record<string, any>> {
  if (!fallbackLocaleValues) return currentLocaleValues || {};
  if (!currentLocaleValues) return fallbackLocaleValues;

  const allKeys = new Set([
    ...Object.keys(fallbackLocaleValues),
    ...Object.keys(currentLocaleValues),
  ]);

  const result: Record<string, Record<string, any>> = {};

  for (const key of allKeys) {
    result[key] = {
      ...(fallbackLocaleValues[key] || {}), // Fallback base
      ...(currentLocaleValues[key] || {}), // Current override
    };
  }

  return result;
}
```

## 1.9 Admin Request: Metadata for Split

Admin posiela metadata ktore fieldy su lokalizovane (pre split v beforeWrite):

```typescript
// Admin PATCH request
PATCH /api/pages/123
{
  title: "Domov",
  content: {
    "b1": { title: "Ahoj", alignment: "center" }
  },
  _meta: {
    localizedFields: {
      content: ["title", "subtitle", "ctaText"]  // Which subfields are localized
    }
  }
}
```

---

# Phase 2: Block Definitions & Editor

> **Package:** `@questpie/admin`
> **Priority:** High
> **Dependencies:** Phase 1 (Nested Localized JSONB)

Block system postaveny na Phase 1. Server nevie o blokoch - je to cisto admin/frontend concern.

## 2.1 Architecture: Server Nevie O Blokoch

```
┌─────────────────────────────────────────────────────────────────────┐
│  SERVER (questpie package)                                          │
│  • JSONB fields s i18n support (Phase 1)                            │
│  • NEVIE o block structure, types, renderers                        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ API (JSON data)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN (admin package)                                              │
│  • Block definitions (qa.block())                                   │
│  • Block editor UI                                                   │
│  • r.blocks() admin field type                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Block definitions + renderers
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND (user's app)                                              │
│  • BlockRenderer component                                          │
│  • Block prefetch in loaders                                        │
└─────────────────────────────────────────────────────────────────────┘
```

## 2.2 Block Types

```typescript
// packages/admin/src/client/builder/block/types.ts

export type BlockNode = {
  id: string; // UUID block instance
  type: string; // Block type (e.g., "hero", "columns")
  order: number; // Sort order
  children?: BlockNode[]; // Nested blocks (for layout blocks)
};

export type BlockLayout = {
  blocks: BlockNode[];
};

export type BlockCategory =
  | "sections" // Hero, Features, Testimonials
  | "layout" // Columns, Grid, Container
  | "content" // Text, Heading, List
  | "media" // Image, Video, Gallery
  | "interactive" // Form, Accordion, Tabs
  | string; // Custom categories

export type BlockDefinition<TFields = Record<string, any>> = {
  name: string;
  label: I18nText;
  icon: string;
  category: BlockCategory;
  fields: TFields;
  allowChildren?: boolean;
  prefetch?: BlockPrefetch;
  renderer: React.ComponentType<BlockRendererProps<TFields>>;
};

export type BlockRendererProps<TFields = Record<string, any>> = {
  id: string;
  values: TFields;
  data?: any; // From prefetch
  children?: React.ReactNode;
  isSelected?: boolean;
};
```

## 2.3 Block Builder: `qa.block()`

```typescript
// packages/admin/src/client/builder/block/block-builder.ts

export class BlockBuilder<TState extends BlockBuilderState> {
  constructor(private state: TState) {}

  label(label: I18nText): BlockBuilder<...> {
    return new BlockBuilder({ ...this.state, label });
  }

  icon(icon: string): BlockBuilder<...> {
    return new BlockBuilder({ ...this.state, icon });
  }

  category(category: BlockCategory): BlockBuilder<...> {
    return new BlockBuilder({ ...this.state, category });
  }

  fields<TFields extends Record<string, FieldDefinition>>(
    callback: (ctx: { r: FieldRegistryProxy }) => TFields
  ): BlockBuilder<...> {
    const r = createFieldRegistryProxy();
    const fields = callback({ r });
    return new BlockBuilder({ ...this.state, fields });
  }

  allowChildren(allow: boolean): BlockBuilder<...> {
    return new BlockBuilder({ ...this.state, allowChildren: allow });
  }

  prefetch<TData>(fn: BlockPrefetch<TData>): BlockBuilder<...> {
    return new BlockBuilder({ ...this.state, prefetch: fn });
  }

  renderer(component: React.ComponentType<any>): BlockBuilder<...> {
    return new BlockBuilder({ ...this.state, renderer: component });
  }

  build(): BlockDefinition<TState["fields"]> {
    return this.state as BlockDefinition<TState["fields"]>;
  }
}

export function block<TName extends string>(name: TName) {
  return new BlockBuilder({ name });
}
```

## 2.4 Block Definition Example

```typescript
// src/admin/blocks/hero.tsx
import { qa } from "@questpie/admin/client";

export const heroBlock = qa
  .block("hero")
  .label({ en: "Hero Section", sk: "Hero Sekcia" })
  .icon("Image")
  .category("sections")
  .fields(({ r }) => ({
    // Localized fields - show badge, stored in content_i18n
    title: r.text({ label: "Title", localized: true, required: true }),
    subtitle: r.text({ label: "Subtitle", localized: true }),
    ctaText: r.text({ label: "CTA Text", localized: true }),
    ctaUrl: r.text({ label: "CTA URL", localized: true }),

    // Non-localized fields - no badge, stored in content_static
    alignment: r.select({
      label: "Alignment",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
    }),
    backgroundImage: r.upload({ label: "Background" }),
  }))
  .renderer(HeroRenderer)
  .build();

function HeroRenderer({ id, values, isSelected }: BlockRendererProps) {
  return (
    <section
      data-block-id={id}
      className={cn(
        "py-20 px-8",
        values.alignment === "center" && "text-center",
        isSelected && "ring-2 ring-primary"
      )}
    >
      <h1 className="text-5xl font-bold">{values.title}</h1>
      {values.subtitle && <p className="text-xl mt-4">{values.subtitle}</p>}
      {values.ctaText && values.ctaUrl && (
        <a href={values.ctaUrl} className="btn mt-8">{values.ctaText}</a>
      )}
    </section>
  );
}
```

## 2.5 Layout Block with Children

```typescript
export const columnsBlock = qa
  .block("columns")
  .label("Columns")
  .icon("Columns")
  .category("layout")
  .fields(({ r }) => ({
    count: r.select({
      label: "Columns",
      options: [
        { value: "2", label: "2 Columns" },
        { value: "3", label: "3 Columns" },
      ],
    }),
    gap: r.select({
      label: "Gap",
      options: [
        { value: "4", label: "Small" },
        { value: "8", label: "Medium" },
      ],
    }),
  }))
  .allowChildren(true)
  .renderer(ColumnsRenderer)
  .build();

function ColumnsRenderer({ values, children }: BlockRendererProps) {
  return (
    <div
      className={`grid gap-${values.gap || "4"}`}
      style={{ gridTemplateColumns: `repeat(${values.count || 2}, 1fr)` }}
    >
      {children}
    </div>
  );
}
```

## 2.6 Admin Registration

```typescript
// src/admin/index.ts
import { qa } from "@questpie/admin/client";

export const admin = qa()
  .blocks({
    hero: heroBlock,
    columns: columnsBlock,
    text: textBlock,
    image: imageBlock,
  })
  .collections({
    pages: pagesCollection,
  })
  .build();
```

## 2.7 Collection with Blocks Field

```typescript
// src/admin/collections/pages.ts
export const pagesCollection = qa
  .collection("pages")
  .fields(({ r }) => ({
    title: r.text({ label: "Title", localized: true, required: true }),
    slug: r.text({ label: "Slug", required: true }),

    // Block editor field
    content: r.blocks({
      label: "Page Content",
      allowedBlocks: ["hero", "columns", "text", "image"],
    }),
  }))
  .build();
```

## 2.8 Block Editor UI

### Component Hierarchy

```
<BlockEditorProvider>
  ├── <BlockEditorLayout>           // Split view (60/40)
  │   ├── <BlockCanvas>             // Left - block tree
  │   │   ├── <BlockTree>
  │   │   │   └── <BlockItem>       // Draggable block
  │   │   │       ├── <BlockDragHandle>
  │   │   │       ├── <BlockLabel>
  │   │   │       ├── <BlockActions>
  │   │   │       └── <BlockChildren>
  │   │   └── <BlockInsertButton>
  │   │
  │   └── <BlockSidebar>            // Right - form/library
  │       ├── <BlockForm>           // Selected block fields
  │       └── <BlockLibrary>        // Block picker
  │
  └── (Preview handled at collection level)
</BlockEditorProvider>
```

### BlockEditorContext

```typescript
export type BlockEditorState = {
  layout: BlockLayout;
  values: Record<string, Record<string, any>>;
  selectedBlockId: string | null;
  expandedBlocks: Set<string>;
  blocks: Record<string, BlockDefinition>;
  allowedBlocks: string[];
};

export type BlockEditorActions = {
  selectBlock: (id: string | null) => void;
  addBlock: (type: string, parentId?: string, index?: number) => void;
  removeBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
  moveBlock: (id: string, parentId: string | null, index: number) => void;
  updateBlockValues: (id: string, values: Record<string, any>) => void;
};
```

## 2.9 Admin Form: Localized Field Handling

```typescript
// Block fields with localized: true show locale badge
// Block fields without localized (default false) show no badge

function BlockForm({ blockId, blockDef }: Props) {
  const { state, actions } = useBlockEditor();
  const values = state.values[blockId] || {};

  // Collect which fields are localized for _meta
  const localizedFields = Object.entries(blockDef.fields)
    .filter(([_, field]) => field.localized)
    .map(([key]) => key);

  return (
    <FormProvider
      values={values}
      onChange={(newValues) => actions.updateBlockValues(blockId, newValues)}
      meta={{ localizedFields }}
    >
      <AutoFormFields fields={blockDef.fields} />
    </FormProvider>
  );
}
```

---

# Phase 3: Collection Preview

> **Package:** `@questpie/admin`
> **Priority:** Medium
> **Dependencies:** None (works independently)

Live preview pre akukolvek kolekciu - nie len bloky. Funguje aj pre product detail, article, atd.

## 3.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Admin Collection Form                            │
├─────────────────────────────────────────────────────────────────────┤
│   Title: [My Page___________________]  ◄──┐                         │
│   Content: <BlockEditor />                │ Click in preview        │
│                                           │ focuses field           │
└───────────────────────────────────────────┼─────────────────────────┘
                                │           │
                                │ postMessage (ALL form data)
                                ▼           │
┌───────────────────────────────────────────┼─────────────────────────┐
│                     Preview Iframe        │                         │
│   <PreviewField field="title">            │                         │
│     <h1>My Page</h1>  ────────────────────┘                         │
│   </PreviewField>                                                    │
│   <BlockRenderer />  ← click block to select in editor              │
└─────────────────────────────────────────────────────────────────────┘
```

## 3.2 Collection Preview Configuration

```typescript
export const pagesCollection = qa
  .collection("pages")
  .options({
    preview: {
      url: (values, locale) => `/${locale}/pages/${values.slug}?preview=true`,
    },
    autosave: {
      enabled: true,
      interval: 5000,
    },
  })
  .fields(({ r }) => ({ ... }))
  .build();
```

## 3.3 PostMessage Protocol

```typescript
// Preview -> Admin
type PreviewToAdminMessage =
  | { type: "PREVIEW_READY" }
  | { type: "FIELD_CLICKED"; field: string }
  | { type: "BLOCK_CLICKED"; blockId: string };

// Admin -> Preview
type AdminToPreviewMessage =
  | { type: "PREVIEW_DATA_UPDATE"; data: Record<string, any> }
  | { type: "SELECT_BLOCK"; blockId: string };
```

## 3.4 `useCollectionPreview()` Hook

```typescript
// packages/admin/src/client/preview/use-collection-preview.ts

export function useCollectionPreview<TData extends Record<string, any>>({
  initialData,
  merge,
}: {
  initialData: TData;
  merge?: (server: TData, preview: Partial<TData>) => TData;
}) {
  const [previewData, setPreviewData] = useState<Partial<TData> | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    const handler = (event: MessageEvent) => {
      switch (event.data?.type) {
        case "PREVIEW_DATA_UPDATE":
          setPreviewData(event.data.data);
          break;
        case "SELECT_BLOCK":
          setSelectedBlockId(event.data.blockId);
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const data = useMemo(() => {
    if (!previewData) return initialData;
    return merge
      ? merge(initialData, previewData)
      : { ...initialData, ...previewData };
  }, [initialData, previewData, merge]);

  const handleFieldClick = useCallback((field: string) => {
    window.parent.postMessage({ type: "FIELD_CLICKED", field }, "*");
  }, []);

  const handleBlockClick = useCallback((blockId: string) => {
    window.parent.postMessage({ type: "BLOCK_CLICKED", blockId }, "*");
  }, []);

  return {
    data,
    isPreviewMode: previewData !== null,
    selectedBlockId,
    handleFieldClick,
    handleBlockClick,
  };
}
```

## 3.5 `<PreviewField>` Component

```typescript
// packages/admin/src/client/preview/preview-field.tsx

export function PreviewField({
  field,
  children,
  className,
  as: Component = "div",
}: {
  field: string;
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}) {
  const { isPreviewMode, handleFieldClick } = useCollectionPreview();

  if (!isPreviewMode) {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <Component
      data-preview-field={field}
      onClick={() => handleFieldClick(field)}
      className={cn(
        className,
        "cursor-pointer transition-all",
        "hover:outline hover:outline-2 hover:outline-primary"
      )}
    >
      {children}
    </Component>
  );
}
```

## 3.6 Preview Route Example

```typescript
// app/routes/$locale/pages/$slug.tsx
function PageComponent() {
  const loaderData = Route.useLoaderData();

  const { data, isPreviewMode, selectedBlockId, handleBlockClick } =
    useCollectionPreview({ initialData: loaderData });

  return (
    <article>
      <PreviewField field="title" as="h1">
        {data.title}
      </PreviewField>

      <BlockRenderer
        layout={data.content.layout}
        values={data.content.values}
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onBlockClick={handleBlockClick}
      />
    </article>
  );
}
```

## 3.7 Admin-Side: Focus Handler

```typescript
// Listen for field click from preview
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "FIELD_CLICKED") {
      const input = formRef.current?.querySelector(
        `[name="${event.data.field}"]`,
      );
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, []);
```

---

# Phase 4: Block Data Prefetch

> **Package:** `questpie/shared`
> **Priority:** Medium
> **Dependencies:** Phase 2 (Block Definitions)

SSR support pre bloky ktore potrebuju fetchovat data. Bloky bez prefetch si riesia data sami (useQuery, useSuspenseQuery).

## 4.1 Two Options

```typescript
// OPTION 1: With prefetch (SSR)
const latestPostsBlock = qa
  .block("latestPosts")
  .fields(({ r }) => ({
    title: r.text({ label: "Title", localized: true }),
    count: r.number({ label: "Count" }),
  }))
  .prefetch(async ({ values, cms, locale }) => {
    const posts = await cms.posts.find({
      limit: values.count || 3,
      locale,
    });
    return { posts };
  })
  .renderer(({ values, data }) => (
    <section>
      <h2>{values.title}</h2>
      {data.posts.map(post => <PostCard key={post.id} post={post} />)}
    </section>
  ))
  .build();

// OPTION 2: No prefetch (client-side)
const dynamicProductsBlock = qa
  .block("dynamicProducts")
  .fields(({ r }) => ({
    category: r.relation({ targetCollection: "categories", type: "single" }),
  }))
  .renderer(({ values }) => {
    const { data, isLoading } = useQuery({
      queryKey: ["products", values.category],
      queryFn: () => fetchProducts(values.category),
    });

    if (isLoading) return <Skeleton />;
    return <ProductGrid products={data} />;
  })
  .build();
```

## 4.2 Prefetch Types

```typescript
export type BlockPrefetchContext = {
  values: Record<string, any>;
  cms: CMSClient;
  locale: string;
  request?: Request;
};

export type BlockPrefetch<TData = any> = (
  context: BlockPrefetchContext,
) => Promise<TData>;
```

## 4.3 `prefetchBlockData()` Utility

```typescript
// packages/questpie/src/shared/blocks/prefetch.ts

export async function prefetchBlockData(
  layout: BlockLayout,
  values: Record<string, Record<string, any>>,
  blocks: Record<string, BlockDefinition>,
  context: Omit<BlockPrefetchContext, "values">,
): Promise<Record<string, any>> {
  const requirements: Array<{
    blockId: string;
    prefetch: BlockPrefetch;
    values: Record<string, any>;
  }> = [];

  // Collect all prefetch functions
  function collect(node: BlockNode) {
    const blockDef = blocks[node.type];
    if (blockDef?.prefetch) {
      requirements.push({
        blockId: node.id,
        prefetch: blockDef.prefetch,
        values: values[node.id] || {},
      });
    }
    node.children?.forEach(collect);
  }

  layout.blocks.forEach(collect);

  if (requirements.length === 0) return {};

  // Execute all in parallel
  const results = await Promise.all(
    requirements.map(async ({ blockId, prefetch, values: blockValues }) => {
      try {
        const data = await prefetch({ ...context, values: blockValues });
        return [blockId, data] as const;
      } catch (error) {
        console.error(`Prefetch failed for block ${blockId}:`, error);
        return [blockId, null] as const;
      }
    }),
  );

  return Object.fromEntries(results);
}
```

## 4.4 Usage in Route Loader

```typescript
// TanStack Start
export const Route = createFileRoute("/$locale/pages/$slug")({
  loader: async ({ params, context }) => {
    const { cms } = context;
    const page = await cms.pages.findOne({ where: { slug: params.slug } });

    const blockData = await prefetchBlockData(
      page.content.layout,
      page.content.values,
      blocks,
      { cms, locale: params.locale },
    );

    return { page, blockData };
  },
});

// Next.js
export default async function Page({ params }) {
  const page = await cms.pages.findOne({ where: { slug: params.slug } });

  const blockData = await prefetchBlockData(
    page.content.layout,
    page.content.values,
    blocks,
    { cms, locale: params.locale },
  );

  return <PageComponent page={page} blockData={blockData} />;
}
```

## 4.5 BlockRenderer with Data

```typescript
export function BlockRenderer({
  layout,
  values,
  blocks,
  data = {},
  selectedBlockId,
  onBlockClick,
}: BlockRendererProps) {
  function renderBlock(node: BlockNode): React.ReactNode {
    const blockDef = blocks[node.type];
    if (!blockDef?.renderer) return null;

    const Component = blockDef.renderer;
    const blockValues = values[node.id] || {};
    const blockData = data[node.id];

    return (
      <div
        key={node.id}
        data-block-id={node.id}
        onClick={() => onBlockClick?.(node.id)}
        className={cn(selectedBlockId === node.id && "ring-2 ring-primary")}
      >
        <Component
          id={node.id}
          values={blockValues}
          data={blockData}
          isSelected={selectedBlockId === node.id}
        >
          {node.children?.map(renderBlock)}
        </Component>
      </div>
    );
  }

  return <>{layout.blocks.map(renderBlock)}</>;
}
```

---

# File Structure

```
packages/questpie/src/
├── server/
│   └── collection/
│       ├── builder/
│       │   └── collection-builder.ts  # + .nestedLocalized()
│       ├── hooks/
│       │   └── nested-localized-hook.ts
│       └── utils/
│           └── nested-localized.ts    # merge/split utilities
│
└── shared/
    └── blocks/
        ├── types.ts                   # BlockLayout, BlockNode
        ├── prefetch.ts                # prefetchBlockData()
        └── index.ts

packages/admin/src/client/
├── builder/
│   └── block/
│       ├── block-builder.ts           # qa.block()
│       ├── types.ts
│       └── index.ts
│
├── components/
│   └── blocks/
│       ├── block-editor-context.tsx
│       ├── block-editor-layout.tsx
│       ├── block-canvas.tsx
│       ├── block-item.tsx
│       ├── block-sidebar.tsx
│       ├── block-form.tsx
│       ├── block-library.tsx
│       ├── block-renderer.tsx
│       └── index.ts
│
├── preview/
│   ├── use-collection-preview.ts
│   ├── preview-field.tsx
│   └── index.ts
│
└── fields/
    └── blocks/
        └── blocks-field.tsx           # r.blocks() field
```

---

# Summary

## Components by Phase

| Phase | Component                     | Package           | Purpose                      |
| ----- | ----------------------------- | ----------------- | ---------------------------- |
| 1     | `.nestedLocalized()`          | `questpie/server` | Fluent API for split storage |
| 1     | `createNestedLocalizedHook()` | `questpie/server` | Auto merge/split             |
| 1     | `mergeNestedLocalized()`      | `questpie/server` | Merge static + i18n          |
| 2     | `qa.block()`                  | `@questpie/admin` | Block definition builder     |
| 2     | `r.blocks()`                  | `@questpie/admin` | Block editor field           |
| 2     | `<BlockRenderer>`             | `@questpie/admin` | Render blocks                |
| 3     | `useCollectionPreview()`      | `@questpie/admin` | Preview hook                 |
| 3     | `<PreviewField>`              | `@questpie/admin` | Click-to-focus               |
| 4     | `.prefetch()`                 | `@questpie/admin` | Block data loader            |
| 4     | `prefetchBlockData()`         | `questpie/shared` | SSR prefetch utility         |

## Data Flow

```
Admin Save:
  merged content → _meta (localized fields) → beforeWrite hook → split → DB

API Read:
  DB → afterRead hook → merge static + i18n (+ fallback) → merged content → API

Frontend:
  API response (merged) → BlockRenderer → Individual blocks
```
