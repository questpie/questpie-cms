# Field Registry Type Inference Design

## Goal

Create a type-safe pattern where:

- `q.field('text', { component, cell })` on frontend
- Config is **automatically inferred** from backend field metadata
- Type-safe mapping: `'text'` → `TextFieldMetadata` → `TextFieldAdminConfig`

---

## Type Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (questpie)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  // Field Metadata Registry (maps type string → metadata interface)         │
│  interface FieldMetadataRegistry {                                          │
│    text: TextFieldMetadata;                                                 │
│    textarea: TextareaFieldMetadata;                                         │
│    number: NumberFieldMetadata;                                             │
│    select: SelectFieldMetadata;                                             │
│    relation: RelationFieldMetadata;                                         │
│    // ... extensible via module augmentation                                │
│  }                                                                          │
│                                                                             │
│  // Each metadata has optional admin config (augmented by admin package)    │
│  interface TextFieldMetadata extends FieldMetadataBase {                    │
│    type: "text";                                                            │
│    mode?: "varchar" | "text";                                               │
│    admin?: TextFieldAdminConfig;  // ← Augmented type                       │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ Augmentation
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ADMIN PACKAGE                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  // Augment backend types with admin-specific config                        │
│  declare module '@questpie/questpie' {                                      │
│    interface TextFieldAdminConfig {                                         │
│      placeholder?: string;                                                  │
│      showCounter?: boolean;                                                 │
│      prefix?: ReactNode;                                                    │
│      // ... UI-specific options                                             │
│    }                                                                        │
│  }                                                                          │
│                                                                             │
│  // Field Renderer Registry (maps type string → renderer)                   │
│  interface FieldRendererRegistry {                                          │
│    text: FieldRenderer<TextFieldMetadata>;                                  │
│    textarea: FieldRenderer<TextareaFieldMetadata>;                          │
│    // ... extensible                                                        │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### 1. Backend: Field Metadata Registry

````typescript
// ═══════════════════════════════════════════════════════════════════════════
// packages/questpie/src/server/fields/metadata-registry.ts
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Registry mapping field type names to their metadata interfaces.
 * Extensible via module augmentation for custom fields.
 *
 * @example Adding a custom field type:
 * ```ts
 * declare module '@questpie/questpie' {
 *   interface FieldMetadataRegistry {
 *     myCustomField: MyCustomFieldMetadata;
 *   }
 * }
 * ```
 */
export interface FieldMetadataRegistry {
  // Built-in types
  text: TextFieldMetadata;
  textarea: TextareaFieldMetadata;
  email: EmailFieldMetadata;
  url: UrlFieldMetadata;
  number: NumberFieldMetadata;
  boolean: BooleanFieldMetadata;
  date: DateFieldMetadata;
  datetime: DatetimeFieldMetadata;
  time: TimeFieldMetadata;
  select: SelectFieldMetadata;
  relation: RelationFieldMetadata;
  object: ObjectFieldMetadata;
  array: ArrayFieldMetadata;
  json: JsonFieldMetadata;
  blocks: BlocksFieldMetadata;
  upload: UploadFieldMetadata;
}

/**
 * Get metadata type for a field type string.
 */
export type GetFieldMetadata<TType extends string> =
  TType extends keyof FieldMetadataRegistry
    ? FieldMetadataRegistry[TType]
    : FieldMetadataBase;

/**
 * Get admin config type for a field type string.
 */
export type GetFieldAdminConfig<TType extends string> =
  GetFieldMetadata<TType> extends { admin?: infer TAdmin }
    ? TAdmin
    : AdminFieldConfig;

/**
 * All registered field type names.
 */
export type FieldTypeName = keyof FieldMetadataRegistry;
````

### 2. Backend: Admin Config Interfaces (Empty, Augmented Later)

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// packages/questpie/src/server/fields/admin-config.ts
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Base admin config - common to all fields.
 * Augmented by admin package with full UI options.
 */
export interface AdminFieldConfig {
  // Empty - augmented by admin package
}

/**
 * Per-field-type admin configs.
 * Empty interfaces - augmented by admin package.
 */
export interface TextFieldAdminConfig extends AdminFieldConfig {}
export interface TextareaFieldAdminConfig extends AdminFieldConfig {}
export interface NumberFieldAdminConfig extends AdminFieldConfig {}
export interface SelectFieldAdminConfig extends AdminFieldConfig {}
export interface RelationFieldAdminConfig extends AdminFieldConfig {}
export interface ObjectFieldAdminConfig extends AdminFieldConfig {}
export interface ArrayFieldAdminConfig extends AdminFieldConfig {}
export interface BlocksFieldAdminConfig extends AdminFieldConfig {}
export interface UploadFieldAdminConfig extends AdminFieldConfig {}
// ... etc
```

### 3. Admin: Type Augmentation

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// packages/admin/src/augmentation.ts
// ═══════════════════════════════════════════════════════════════════════════

import type { ComponentType, ReactNode } from "react";

declare module "@questpie/questpie" {
  // ─────────────────────────────────────────────────────────────────────────
  // Base Admin Config (applies to ALL fields)
  // ─────────────────────────────────────────────────────────────────────────

  interface AdminFieldConfig {
    /** Custom form component override */
    component?: ComponentType<any>;

    /** Custom cell component override */
    cell?: ComponentType<any>;

    /** Field width */
    width?: string | number;

    /** Column span (1-12) */
    colspan?: number;

    /** Field group */
    group?: string;

    /** Display order */
    order?: number;

    /** Conditional visibility */
    hidden?: boolean | ((values: Record<string, unknown>) => boolean);

    /** Conditional read-only */
    readOnly?: boolean | ((values: Record<string, unknown>) => boolean);

    /** Conditional disabled */
    disabled?: boolean | ((values: Record<string, unknown>) => boolean);

    /** Show in list view */
    showInList?: boolean;

    /** List column width */
    listWidth?: string | number;

    /** Sortable in list */
    sortable?: boolean;

    /** Filterable */
    filterable?: boolean;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Text Field Admin Config
  // ─────────────────────────────────────────────────────────────────────────

  interface TextFieldAdminConfig extends AdminFieldConfig {
    /** Placeholder text */
    placeholder?: string;

    /** Show character counter */
    showCounter?: boolean;

    /** Prefix element */
    prefix?: ReactNode;

    /** Suffix element */
    suffix?: ReactNode;

    /** Input type */
    inputType?: "text" | "email" | "url" | "tel" | "search" | "password";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Textarea Field Admin Config
  // ─────────────────────────────────────────────────────────────────────────

  interface TextareaFieldAdminConfig extends AdminFieldConfig {
    /** Placeholder */
    placeholder?: string;

    /** Number of rows */
    rows?: number;

    /** Auto-resize */
    autoResize?: boolean;

    /** Show character counter */
    showCounter?: boolean;

    /** Enable rich text mode */
    richText?: boolean;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Number Field Admin Config
  // ─────────────────────────────────────────────────────────────────────────

  interface NumberFieldAdminConfig extends AdminFieldConfig {
    /** Show +/- buttons */
    showButtons?: boolean;

    /** Step value */
    step?: number;

    /** Number format */
    format?: Intl.NumberFormatOptions;

    /** Prefix (e.g., "$") */
    prefix?: string;

    /** Suffix (e.g., "kg") */
    suffix?: string;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Select Field Admin Config
  // ─────────────────────────────────────────────────────────────────────────

  interface SelectFieldAdminConfig extends AdminFieldConfig {
    /** Allow creating new options */
    creatable?: boolean;

    /** Searchable */
    searchable?: boolean;

    /** Clearable */
    clearable?: boolean;

    /** Display mode */
    displayAs?: "dropdown" | "radio" | "checkbox" | "buttons";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Relation Field Admin Config
  // ─────────────────────────────────────────────────────────────────────────

  interface RelationFieldAdminConfig extends AdminFieldConfig {
    /** Fields to display in picker */
    displayFields?: string[];

    /** Title field */
    titleField?: string;

    /** Allow inline create */
    allowCreate?: boolean;

    /** Allow inline edit */
    allowEdit?: boolean;

    /** Preload options */
    preload?: boolean;

    /** Max items for multiple */
    maxItems?: number;

    /** Display mode for hasMany */
    displayAs?: "select" | "table" | "cards" | "list";

    /** Drag & drop reorder */
    sortable?: boolean;
  }

  // ... similar for other field types
}
```

### 4. Admin: Field Renderer Definition

````typescript
// ═══════════════════════════════════════════════════════════════════════════
// packages/admin/src/client/registry/field-renderer.ts
// ═══════════════════════════════════════════════════════════════════════════

import type { ComponentType } from "react";
import type { ZodTypeAny } from "zod";
import type {
  FieldMetadataRegistry,
  GetFieldMetadata,
  GetFieldAdminConfig,
  FieldTypeName,
} from "@questpie/questpie";

/**
 * Props passed to field form components.
 */
export interface FieldComponentProps<
  TMetadata extends FieldMetadataBase = FieldMetadataBase,
> {
  /** Field name in form */
  name: string;

  /** Current value */
  value: unknown;

  /** Change handler */
  onChange: (value: unknown) => void;

  /** Blur handler */
  onBlur?: () => void;

  /** Validation error */
  error?: string;

  /** Field is disabled */
  disabled?: boolean;

  /** Field is read-only */
  readOnly?: boolean;

  /** Full field metadata from backend */
  metadata: TMetadata;

  /** All form values (for conditional logic) */
  values: Record<string, unknown>;
}

/**
 * Props passed to cell components.
 */
export interface CellComponentProps<
  TMetadata extends FieldMetadataBase = FieldMetadataBase,
> {
  /** Cell value */
  value: unknown;

  /** Full row data */
  row: Record<string, unknown>;

  /** Field metadata */
  metadata: TMetadata;
}

/**
 * Field renderer definition.
 */
export interface FieldRenderer<
  TMetadata extends FieldMetadataBase = FieldMetadataBase,
> {
  /** Field type name */
  readonly type: string;

  /** Form component */
  readonly component: ComponentType<FieldComponentProps<TMetadata>>;

  /** Cell component for list view */
  readonly cell?: ComponentType<CellComponentProps<TMetadata>>;

  /** Create Zod validation schema */
  readonly createZod?: (metadata: TMetadata) => ZodTypeAny;

  /** Priority for matching (higher = preferred) */
  readonly priority?: number;

  /** Additional matcher for variants */
  readonly match?: (metadata: TMetadata) => boolean;
}

/**
 * Field renderer registry - maps types to renderers.
 * Extensible via module augmentation.
 */
export interface FieldRendererRegistry {
  // Populated via registration
}

// ═══════════════════════════════════════════════════════════════════════════
// q.field() - Type-safe field renderer factory
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Define a field renderer with automatic type inference.
 *
 * The config/props types are automatically inferred from the backend
 * FieldMetadataRegistry based on the field type name.
 *
 * @example
 * ```ts
 * // Config is auto-inferred as TextFieldMetadata
 * const textRenderer = q.field('text', {
 *   component: TextField,
 *   cell: TextCell,
 *   createZod: (metadata) => {
 *     // metadata is typed as TextFieldMetadata
 *     let schema = z.string();
 *     if (metadata.validation?.maxLength) {
 *       schema = schema.max(metadata.validation.maxLength);
 *     }
 *     return metadata.required ? schema : schema.nullish();
 *   },
 * });
 *
 * // For relation field - metadata is RelationFieldMetadata
 * const relationRenderer = q.field('relation', {
 *   component: RelationField,
 *   cell: RelationCell,
 *   // Admin config is typed: metadata.admin?.displayAs, etc.
 * });
 * ```
 */
export function field<TType extends FieldTypeName>(
  type: TType,
  config: {
    /** Form component - receives FieldComponentProps<GetFieldMetadata<TType>> */
    component: ComponentType<FieldComponentProps<GetFieldMetadata<TType>>>;

    /** Cell component - receives CellComponentProps<GetFieldMetadata<TType>> */
    cell?: ComponentType<CellComponentProps<GetFieldMetadata<TType>>>;

    /** Create Zod schema from metadata */
    createZod?: (metadata: GetFieldMetadata<TType>) => ZodTypeAny;

    /** Priority for variant matching */
    priority?: number;

    /** Variant matcher */
    match?: (metadata: GetFieldMetadata<TType>) => boolean;
  },
): FieldRenderer<GetFieldMetadata<TType>> {
  return {
    type,
    component: config.component,
    cell: config.cell,
    createZod: config.createZod,
    priority: config.priority,
    match: config.match,
  };
}

/**
 * Define a field renderer variant.
 *
 * Variants have higher priority and use matchers to select
 * based on metadata properties.
 *
 * @example
 * ```ts
 * // Rich text variant for textarea when admin.richText is true
 * const richTextRenderer = q.fieldVariant('textarea', {
 *   component: RichTextField,
 *   cell: RichTextCell,
 *   match: (metadata) => metadata.admin?.richText === true,
 * });
 * ```
 */
export function fieldVariant<TType extends FieldTypeName>(
  type: TType,
  config: {
    component: ComponentType<FieldComponentProps<GetFieldMetadata<TType>>>;
    cell?: ComponentType<CellComponentProps<GetFieldMetadata<TType>>>;
    createZod?: (metadata: GetFieldMetadata<TType>) => ZodTypeAny;
    match: (metadata: GetFieldMetadata<TType>) => boolean;
    priority?: number;
  },
): FieldRenderer<GetFieldMetadata<TType>> {
  return {
    type,
    component: config.component,
    cell: config.cell,
    createZod: config.createZod,
    match: config.match,
    priority: config.priority ?? 10, // Variants have higher default priority
  };
}
````

### 5. Admin: Registry Class

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// packages/admin/src/client/registry/renderer-registry.ts
// ═══════════════════════════════════════════════════════════════════════════

import type { FieldMetadataBase, FieldTypeName } from "@questpie/questpie";
import type { FieldRenderer } from "./field-renderer";

/**
 * Global field renderer registry.
 */
class FieldRendererRegistryImpl {
  private renderers: Map<string, FieldRenderer[]> = new Map();

  /**
   * Register a field renderer.
   */
  register<TRenderer extends FieldRenderer>(renderer: TRenderer): this {
    const existing = this.renderers.get(renderer.type) || [];
    existing.push(renderer);
    // Sort by priority (descending)
    existing.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.renderers.set(renderer.type, existing);
    return this;
  }

  /**
   * Register multiple renderers.
   */
  registerAll(renderers: FieldRenderer[]): this {
    for (const renderer of renderers) {
      this.register(renderer);
    }
    return this;
  }

  /**
   * Resolve the best renderer for a field metadata.
   */
  resolve(metadata: FieldMetadataBase): FieldRenderer | undefined {
    const typeRenderers = this.renderers.get(metadata.type) || [];

    // Find first matching renderer
    for (const renderer of typeRenderers) {
      if (!renderer.match || renderer.match(metadata)) {
        return renderer;
      }
    }

    // Fallback to wildcard renderer
    const wildcardRenderers = this.renderers.get("*") || [];
    return wildcardRenderers[0];
  }

  /**
   * Get all renderers for a type.
   */
  getRenderers(type: string): FieldRenderer[] {
    return this.renderers.get(type) || [];
  }

  /**
   * Check if a type is registered.
   */
  has(type: string): boolean {
    return this.renderers.has(type);
  }

  /**
   * Get all registered types.
   */
  types(): string[] {
    return Array.from(this.renderers.keys());
  }
}

// Global singleton
export const fieldRendererRegistry = new FieldRendererRegistryImpl();
```

### 6. Admin: Built-in Renderers

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// packages/admin/src/client/registry/builtin-renderers.ts
// ═══════════════════════════════════════════════════════════════════════════

import { z } from "zod";
import { field, fieldVariant } from "./field-renderer";
import { fieldRendererRegistry } from "./renderer-registry";

// Components (lazy loaded)
const TextField = lazy(() => import("../fields/TextField"));
const TextareaField = lazy(() => import("../fields/TextareaField"));
const RichTextField = lazy(() => import("../fields/RichTextField"));
const NumberField = lazy(() => import("../fields/NumberField"));
const SelectField = lazy(() => import("../fields/SelectField"));
const RelationField = lazy(() => import("../fields/RelationField"));
const RelationTableField = lazy(() => import("../fields/RelationTableField"));

// Cells
const TextCell = lazy(() => import("../cells/TextCell"));
const NumberCell = lazy(() => import("../cells/NumberCell"));
const SelectCell = lazy(() => import("../cells/SelectCell"));
const RelationCell = lazy(() => import("../cells/RelationCell"));

// ─────────────────────────────────────────────────────────────────────────
// Text Fields
// ─────────────────────────────────────────────────────────────────────────

const textRenderer = field("text", {
  component: TextField,
  cell: TextCell,
  createZod: (meta) => {
    let schema = z.string();

    if (meta.validation?.minLength) {
      schema = schema.min(meta.validation.minLength);
    }
    if (meta.validation?.maxLength) {
      schema = schema.max(meta.validation.maxLength);
    }
    if (meta.validation?.pattern) {
      schema = schema.regex(new RegExp(meta.validation.pattern));
    }

    return meta.required ? schema : schema.nullish();
  },
});

const textareaRenderer = field("textarea", {
  component: TextareaField,
  cell: TextCell,
  createZod: (meta) => {
    let schema = z.string();
    if (meta.validation?.maxLength) {
      schema = schema.max(meta.validation.maxLength);
    }
    return meta.required ? schema : schema.nullish();
  },
});

// Rich text variant (higher priority when admin.richText is true)
const richTextRenderer = fieldVariant("textarea", {
  component: RichTextField,
  cell: TextCell,
  match: (meta) => meta.admin?.richText === true,
});

// ─────────────────────────────────────────────────────────────────────────
// Number Field
// ─────────────────────────────────────────────────────────────────────────

const numberRenderer = field("number", {
  component: NumberField,
  cell: NumberCell,
  createZod: (meta) => {
    let schema = meta.integer ? z.number().int() : z.number();

    if (meta.validation?.min !== undefined) {
      schema = schema.min(meta.validation.min);
    }
    if (meta.validation?.max !== undefined) {
      schema = schema.max(meta.validation.max);
    }

    return meta.required ? schema : schema.nullish();
  },
});

// ─────────────────────────────────────────────────────────────────────────
// Select Field
// ─────────────────────────────────────────────────────────────────────────

const selectRenderer = field("select", {
  component: SelectField,
  cell: SelectCell,
  createZod: (meta) => {
    const values = meta.options.map((o) => o.value);

    if (meta.multiple) {
      let schema = z.array(z.enum(values as [string, ...string[]]));
      if (meta.validation?.minItems) {
        schema = schema.min(meta.validation.minItems);
      }
      if (meta.validation?.maxItems) {
        schema = schema.max(meta.validation.maxItems);
      }
      return meta.required ? schema : schema.nullish();
    }

    const schema = z.enum(values as [string, ...string[]]);
    return meta.required ? schema : schema.nullish();
  },
});

// ─────────────────────────────────────────────────────────────────────────
// Relation Field
// ─────────────────────────────────────────────────────────────────────────

const relationRenderer = field("relation", {
  component: RelationField,
  cell: RelationCell,
  createZod: (meta) => {
    // belongsTo = single ID
    if (meta.relationType === "belongsTo") {
      return meta.required ? z.string().uuid() : z.string().uuid().nullish();
    }

    // hasMany/manyToMany = array of IDs
    let schema = z.array(z.string().uuid());
    if (meta.admin?.maxItems) {
      schema = schema.max(meta.admin.maxItems);
    }
    return meta.required ? schema.min(1) : schema;
  },
});

// Table variant for hasMany relations
const relationTableRenderer = fieldVariant("relation", {
  component: RelationTableField,
  cell: RelationCell,
  match: (meta) =>
    (meta.relationType === "hasMany" || meta.relationType === "manyToMany") &&
    meta.admin?.displayAs === "table",
});

// ─────────────────────────────────────────────────────────────────────────
// Register All
// ─────────────────────────────────────────────────────────────────────────

export function registerBuiltinRenderers() {
  fieldRendererRegistry.registerAll([
    textRenderer,
    textareaRenderer,
    richTextRenderer,
    numberRenderer,
    selectRenderer,
    relationRenderer,
    relationTableRenderer,
    // ... more
  ]);
}
```

### 7. Usage Examples

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// BACKEND: Define collection with admin config
// ═══════════════════════════════════════════════════════════════════════════

const posts = collection("posts")
  .fields((f) => ({
    title: f.text({
      label: "Title",
      required: true,
      maxLength: 200,
      // Admin config is type-safe! (TextFieldAdminConfig)
      admin: {
        placeholder: "Enter post title...",
        showCounter: true,
        showInList: true,
        sortable: true,
      },
    }),

    content: f.textarea({
      label: "Content",
      localized: true,
      // Admin config is type-safe! (TextareaFieldAdminConfig)
      admin: {
        richText: true, // ← Will use RichTextField component
        rows: 20,
      },
    }),

    author: f.relation({
      to: "users",
      required: true,
      // Admin config is type-safe! (RelationFieldAdminConfig)
      admin: {
        displayFields: ["name", "email"],
        titleField: "name",
        allowCreate: false,
        preload: true,
      },
    }),

    tags: f.relation({
      to: "tags",
      hasMany: true,
      through: "post_tags",
      admin: {
        displayAs: "table", // ← Will use RelationTableField
        sortable: true,
        maxItems: 10,
      },
    }),

    status: f.select({
      options: [
        { value: "draft", label: "Draft" },
        { value: "published", label: "Published" },
      ],
      required: true,
      admin: {
        displayAs: "radio",
        showInList: true,
      },
    }),
  }))
  .build();

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: Collection config (minimal - fields introspected!)
// ═══════════════════════════════════════════════════════════════════════════

const postsAdmin = admin
  .collection("posts")
  .list(({ f }) => ({
    // Just layout - field rendering is automatic from registry!
    columns: [f.title, f.author, f.status, f.createdAt],
    defaultSort: { field: f.createdAt, direction: "desc" },
    searchFields: [f.title, f.content],
  }))
  .form(({ f, layout }) => ({
    // Just layout - field rendering is automatic!
    layout: layout.tabs([
      { id: "content", label: "Content", fields: [f.title, f.content] },
      { id: "meta", label: "Metadata", fields: [f.tags, f.status] },
    ]),
    sidebar: {
      fields: [f.author],
    },
  }));

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM RENDERER: Override for specific field type
// ═══════════════════════════════════════════════════════════════════════════

// Register a custom color picker for text fields with specific pattern
const colorPickerRenderer = fieldVariant("text", {
  component: ColorPickerField,
  cell: ColorCell,
  match: (meta) => meta.validation?.pattern === "^#[0-9A-Fa-f]{6}$",
  priority: 20, // Higher than default text renderer
});

fieldRendererRegistry.register(colorPickerRenderer);
```

---

## Summary: What Changes

### Backend (questpie)

| Change                                 | File                          | Description                                 |
| -------------------------------------- | ----------------------------- | ------------------------------------------- |
| Add `FieldMetadataRegistry`            | `fields/metadata-registry.ts` | Type-safe mapping of type names to metadata |
| Add per-field `AdminConfig` interfaces | `fields/admin-config.ts`      | Empty interfaces for augmentation           |
| Add `admin?` to `BaseFieldConfig`      | `fields/types.ts`             | Optional admin config on all fields         |
| Add `admin?` to each field config      | `fields/builtin/*.ts`         | Type-safe admin config per field type       |

### Admin Package

| Change                      | File                            | Description                              |
| --------------------------- | ------------------------------- | ---------------------------------------- |
| Add type augmentation       | `augmentation.ts`               | Fill in admin config interfaces          |
| Add `q.field()` factory     | `registry/field-renderer.ts`    | Type-safe renderer definition            |
| Add `FieldRendererRegistry` | `registry/renderer-registry.ts` | Runtime registry                         |
| Convert existing fields     | `registry/builtin-renderers.ts` | Use new `q.field()` pattern              |
| Update collection builder   | `builder/collection/`           | Use introspection instead of `.fields()` |

---

## Type Inference Chain

```
q.field('text', { component, cell })
        │
        ▼
'text' extends FieldTypeName
        │
        ▼
GetFieldMetadata<'text'> = FieldMetadataRegistry['text'] = TextFieldMetadata
        │
        ▼
component: ComponentType<FieldComponentProps<TextFieldMetadata>>
        │
        ▼
props.metadata.admin  →  TextFieldAdminConfig (augmented)
props.metadata.validation  →  { maxLength?, minLength?, pattern? }
props.metadata.required  →  boolean
```

**Result**: Full type inference from field type string to component props!
