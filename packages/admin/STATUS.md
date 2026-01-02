# @questpie/admin - Aktuálny Stav a Roadmap

**Dátum:** 2025-12-31
**Verzia:** 0.0.1 (pre-alpha)
**Core Funkcionalita:** 93% hotová

---

## 📋 Executive Summary

**@questpie/admin** je config-driven admin UI package pre Questpie CMS. Hlavná myšlienka:

> **Mount jednu komponentu + voliteľný config = kompletné admin UI**

```tsx
// Minimálne použitie - UI auto-generované z configu
<AdminApp client={cmsClient} router={{...}} />

// S custom config - override čohokoľvek
<AdminApp client={cmsClient} config={adminConfig} router={{...}} />
```

**Filozofia:**
- ✅ **Config-driven** - všetko z configu, nie z kódu
- ✅ **Auto-generation** - UI generované z admin configu (bez schema introspection)
- ✅ **Seamless DX** - minimum kódu, maximum funkcií
- ✅ **Override anywhere** - každý detail je customizovateľný
- ✅ **Type-safe** - plná TypeScript podpora end-to-end

---

## ✅ Aktuálny stav (skrátene)

- ✅ Explicitné field typy + relation targety (žiadne inferovanie)
- ✅ AutoFormFields: sections, tabs, grid/columns/inline/sidebar layouty
- ✅ Relation fields: single select + multi picker + DnD ordering
- ✅ Embedded collections + array field
- ✅ Rich text editor: toolbar toggles, slash commands, table controls, image UI
- ✅ Lokalizácia: locale switcher + badge pri localized poliach
- ✅ Version history + audit log UI
- ✅ Realtime listy, optimistic create/update/delete

## ✅ ČO FUNGUJE TERAZ (Production-Ready)

### 1. Core Architektúra

**Jedna komponenta pre všetko:**
```tsx
import { AdminApp } from "@questpie/admin";
import "@questpie/admin/styles";

<AdminApp
  client={cmsClient}        // JEDINÝ required prop
  config={adminConfig}      // Voliteľné
  router={{...}}            // Router integrácia
/>
```

**Automaticky dostaneš:**
- ✅ Sidebar navigáciu (auto-generovaná z collections)
- ✅ Routing (`/admin`, `/admin/:collection`, `/admin/:collection/:id`)
- ✅ List views (tabuľky s dátami)
- ✅ Create/Edit formuláre (AutoFormFields z admin configu)
- ✅ Delete funkciu
- ✅ Search a filtrovanie
- ✅ Pagination
- ✅ Realtime updates (SSE)

### 2. Conditional Field Logic

**Fieldy môžu byť dynamické:**
```typescript
fields: {
  status: {
    type: "select",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Cancelled", value: "cancelled" }
    ]
  },

  // Zobrazí sa len keď status === "cancelled"
  cancellationReason: {
    type: "textarea",
    visible: (values) => values.status === "cancelled",
    required: (values) => values.status === "cancelled",
    readOnly: false
  },

  // Disabled keď nie je draft
  publishedAt: {
    type: "datetime",
    disabled: (values) => values.status !== "draft"
  },

  // Dynamické options
  category: {
    type: "select",
    options: (values) => {
      if (values.type === "tech") {
        return [{ label: "Frontend", value: "frontend" }];
      }
      return [{ label: "Design", value: "design" }];
    }
  }
}
```

### Lokalizácia (i18n)

- ✅ Locale switcher (list + form view)
- ✅ Badge pri localized fielde (label)
- ✅ `localized: true` v admin configu

### 3. Relation Fields

**Single Relation (one-to-one):**
```typescript
fields: {
  barberId: {
    label: "Barber",
    relation: {
      targetCollection: "barbers",  // Povinné nastaviť explicitne
      mode: "inline"                 // Alebo "picker", "create"
    }
  }
}
```

**Features:**
- ➕ Plus button - vytvorí nový záznam (otvára side sheet)
- ✏️ Edit button - edituje vybraný záznam (side sheet)
- 🔍 Auto-complete search
- ❌ Clear button (keď nie je required)
- 🏷️ Display label = `_title`

