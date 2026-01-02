# @questpie/admin

**Config-driven, batteries-included admin UI for Questpie CMS**

## ⚡ Quick Start

### Minimal Setup (One Component!)

```tsx
import { AdminApp } from '@questpie/admin'
import { cmsClient } from './lib/cms-client'
import { Link, useLocation, useNavigate, useParams } from '@tanstack/react-router'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams()
  const segments = params._.split('/').filter(Boolean)

  return (
    <AdminApp
      client={cmsClient}  // That's it! Everything else is auto-generated
      router={{
        LinkComponent: Link,
        currentPath: location.pathname,
        segments,
        navigate,
      }}
    />
  )
}
```

### With Custom Config

```tsx
import { AdminApp } from '@questpie/admin'
import { cmsClient } from './lib/cms-client'
import { adminConfig } from './configs/admin'

function App() {
  return (
    <AdminApp
      client={cmsClient}
      config={adminConfig}  // Optional customization
      router={{ ... }}
    />
  )
}
```

## 🎨 Configuration

Most UI is auto-generated from CMS collections. Field types and relation targets must be explicit in admin config.

```typescript
import { defineAdminConfig } from '@questpie/admin/config'
import type { AppCMS } from './server/cms'

export const adminConfig = defineAdminConfig<AppCMS>()({
  app: {
    brand: { name: "My Admin" }
  },
  collections: {
    posts: {
      label: "Blog Posts",  // Override label

      // List view
      list: {
        defaultColumns: ["title", "author", "publishedAt"],
        defaultSort: { field: "publishedAt", direction: "desc" },
        with: ["author"]  // Auto-load relations
      },

      // Edit form
      edit: {
        // Optional: explicit order (recommended)
        fields: ["title", "content", "status", "publishedAt"],

        // Organize into sections
        sections: [
          {
            title: "Content",
            fields: ["title", "content"]
          },
          {
            title: "Publishing",
            fields: ["status", "publishedAt"]
          }
        ]
      },

      // Field-level overrides
      fields: {
        title: {
          label: "Post Title",
          required: true
        },
        content: {
          type: "richText",  // Custom field type
          placeholder: "Write your post..."
        },
        status: {
          type: "select",
          options: [
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" }
          ]
        },
        publishedAt: {
          label: "Publish Date",
          type: "datetime",
          // Conditional: readonly unless draft
          readOnly: (values) => values.status !== "draft"
        }
      }
    }
  }
})
```

## ✨ What's Automatic

### From CMS Schema
- 🚫 Schema introspection (field types, required, defaults, relations) - not planned (explicit config)

### From Admin Config
- ✅ **Sidebar navigation** - auto-generated from collections
- ✅ **Routing** - `/admin/:collection/:id` patterns
- ✅ **List views** - columns, sorting, filtering
- ✅ **Form views** - create/edit with validation
- ✅ **Realtime sync** - SSE enabled by default
- ✅ **Relations loading** - auto-load with `with` config

## 🎯 Features

### Conditional Fields

```typescript
fields: {
  status: {
    type: "select",
    options: [...]
  },

  // Show only when status is "cancelled"
  cancellationReason: {
    type: "textarea",
    visible: (values) => values.status === "cancelled",
    required: (values) => values.status === "cancelled"
  },

  // Readonly unless draft
  publishedAt: {
    readOnly: (values) => values.status !== "draft"
  },

  // Dynamic options based on other fields
  category: {
    type: "select",
    options: (values) => {
      if (values.type === "tech") {
        return [{ label: "Frontend", value: "frontend" }, ...]
      }
      return [{ label: "Design", value: "design" }, ...]
    }
  }
}
```

### Sections & Organization

```typescript
edit: {
  sections: [
    {
      title: "Basic Info",
      description: "Main appointment details",
      fields: ["customer", "barber", "service", "scheduledAt"],
      collapsible: true,
      defaultOpen: true
    },
    {
      title: "Status",
      fields: ["status", "notes"]
    }
  ]
}
```

### Advanced Layouts

Columns, grids, and inline layouts are supported:

```typescript
edit: {
  sections: [
    {
      title: "Basic",
      layout: "columns",
      columns: 2,
      fields: ["title", "slug", "author", "category"]
    },
    {
      title: "Pricing",
      layout: "grid",
      grid: { columns: 4, gap: 4 },
      fields: [
        { field: "price", span: 1 },
        { field: "currency", span: 1 },
        { field: "stock", span: 2 }
      ]
    },
    {
      title: "Dates",
      layout: "inline",
      fields: ["startDate", "endDate"]
    }
  ]
}
```

Sidebar layouts:

```typescript
edit: {
  layout: "with-sidebar",
  sections: [
    { title: "Content", fields: ["title", "content"] }
  ],
  sidebar: {
    position: "right",
    width: "320px",
    fields: ["status", "publishedAt"]
  }
}
```

### Tabs

```typescript
edit: {
  tabs: [
    {
      id: "content",
      label: "Content",
      fields: ["title", "content"]
    },
    {
      id: "meta",
      label: "Metadata",
      fields: ["seo", "tags", "category"]
    }
  ]
}
```

### Localization (i18n)

```typescript
app: {
  locales: {
    default: "en",
    available: ["en", "sk", "de"]
  }
},
collections: {
  posts: {
    fields: {
      title: { type: "text", localized: true },
      content: { type: "richText", localized: true }
    }
  }
}
```

