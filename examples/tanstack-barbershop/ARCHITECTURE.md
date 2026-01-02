# TanStack Barbershop Example - Architecture

## Overview

This is a **complete working example** of using the `@questpie/admin` package with TanStack Start.

## 🎯 Purpose

Demonstrates:
1. How to integrate `@questpie/admin` with TanStack Start
2. Config-driven admin UI with minimal code
3. Relation fields, versioning, conditional fields
4. Docker deployment with Postgres only

## 📦 Package Dependencies

### Admin UI
**ALL components come from `@questpie/admin` package:**

```typescript
import { AdminApp, AdminLayout, AdminRouter } from "@questpie/admin/components";
import { AdminProvider } from "@questpie/admin/hooks";
import { defineAdminConfig } from "@questpie/admin/config";
import "@questpie/admin/styles";
```

**DO NOT duplicate UI components!** The admin package already includes:
- 53+ shadcn/ui components
- All field components (RelationSelect, RelationPicker, etc.)
- All view components (CollectionList, CollectionForm, etc.)
- Version history, sidebar, layout, etc.

### Backend
```typescript
import { defineCMS, defineCollection } from "@questpie/cms/server";
import { createClient } from "@questpie/cms/client";
import { createTanStackQueryHooks } from "@questpie/tanstack-query";
```

## 📁 Directory Structure

```
examples/tanstack-barbershop/
├── src/
│   ├── configs/
│   │   └── admin.ts              # Admin UI configuration
│   ├── lib/
│   │   └── cms-client.ts         # CMS client setup
│   ├── routes/
│   │   ├── admin.tsx             # Admin layout route
│   │   ├── admin/
│   │   │   └── $.tsx             # Admin catch-all route (auto-routing)
│   │   └── api/
│   │       └── cms/
│   │           └── $.ts          # CMS API handler
│   └── server/
│       └── cms.ts                # CMS definition (collections, fields)
├── .env.example
├── docker-compose.yml
├── Dockerfile
└── package.json
```

**Note:** There is NO `src/components/` folder! All components come from `@questpie/admin`.

## 🔧 Key Files

### 1. CMS Definition (`src/server/cms.ts`)

Defines collections and fields using Drizzle ORM:

```typescript
import { defineCMS, defineCollection } from "@questpie/cms/server";
import { varchar, integer, uuid, timestamp, boolean } from "drizzle-orm/pg-core";

export const barbers = defineCollection("barbers")
  .fields({
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    bio: text("bio"),
    avatar: varchar("avatar", { length: 500 }),
    isActive: boolean("is_active").default(true),
  })
  .title((t) => t.name);

// More collections: services, appointments, reviews, customers...

export const cms = defineCMS({
  collections: [barbers, services, appointments, reviews, customers],
});

export type AppCMS = typeof cms;
```

### 2. Admin Config (`src/configs/admin.ts`)

Optional UI customization (everything auto-generated if not specified):

```typescript
import { defineAdminConfig } from "@questpie/admin/config";
import type { AppCMS } from "~/server/cms";

export const adminConfig = defineAdminConfig<AppCMS>()({
  app: {
    brand: { name: "Barbershop Admin" },
    debug: { showQueryDevtools: true }
  },
  collections: {
    appointments: {
      label: "Appointments",
      icon: "calendar",

      // Enable versioning
      versioned: true,
      auditLog: { trackUser: true },

      // List view
      list: {
        defaultColumns: ["scheduledAt", "barber", "service", "status"],
        defaultSort: { field: "scheduledAt", direction: "desc" },
        with: ["barber", "service", "customer"]
      },

      // Edit form
      edit: {
        showVersionHistory: true,
        sections: [
          { title: "Details", fields: ["customerId", "barberId", "serviceId"] },
          { title: "Status", fields: ["status", "notes"] }
        ]
      },

      // Field overrides
      fields: {
        barberId: {
          label: "Barber",
          relation: {
            targetCollection: "barbers",
            mode: "inline"
          }
        },
        // Conditional field
        cancellationReason: {
          visible: (values) => values.status === "cancelled",
          required: (values) => values.status === "cancelled"
        }
      }
    }
  }
});
```

### 3. Admin Routes

**Layout Route (`src/routes/admin.tsx`):**
```typescript
import { AdminProvider } from "@questpie/admin/hooks";
import { AdminLayout } from "@questpie/admin/components";
import "@questpie/admin/styles";

function AdminLayoutWrapper() {
  return (
    <AdminProvider client={cmsClient} queryClient={queryClient}>
      <AdminLayout config={adminConfig} activeRoute={location.pathname} LinkComponent={Link}>
        <Outlet />
      </AdminLayout>
    </AdminProvider>
  );
}
```