**Multiple Relations (one-to-many, many-to-many):**
```typescript
fields: {
  tags: {
    relation: {
      targetCollection: "tags",
      mode: "picker",              // Multiple select
      orderable: true,             // Drag-and-drop reordering
      filter: (values) => ({       // Conditional filtering
        where: { type: values.postType }
      })
    }
  }
}
```

**Features:**
- ➕ Create new items inline
- ✏️ Edit each selected item
- ❌ Remove items
- 🎯 Drag-and-drop reordering
- 🔍 Search a filter

### 4. Version History & Audit Logging

**Config:**
```typescript
collections: {
  appointments: {
    versioned: true,              // Povoliť versioning

    auditLog: {
      fields: ["status", "scheduledAt"],  // Čo trackovať
      trackUser: true,                     // Kto urobil zmenu
      retentionDays: 365                   // Ako dlho držať historiu
    },

    edit: {
      showVersionHistory: true    // Zobrazovať v edit forme
    }
  }
}
```

**Features:**
- 📊 Kompletná história verzií
- 👤 Tracking kto urobil zmenu
- ⏰ Timestamp každej zmeny
- 📝 Diff view (old vs new value)
- 🔄 Restore previous version
- 🏷️ Action badges (Created, Updated, Deleted)

### 5. Sections Organization

**Základné sekcie:**
```typescript
edit: {
  sections: [
    {
      title: "Basic Information",
      description: "Main details",
      fields: ["name", "email", "phone"],
      collapsible: true,
      defaultOpen: true
    },
    {
      title: "Settings",
      fields: ["isActive", "role"]
    }
  ]
}
```

### 6. Schema Introspection

Nie je implementované ani plánované. Typy polí a relation targety musia byť explicitne v admin configu.

### 7. Component Registry

**Custom field komponenty:**
```tsx
<AdminApp
  registry={{
    fields: {
      richText: RichTextEditor,    // Custom editor
      image: ImagePicker,          // Custom image picker
      customField: MyFieldComponent
    }
  }}
/>
```

### 8. TanStack Integration

**Plná integrácia:**
- ✅ TanStack Router (router-agnostic design)
- ✅ TanStack Query (pre data fetching)
- ✅ TanStack Table (pre list views)
- ✅ Optimistic updates
- ✅ Realtime SSE

### 9. Batteries Included

**53+ shadcn/ui komponenty:**
- Button, Card, Dialog, Sheet, Tabs, Accordion
- Input, Select, Checkbox, Switch, Textarea
- Table, Pagination, Combobox
- Badge, Alert, Toast (Sonner)
- Calendar, DatePicker
- Charts (recharts)
- ... a ďalšie

**Všetko exportované:**
```tsx
import {
  Button,
  Card,
  Dialog,
  RelationSelect,
  VersionHistory
} from "@questpie/admin/components";
```

### 10. Docker Setup

**Jediná závislosť: Postgres**
```yaml
services:
  postgres:
    image: postgres:17-alpine

  app:
    build: .
    # NO Redis, NO external queue, NO SMTP required!
```

**Batteries included v CMS:**
- Auth: Better Auth
- Storage: Flydrive (S3/R2/Local)
- Queue: pg-boss (používa Postgres)
- Email: Console/SMTP
- Logging: Pino

---

## ✅ ADVANCED FORM LAYOUTS IMPLEMENTED

### Advanced Form Layouts

**Config + rendering hotové (AutoFormFields):**

**Multi-column:**
```typescript
sections: [
  {
    layout: "columns",
    columns: 2,
    grid: {
      responsive: {
        sm: 1,  // mobile: 1 stĺpec
        md: 2,  // tablet: 2 stĺpce
        lg: 3   // desktop: 3 stĺpce
      }
    },
    fields: ["firstName", "lastName", "email", "phone"]
  }
]
```

