# 05 - Collection Preview

> **Status:** Implemented
> **Priority:** Medium
> **Dependencies:** None (works independently)
> **Package:** `@questpie/admin`

## Overview

Live preview system pre kolekcie. Zobrazuje preview stranky v iframe s real-time aktualizaciami pri editovani. Funguje pre akukolvek kolekciu - nie len pre bloky.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Admin - Collection Edit Form                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Title: [My Page___________________]  ◄──┐                              │
│   Slug:  [/my-page__________________]    │ Click in preview              │
│   Content: <BlockEditor />                │ focuses field in form        │
│                                           │                              │
│   [Save Draft]  [Publish]                 │                              │
│                                           │                              │
└───────────────────────────────────────────┼──────────────────────────────┘
                    │                       │
                    │ postMessage           │ postMessage
                    │ (form data)           │ (field clicked)
                    ▼                       │
┌───────────────────────────────────────────┼──────────────────────────────┐
│  Preview Iframe                           │                              │
├───────────────────────────────────────────┼──────────────────────────────┤
│                                           │                              │
│   <PreviewField field="title">            │                              │
│     <h1>My Page</h1>  ────────────────────┘                              │
│   </PreviewField>                                                        │
│                                                                          │
│   <BlockRenderer                                                         │
│     content={previewData.content}                                        │
│     selectedBlockId={selectedBlockId}                                    │
│     onBlockClick={handleBlockClick}                                      │
│   />                                                                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## PostMessage Protocol

### Messages: Admin -> Preview

```typescript
type AdminToPreviewMessage =
  | {
      type: "PREVIEW_DATA_UPDATE";
      data: Record<string, any>; // Full form data
    }
  | {
      type: "SELECT_BLOCK";
      blockId: string;
    }
  | {
      type: "FOCUS_FIELD";
      field: string;
    };
```

### Messages: Preview -> Admin

```typescript
type PreviewToAdminMessage =
  | {
      type: "PREVIEW_READY";
    }
  | {
      type: "FIELD_CLICKED";
      field: string;
    }
  | {
      type: "BLOCK_CLICKED";
      blockId: string;
    };
```

---

## Collection Configuration

```typescript
// Admin collection definition
export const pagesCollection = qa
  .collection("pages")
  .meta({ label: "Pages", icon: FileText })
  .options({
    // Preview configuration
    preview: {
      /** URL builder for preview iframe */
      url: (values, locale) => `/${locale}/pages/${values.slug}?preview=true`,

      /** Enable/disable preview (default: true if url is defined) */
      enabled: true,

      /** Preview pane position */
      position: "right", // "right" | "bottom" | "modal"

      /** Default preview pane size (percentage) */
      defaultSize: 50,

      /** Minimum size */
      minSize: 30,
    },
  })
  .fields(({ r }) => ({
    title: r.text({ label: "Title", localized: true }),
    slug: r.text({ label: "Slug" }),
    content: r.blocks({ allowedBlocks: ["hero", "text", "image"] }),
  }))
  .build();
```

---

## Admin-Side Components

### PreviewPane

```typescript
// packages/admin/src/client/components/preview/preview-pane.tsx

type PreviewPaneProps = {
  /** Preview URL */
  url: string;
  /** Current form values */
  values: Record<string, any>;
  /** Selected block ID (for block editor integration) */
  selectedBlockId?: string | null;
  /** Field click handler */
  onFieldClick?: (field: string) => void;
  /** Block click handler */
  onBlockClick?: (blockId: string) => void;
};

export function PreviewPane({
  url,
  values,
  selectedBlockId,
  onFieldClick,
  onBlockClick,
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Listen for messages from preview
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Validate origin
      if (!isValidPreviewOrigin(event.origin)) return;

      switch (event.data?.type) {
        case "PREVIEW_READY":
          setIsReady(true);
          // Send initial data
          sendToPreview({ type: "PREVIEW_DATA_UPDATE", data: values });
          break;

        case "FIELD_CLICKED":
          onFieldClick?.(event.data.field);
          break;

        case "BLOCK_CLICKED":
          onBlockClick?.(event.data.blockId);
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onFieldClick, onBlockClick, values]);

  // Send data updates to preview
  useEffect(() => {
    if (isReady) {
      sendToPreview({ type: "PREVIEW_DATA_UPDATE", data: values });
    }
  }, [isReady, values]);

  // Send selected block updates
  useEffect(() => {
    if (isReady && selectedBlockId) {
      sendToPreview({ type: "SELECT_BLOCK", blockId: selectedBlockId });
    }
  }, [isReady, selectedBlockId]);

  function sendToPreview(message: AdminToPreviewMessage) {
    iframeRef.current?.contentWindow?.postMessage(message, "*");
  }

  return (
    <div className="relative h-full">
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Spinner />
          <span className="ml-2">Loading preview...</span>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full border-0"
        title="Preview"
      />
    </div>
  );
}
```