### Relation Fields

Automatic relation field support with create/edit capabilities:

Display label uses the target record’s `_title`.

```typescript
fields: {
  // Single relation (one-to-one) - explicit config
  barberId: {
    label: "Barber",
    relation: {
      targetCollection: "barbers",  // Required target collection
      mode: "inline"                // or "picker" or "create"
    }
  },

  // Multiple relations (one-to-many, many-to-many)
  tags: {
    relation: {
      targetCollection: "tags",
      mode: "picker",              // Enables multi-select
      orderable: true,             // Enable drag-and-drop reordering

      // Filter options based on current form values
      filter: (values) => ({
        where: { type: { eq: values.postType } }
      })
    }
  }
}
```

**Features:**
- ✅ **Plus button** - Create new related item (opens side sheet)
- ✅ **Edit button** - Modify selected item (opens side sheet)
- ✅ **Auto-complete** - Search and filter options
- ✅ **Drag-and-drop** - Reorder multiple relations (when `orderable: true`)
- ✅ **Conditional filtering** - Filter options based on form state

### Rich Text Editor (Tiptap)

Built-in rich text editing with toolbar controls:

```typescript
fields: {
  content: {
    type: "richText",
    placeholder: "Start writing...",
    richText: {
      outputFormat: "html", // "json" (default) or "markdown"
      enableImages: true,
      showCharacterCount: true,
      maxCharacters: 10000,
      features: {
        slashCommands: true,
        tableControls: true,
        bubbleMenu: true
      },
      onImageUpload: async (file) => {
        // Return a public URL after upload
        return await uploadImage(file)
      }
    }
  }
}
```

Note: Markdown output requires a Markdown extension in the `extensions` array.
Slash commands, table tools, and the bubble menu can be toggled via `features`.

### Embedded Collections

```typescript
fields: {
  gallery: {
    embedded: {
      collection: "post_images",
      orderable: true,  // Drag-and-drop reordering
      mode: "inline",   // or "modal" or "drawer"
      rowLabel: (item) => item.caption || item.id
    }
  }
}
```

### Array Fields

```typescript
fields: {
  tags: {
    type: "array",
    label: "Tags",
    array: {
      itemType: "text",
      orderable: true,
      maxItems: 10
    }
  },

  ratings: {
    type: "array",
    label: "Ratings",
    array: {
      itemType: "number",
      minItems: 1
    }
  }
}
```

### Version History & Audit Logging

Track all changes to collection items with built-in versioning:

```typescript
collections: {
  posts: {
    // Enable versioning for this collection
    versioned: true,

    // Configure audit logging
    auditLog: {
      fields: ["title", "content", "status"],  // Fields to track
      trackUser: true,                         // Track who made changes
      retentionDays: 365                       // Keep logs for 1 year
    },

    edit: {
      // Show version history in edit form
      showVersionHistory: true
    }
  }
}
```

**Features:**
- ✅ **Version tracking** - Every change creates a new version
- ✅ **Change history** - See what changed, when, and by whom
- ✅ **Diff view** - Compare old vs new values
- ✅ **Restore versions** - Roll back to previous versions
- ✅ **User tracking** - Know who made each change
- ✅ **Configurable retention** - Control how long to keep history

### Tree Views (Coming Soon)

```typescript
list: {
  view: "tree",  // Enable tree view
  tree: {
    parentField: "parentId",
    labelField: "name",
    collapsible: true
  }
}
```

## 🧩 Component Registry

Override default field components:

```typescript
import { RichTextEditor } from './components/RichTextEditor'
import { ImagePicker } from './components/ImagePicker'

<AdminApp
  client={cmsClient}
  config={adminConfig}
  registry={{
    fields: {
      richText: RichTextEditor,
      image: ImagePicker
    }
  }}
  router={{ ... }}
/>
```

## 📦 Package Exports

```typescript
// Main component
import { AdminApp } from '@questpie/admin'

// Config helper
import { defineAdminConfig } from '@questpie/admin/config'

// Hooks
import { AdminProvider, useCollection } from '@questpie/admin/hooks'

// Components
import {
  CollectionList,
  CollectionForm,
  RelationSelect,
  RelationPicker,
  VersionHistory
} from '@questpie/admin/components'

// Utilities
import { cn } from '@questpie/admin/utils'

// Styles
import '@questpie/admin/styles'
```

## 🎨 Styling

Complete shadcn/ui setup with Tailwind CSS v4:
- 53+ pre-built components (base-lyra style)
- Light/dark theme support
- oklch color space
- Customizable via Tailwind tokens

## 📚 Examples

See [tanstack-barbershop](../../examples/tanstack-barbershop) for complete example.

## 🚀 Roadmap

- [ ] Schema introspection (auto field type inference) - not planned
- [x] Conditional visibility/readonly/disabled
- [x] Sections organization
- [x] Advanced layouts (columns, grid, inline, sidebar)
- [x] Component registry
- [x] Relation fields (RelationSelect, RelationPicker)
- [x] Version history & audit logging
- [x] Embedded collections (inline, modal, drawer)
- [x] Array fields
- [x] Tabs layout
- [ ] Tree views (hierarchical data)
- [ ] Bulk actions
- [ ] Saved views/filters
- [ ] Custom dashboard
- [ ] Permissions UI

## 📝 License

MIT