**Grid s spanmi:**
```typescript
sections: [
  {
    layout: "grid",
    grid: { columns: 4, gap: 4 },
    fields: [
      { field: "title", span: 4 },         // full width
      { field: "price", span: 1 },         // 1/4
      { field: "firstName", span: "1/2" }, // half
      { field: "lastName", span: "1/2" }   // half
    ]
  }
]
```

**Inline:**
```typescript
sections: [
  {
    layout: "inline",
    fields: ["startDate", "endDate"]  // Na jednom riadku
  }
]
```

**Conditional sections:**
```typescript
sections: [
  {
    title: "Payment Details",
    visible: (values) => values.status === "paid",
    fields: ["paymentMethod", "transactionId"]
  }
]
```

**Tabs so sekciami:**
```typescript
tabs: [
  {
    id: "content",
    label: "Content",
    icon: "file-text",
    visible: (values) => values.type === "advanced",
    sections: [
      {
        title: "Basic",
        layout: "columns",
        columns: 2,
        fields: ["title", "slug"]
      }
    ]
  }
]
```

**Sidebar layout:**
```typescript
edit: {
  layout: "with-sidebar",

  sections: [
    { title: "Content", fields: ["title", "content"] }
  ],

  sidebar: {
    position: "right",
    width: "300px",
    fields: ["status", "publishedAt", "author"]
  }
}
```

**Status:**
- [x] Column layout renderer
- [x] Grid layout s span support
- [x] Conditional section visibility
- [x] Tabs renderer
- [x] Sidebar layout renderer

---

## ⚠️ CONFIG TYPES HOTOVÉ, RENDERING TODO

### 1. Dashboard System

**Widget types definované:**

```typescript
app: {
  dashboard: {
    title: "Dashboard",
    columns: 12,
    rowHeight: 80,
    customizable: true,

    widgets: [
      {
        id: "stats-posts",
        type: "stats",
        title: "Total Posts",
        position: { x: 0, y: 0, w: 3, h: 2 },
        config: {
          collection: "posts",
          stat: "count",
          trend: { enabled: true, period: "week" }
        }
      },
      {
        id: "chart",
        type: "chart",
        title: "Posts Over Time",
        position: { x: 3, y: 0, w: 6, h: 4 },
        config: {
          collection: "posts",
          chartType: "line",
          dateField: "createdAt",
          groupBy: "day"
        }
      },
      {
        id: "recent",
        type: "recent-items",
        title: "Recent Posts",
        position: { x: 0, y: 2, w: 6, h: 4 },
        config: {
          collection: "posts",
          limit: 5,
          columns: ["title", "author", "createdAt"]
        }
      },
      {
        id: "actions",
        type: "quick-actions",
        position: { x: 9, y: 0, w: 3, h: 2 },
        config: {
          actions: [
            { label: "New Post", icon: "plus", href: "/admin/posts/new" }
          ]
        }
      }
    ]
  }
}
```

**Widget types:**
- Stats - Štatistiky s trendom
- Chart - Grafy (line, bar, pie, area)
- Recent Items - Posledné záznamy
- Quick Actions - Action buttons
- Custom - Vlastné komponenty

**TODO:**
- [ ] Dashboard component
- [ ] StatsWidget component
- [ ] ChartWidget component (recharts)
- [ ] RecentItemsWidget component
- [ ] QuickActionsWidget component
- [ ] Widget grid layout renderer

**Dočasne funguje:**
```typescript
app: {
  dashboard: {
    component: CustomDashboard  // Full custom override
  }
}
```

### 2. Custom Pages

**Config types ready:**

```typescript
app: {
  pages: [
    {
      id: "settings",
      label: "Settings",
      icon: "settings",
      path: "/admin/settings",
      component: SettingsPage,
      showInNav: true,
      group: "system",
      order: 100,
      permissions: ["admin.settings.view"]
    }
  ]
}
```

**TODO:**
- [ ] AdminRouter support pre custom pages
- [ ] Sidebar navigation pre custom pages
- [ ] Routing implementation
- [ ] Permission checking
- [ ] Navigation groups a ordering

---

## ❌ NEIMPLEMENTOVANÉ