### CollectionEditWithPreview

```typescript
// packages/admin/src/client/views/collection/collection-edit-with-preview.tsx

export function CollectionEditWithPreview({
  collection,
  initialData,
}: Props) {
  const [values, setValues] = useState(initialData);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { locale } = useScopedLocale();

  const previewConfig = collection.options?.preview;
  const previewUrl = previewConfig?.url?.(values, locale);

  // Handle field click from preview -> focus field in form
  const handleFieldClick = useCallback((field: string) => {
    const input = formRef.current?.querySelector(
      `[name="${field}"], [data-field="${field}"]`
    );
    if (input instanceof HTMLElement) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.focus();
    }
  }, []);

  // Handle block click from preview -> select in block editor
  const handleBlockClick = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    // Also scroll block into view in editor
  }, []);

  if (!previewUrl) {
    // No preview - render standard form
    return <CollectionEditForm collection={collection} initialData={initialData} />;
  }

  return (
    <ResizablePanelGroup direction="horizontal">
      {/* Form pane */}
      <ResizablePanel defaultSize={50} minSize={30}>
        <form ref={formRef}>
          <CollectionForm
            collection={collection}
            values={values}
            onChange={setValues}
            selectedBlockId={selectedBlockId}
            onBlockSelect={setSelectedBlockId}
          />
        </form>
      </ResizablePanel>

      <ResizableHandle />

      {/* Preview pane */}
      <ResizablePanel defaultSize={50} minSize={30}>
        <PreviewPane
          url={previewUrl}
          values={values}
          selectedBlockId={selectedBlockId}
          onFieldClick={handleFieldClick}
          onBlockClick={handleBlockClick}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
```

---

## Frontend-Side Hook

### useCollectionPreview

```typescript
// packages/admin/src/client/preview/use-collection-preview.ts

export type UseCollectionPreviewOptions<TData> = {
  /** Server-loaded data */
  initialData: TData;
  /** Custom merge function (optional) */
  merge?: (server: TData, preview: Partial<TData>) => TData;
};

export type UseCollectionPreviewResult<TData> = {
  /** Merged data (server + preview overrides) */
  data: TData;
  /** Whether we're in preview mode */
  isPreviewMode: boolean;
  /** Currently selected block ID */
  selectedBlockId: string | null;
  /** Click handler for PreviewField */
  handleFieldClick: (field: string) => void;
  /** Click handler for blocks */
  handleBlockClick: (blockId: string) => void;
};

export function useCollectionPreview<TData extends Record<string, any>>({
  initialData,
  merge,
}: UseCollectionPreviewOptions<TData>): UseCollectionPreviewResult<TData> {
  const [previewData, setPreviewData] = useState<Partial<TData> | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Check if we're in iframe (preview mode)
  const isPreviewMode =
    typeof window !== "undefined" && window.parent !== window;

  useEffect(() => {
    if (!isPreviewMode) return;

    // Signal ready to parent
    window.parent.postMessage({ type: "PREVIEW_READY" }, "*");

    const handler = (event: MessageEvent) => {
      switch (event.data?.type) {
        case "PREVIEW_DATA_UPDATE":
          setPreviewData(event.data.data);
          break;

        case "SELECT_BLOCK":
          setSelectedBlockId(event.data.blockId);
          break;

        case "FOCUS_FIELD":
          // Could scroll field into view in preview
          break;
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [isPreviewMode]);

  // Merge server data with preview data
  const data = useMemo(() => {
    if (!previewData) return initialData;

    if (merge) {
      return merge(initialData, previewData);
    }

    // Default shallow merge
    return { ...initialData, ...previewData };
  }, [initialData, previewData, merge]);

  const handleFieldClick = useCallback(
    (field: string) => {
      if (isPreviewMode) {
        window.parent.postMessage({ type: "FIELD_CLICKED", field }, "*");
      }
    },
    [isPreviewMode],
  );

  const handleBlockClick = useCallback(
    (blockId: string) => {
      if (isPreviewMode) {
        window.parent.postMessage({ type: "BLOCK_CLICKED", blockId }, "*");
      }
    },
    [isPreviewMode],
  );

  return {
    data,
    isPreviewMode,
    selectedBlockId,
    handleFieldClick,
    handleBlockClick,
  };
}
```