**Catch-all Route (`src/routes/admin/$.tsx`):**
```typescript
import { AdminRouter } from "@questpie/admin/components";

function AdminCatchAll() {
  const params = useParams();
  const segments = params._.split("/").filter(Boolean);

  return (
    <AdminRouter
      config={adminConfig}
      segments={segments}
      navigate={navigate}
    />
  );
}
```

**That's it!** No manual route files, no manual components.

### 4. API Handler (`src/routes/api/cms/$.ts`)

```typescript
import { createElysiaApp } from "@questpie/cms/server";
import { cms } from "~/server/cms";

const app = createElysiaApp({ cms });

export const GET = app.handle;
export const POST = app.handle;
export const PUT = app.handle;
export const DELETE = app.handle;
export const PATCH = app.handle;
```

## 🎨 Customization Points

### 1. Custom Dashboard

Override default dashboard:

```typescript
<AdminApp
  client={cmsClient}
  config={adminConfig}
  router={{
    ...routerProps,
    DashboardComponent: CustomDashboard  // Your custom component
  }}
/>
```

### 2. Custom Field Components

Register custom field types:

```typescript
<AdminApp
  client={cmsClient}
  config={adminConfig}
  registry={{
    fields: {
      richText: RichTextEditor,  // Custom component
      image: ImagePicker
    }
  }}
/>
```

### 3. Custom Cell Renderers

In config:

```typescript
fields: {
  status: {
    list: {
      renderCell: StatusBadge  // Custom component
    }
  }
}
```

## 🚫 What NOT to Do

### ❌ DON'T create duplicate UI components

```typescript
// ❌ WRONG - Don't create local components
import { Button } from "~/components/ui/button";

// ✅ CORRECT - Import from admin package
import { Button } from "@questpie/admin/components";
```

### ❌ DON'T create manual route files

```typescript
// ❌ WRONG - Don't create routes for each collection
// src/routes/admin/barbers/index.tsx
// src/routes/admin/barbers/$id.tsx
// src/routes/admin/services/index.tsx
// etc.

// ✅ CORRECT - Use single catch-all route
// src/routes/admin/$.tsx with AdminRouter
```

### ❌ DON'T manually render forms

```typescript
// ❌ WRONG - Don't manually create forms
function renderFormFields(collection) {
  switch (collection) {
    case "barbers": return <BarberForm />;
    case "services": return <ServiceForm />;
  }
}

// ✅ CORRECT - Use AutoFormFields from AdminRouter
// Forms auto-generated from config
```

## ✅ What TO Do

### ✅ Import all components from admin package

```typescript
import {
  AdminApp,
  AdminLayout,
  AdminRouter,
  Button,
  Card,
  Dialog,
  // ... all components
} from "@questpie/admin/components";
```

### ✅ Define everything in config

```typescript
export const adminConfig = defineAdminConfig<AppCMS>()({
  collections: {
    myCollection: {
      // All UI configuration here
    }
  }
});
```

### ✅ Extend with custom components when needed

```typescript
// Create custom components ONLY when needed
// e.g., custom dashboard, custom field types

function CustomDashboard() {
  // Use components from admin package
  const { Card, Button } = await import("@questpie/admin/components");

  return (
    <Card>
      <h1>My Dashboard</h1>
      <Button>Action</Button>
    </Card>
  );
}
```

## 🐳 Docker Deployment

The example includes Docker setup with **ONLY Postgres** required:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    # ...

  app:
    build: .
    depends_on: [postgres]
    # No Redis, no external queue, no SMTP server!
```

**Batteries included:**
- Auth: Better Auth (built-in)
- Storage: Flydrive with local/S3/R2
- Queue: pg-boss (uses Postgres)
- Email: Console/SMTP (configurable)
- Logging: Pino

## 📚 Learning Path

1. **Read** `src/server/cms.ts` - See how collections are defined
2. **Read** `src/configs/admin.ts` - See how UI is configured
3. **Read** `src/routes/admin.tsx` and `src/routes/admin/$.tsx` - See minimal routing
4. **Run** `bun run dev` - See it in action
5. **Modify** config - Add fields, change labels, add sections
6. **Observe** - UI auto-updates without touching components!

## 🎯 Key Takeaway

**The example demonstrates that you need ZERO manual components to build a full-featured admin UI.**

Everything is:
- ✅ Auto-generated from CMS schema
- ✅ Customizable via config
- ✅ Extendable with custom components when needed
- ✅ Type-safe end-to-end