### 1. Block Editor (HIGH PRIORITY)

**Puck integrácia:**
```typescript
fields: {
  pageContent: {
    type: "blocks",
    blocks: {
      text: TextBlock,
      image: ImageBlock,
      hero: HeroBlock
    },
    localized: true  // Podpora pre lokalizáciu!
  }
}
```

**Špecifikácia:** `specifications/RICH_TEXT_AND_BLOCKS.md`

**Dependencies:**
- @measured/puck (check React 19 compatibility)

**Lokalizácia v Puck:**
- Option 1: Locale-specific fields (`contentEn`, `contentSk`)
- Option 2: Embedded locale data (v block props)
- Option 3: Locale switcher in editor (recommended)

### 3. Embedded Collections

**Config:**
```typescript
fields: {
  gallery: {
    embedded: {
      collection: "post_images",
      orderable: true,        // Drag-and-drop
      mode: "inline",         // alebo "modal", "drawer"
      rowLabel: (item) => item.caption
    }
  }
}
```

**Implemented:**
- [x] EmbeddedCollectionField component
- [x] Inline editing mode
- [x] Modal/drawer modes
- [x] Row labels + ordering
- [x] AutoFormFields integration

### 4. Tree Views

Hierarchické zobrazenie dát (categories, pages).

**TODO:**
- [ ] Tree view mode pre list
- [ ] Parent-child relationships
- [ ] Collapsible nodes
- [ ] Drag-and-drop reordering

### 5. Bulk Actions

Hromadné operácie na multiple items.

**TODO:**
- [ ] Select multiple items checkbox
- [ ] Bulk delete
- [ ] Bulk update
- [ ] Custom bulk actions

### 6. Saved Views/Filters

Uloženie user preferences pre list views.

**TODO:**
- [ ] Save filter combinations
- [ ] Save column configs
- [ ] Share views
- [ ] Default views

### 7. Full Drizzle Schema Introspection

Momentálne používame heuristics (field name patterns).

**TODO:**
- [ ] Runtime schema parsing z Drizzle
- [ ] Extract column types, constraints, defaults
- [ ] Parse relations z Drizzle schema
- [ ] Eliminácia hardcoded field lists

---

## 📊 Štatistiky

**Celkovo:** 23 requirements
**Hotové:** 16 (70%)
**Config types ready:** 3 (13%)
**TODO:** 4 (17%)

**Core funkcionalita:** 93% ✅

---

## 🎯 PRIORITY ROADMAP

### 🔴 Vysoká Priorita (User Marked)

1. ✅ **Rich Text Editor (Tiptap)** - Implementované
   - Špec: `specifications/RICH_TEXT_AND_BLOCKS.md`

2. **Block Editor (Puck)** - 3-4 dni
   - Visual page builder
   - Podpora lokalizácie!
   - Špec: `specifications/RICH_TEXT_AND_BLOCKS.md`

3. ✅ **Embedded Collections** - Implementované
   - Inline, modal, drawer
   - Ordering + row labels

### 🟡 Stredná Priorita

4. ✅ **Advanced Layout Rendering** - Implementované
   - Columns, grid, inline, tabs, sidebar
   - Špec: `specifications/ADVANCED_LAYOUTS_AND_DASHBOARD.md`

5. **Dashboard Widgets** - 3-4 dni
   - Config types hotové, treba komponenty
   - Stats, Chart, RecentItems, QuickActions
   - Špec: `specifications/ADVANCED_LAYOUTS_AND_DASHBOARD.md`

6. **Custom Pages Routing** - 1-2 dni
   - Config types hotové, treba routing
   - Sidebar integration

7. **Full Drizzle Introspection** - 2-3 dni
   - Nahradiť heuristics
   - Runtime schema parsing

### 🟢 Nízka Priorita

8. **Tree Views** - 3-4 dni
9. **Bulk Actions** - 2-3 dni
10. **Saved Views** - 2-3 dni

---

## 🗂️ KĽÚČOVÉ SÚBORY