---

## PreviewField Component

```typescript
// packages/admin/src/client/preview/preview-field.tsx

type PreviewFieldProps = {
  /** Field name (for click-to-focus) */
  field: string;
  /** Content to render */
  children: React.ReactNode;
  /** HTML element type */
  as?: React.ElementType;
  /** Additional class names */
  className?: string;
};

export function PreviewField({
  field,
  children,
  as: Component = "div",
  className,
}: PreviewFieldProps) {
  const { isPreviewMode, handleFieldClick } = useCollectionPreview({
    initialData: {},  // Not used, just for hook access
  });

  // In non-preview mode, just render children
  if (!isPreviewMode) {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <Component
      data-preview-field={field}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        handleFieldClick(field);
      }}
      className={cn(
        className,
        "cursor-pointer transition-all duration-150",
        "hover:outline hover:outline-2 hover:outline-primary hover:outline-offset-2"
      )}
    >
      {children}
    </Component>
  );
}
```

---

## Usage Example (Frontend Route)

```typescript
// app/routes/$locale/pages/$slug.tsx
import { useCollectionPreview, PreviewField } from "@questpie/admin/client";
import { BlockRenderer } from "@questpie/admin/client";
import { blocks } from "~/admin/blocks";

export default function PageRoute() {
  const loaderData = Route.useLoaderData();

  const {
    data,
    isPreviewMode,
    selectedBlockId,
    handleBlockClick
  } = useCollectionPreview({
    initialData: loaderData.page,
  });

  return (
    <article className={cn(isPreviewMode && "preview-mode")}>
      {/* Title - clickable in preview */}
      <PreviewField field="title" as="h1" className="text-4xl font-bold">
        {data.title}
      </PreviewField>

      {/* Subtitle */}
      {data.subtitle && (
        <PreviewField field="subtitle" as="p" className="text-xl text-muted-foreground">
          {data.subtitle}
        </PreviewField>
      )}

      {/* Block content */}
      <BlockRenderer
        content={data.content}
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onBlockClick={handleBlockClick}
      />
    </article>
  );
}
```

---

## Preview Styles

```css
/* Optional: Add preview mode indicators */
.preview-mode [data-preview-field]:hover {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.preview-mode [data-block-id]:hover {
  outline: 2px dashed var(--primary);
  outline-offset: 2px;
}

.preview-mode [data-block-id].selected {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

---

## Security Considerations

1. **Origin validation** - Admin should validate iframe origin
2. **Data sanitization** - Preview should sanitize received data
3. **Preview token** - Consider adding `?preview=token` for auth
4. **CSP headers** - Configure frame-ancestors appropriately

```typescript
// Admin: validate preview origin
function isValidPreviewOrigin(origin: string): boolean {
  const allowedOrigins = [
    window.location.origin,
    process.env.PREVIEW_ORIGIN,
  ].filter(Boolean);

  return allowedOrigins.includes(origin);
}
```

---

## File Structure

```
packages/admin/src/client/
├── components/
│   └── preview/
│       ├── preview-pane.tsx
│       └── index.ts
│
├── preview/
│   ├── use-collection-preview.ts
│   ├── preview-field.tsx
│   ├── types.ts
│   └── index.ts
│
└── views/
    └── collection/
        └── collection-edit-with-preview.tsx
```

---

## Exports

```typescript
// packages/admin/src/exports/client.ts

// For use in admin
export { PreviewPane } from "../client/components/preview";

// For use in frontend (preview pages)
export { useCollectionPreview, PreviewField } from "../client/preview";
```