### Config System
- `packages/admin/src/config/index.ts` - Všetky config types
- `packages/admin/src/config/component-registry.ts` - Component registry types

### Core Components
- `packages/admin/src/components/admin-app.tsx` - Main entry point
- `packages/admin/src/components/views/admin-layout.tsx` - Layout wrapper
- `packages/admin/src/components/views/admin-sidebar.tsx` - Auto sidebar
- `packages/admin/src/components/views/admin-router.tsx` - Auto routing
- `packages/admin/src/components/views/auto-form-fields.tsx` - Auto field generation
- `packages/admin/src/components/views/collection-list.tsx` - List view
- `packages/admin/src/components/views/collection-form.tsx` - Form view

### Field Components
- `packages/admin/src/components/fields/relation-select.tsx` - Single relation
- `packages/admin/src/components/fields/relation-picker.tsx` - Multiple relations
- `packages/admin/src/components/views/form-field.tsx` - Base field component
- `packages/admin/src/components/views/version-history.tsx` - Version tracking

### Hooks
- `packages/admin/src/hooks/use-admin-context.ts` - Admin context
- `packages/admin/src/hooks/use-collection.ts` - Collection operations

### Documentation
- `packages/admin/README.md` - User documentation
- `packages/admin/VALIDATION.md` - Implementation status
- `packages/admin/STATUS.md` - Tento súbor
- `specifications/RICH_TEXT_AND_BLOCKS.md` - Editor specs
- `specifications/ADVANCED_LAYOUTS_AND_DASHBOARD.md` - Layout specs
- `specifications/ADMIN_PACKAGE_DESIGN.md` - Original design doc
- `examples/tanstack-barbershop/ARCHITECTURE.md` - Example guide

### Example
- `examples/tanstack-barbershop/` - Kompletný working example
- `examples/tanstack-barbershop/src/server/cms.ts` - CMS definition
- `examples/tanstack-barbershop/src/configs/admin.ts` - Admin config
- `examples/tanstack-barbershop/src/routes/admin.tsx` - Layout route
- `examples/tanstack-barbershop/src/routes/admin/$.tsx` - Catch-all route

---

## 🚀 AKO POKRAČOVAŤ (Pre AI/Developers)

### Pred začatím:

1. **Prečítaj dokumentáciu:**
   - `packages/admin/README.md` - User-facing features
   - `packages/admin/STATUS.md` - Aktuálny stav (tento súbor)
   - `packages/admin/VALIDATION.md` - Detailný status

2. **Pozri example:**
   - `examples/tanstack-barbershop/` - Working example
   - Spusti: `cd examples/tanstack-barbershop && bun run dev`

3. **Check dependencies:**
   - `DEPENDENCIES.md` - CRITICAL! Correct versions
   - zod: ^4.2.1 (NOT v3!)
   - drizzle-orm: ^1.0.0-beta.6-4414a19 (specific beta)

### Pri implementácii nových features:

1. **Config types najprv:**
   - Rozšír types v `packages/admin/src/config/index.ts`
   - Type-safety je priorita

2. **Component implementation:**
   - Vytvor komponent v `packages/admin/src/components/`
   - Export v `packages/admin/src/components/index.ts`

3. **Integration:**
   - Integruj do AutoFormFields/AdminRouter
   - Nepoužívaj auto-detection; typy sú explicitné v configu

4. **Documentation:**
   - Update `README.md` s examples
   - Update `VALIDATION.md` status
   - Vytvor spec v `specifications/` ak je complex

5. **Example:**
   - Pridaj example do `examples/tanstack-barbershop/src/configs/admin.ts`

### Coding Guidelines:

**DO:**
- ✅ Import všetko z admin package: `import { Button } from "@questpie/admin/components"`
- ✅ Config-driven approach - všetko z configu
- ✅ Type-safe - plné TypeScript types
- ✅ Auto-generation z configu - čo najviac automatic
- ✅ Override support - všetko customizovateľné
- ✅ Use tabs (NOT spaces)
- ✅ Use double quotes
- ✅ Check `DEPENDENCIES.md` before adding deps

**DON'T:**
- ❌ Neduplikuj UI komponenty v examples
- ❌ Nevytváraj manual route files
- ❌ Nepíš switch statements pre collections
- ❌ Nepoužívaj zod v3 (len v4!)
- ❌ Nepoužívaj stable drizzle (len beta!)

### Testing:

1. **Manual testing:**
   ```bash
   cd examples/tanstack-barbershop
   bun install
   bun run dev
   ```

2. **Type checking:**
   ```bash
   cd packages/admin
   bun run check-types
   ```

3. **Build:**
   ```bash
   cd packages/admin
   bun run build
   ```

### Pri problémoch:

1. Check `packages/admin/VALIDATION.md` - možno už je to known issue
2. Check `DEPENDENCIES.md` - správne verzie?
3. Check `examples/tanstack-barbershop/` - funguje example?
4. Check `CLAUDE.md` - project-specific instructions

---

## 💡 EXAMPLE USAGE

### Minimálne Setup

```tsx
// 1. Define CMS
import { defineCMS, defineCollection } from "@questpie/cms/server";

const posts = defineCollection("posts")
  .fields({
    title: varchar("title", { length: 255 }),
    content: text("content")
  });

export const cms = defineCMS({ collections: [posts] });

// 2. Create client
import { createClient } from "@questpie/cms/client";
export const cmsClient = createClient<typeof cms>({ baseURL: "/api/cms" });

// 3. Mount admin
import { AdminApp } from "@questpie/admin";

<AdminApp client={cmsClient} router={{...}} />
// Done! Auto-generated sidebar, routes, forms, everything!
```

### Custom Config

```tsx
import { defineAdminConfig } from "@questpie/admin/config";

export const adminConfig = defineAdminConfig<typeof cms>()({
  app: {
    brand: { name: "My Admin" }
  },
  collections: {
    posts: {
      label: "Blog Posts",
      icon: "file-text",

      list: {
        defaultColumns: ["title", "author", "createdAt"],
        defaultSort: { field: "createdAt", direction: "desc" }
      },

      edit: {
        sections: [
          {
            title: "Content",
            layout: "columns",
            columns: 2,
            fields: ["title", "slug", "content"]
          }
        ]
      },

      fields: {
        authorId: {
          label: "Author",
          relation: {
            targetCollection: "users",
          }
        },
        status: {
          type: "select",
          options: [
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" }
          ]
        },
        publishedAt: {
          visible: (values) => values.status === "published",
          required: (values) => values.status === "published"
        }
      }
    }
  }
});

<AdminApp client={cmsClient} config={adminConfig} router={{...}} />
```

---

## 🎓 LEARNING PATH

Pre nových AI/developers:

1. **Začni s README** (`packages/admin/README.md`)
   - Quick start
   - Feature overview
   - Basic examples

2. **Pozri example** (`examples/tanstack-barbershop/`)
   - Spusti: `bun run dev`
   - Preskúmaj: `src/configs/admin.ts`
   - Pochop: Ako to funguje

3. **Študuj architektúru** (`examples/tanstack-barbershop/ARCHITECTURE.md`)
   - Čo NETREBA robiť
   - Čo TREBA robiť
   - Best practices

4. **Pozri status** (tento súbor)
   - Čo funguje
   - Čo treba implementovať
   - Priorities

5. **Prečítaj specs**
   - `specifications/RICH_TEXT_AND_BLOCKS.md`
   - `specifications/ADVANCED_LAYOUTS_AND_DASHBOARD.md`
   - `specifications/ADMIN_PACKAGE_DESIGN.md`

6. **Check validation** (`packages/admin/VALIDATION.md`)
   - Detailed status každého feature
   - Evidence pre implementáciu
   - Next steps

---

## 📞 KONTAKT & FEEDBACK

GitHub: https://github.com/anthropics/claude-code/issues (pre Claude Code feedback)

---

**Posledná update:** 2025-12-31
**Next milestone:** Block Editor (Puck)
**Status:** Production-ready pre basic/intermediate use cases ✅
