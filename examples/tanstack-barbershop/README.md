# 💈 TanStack Barbershop Example

A complete barbershop booking system built with **QUESTPIE CMS** + **TanStack Start** + **@questpie/admin**.

## 🎯 What This Demonstrates

### QUESTPIE CMS Features
- ✅ **Collections with Relations** - Barbers, Services, Appointments, Reviews
- ✅ **Better Auth Integration** - Email/password authentication
- ✅ **Queue Jobs** - Background email notifications (pg-boss)
- ✅ **Hooks** - Lifecycle events (afterCreate, afterUpdate)
- ✅ **Type-Safe Client** - Full TypeScript inference

### @questpie/admin Package
- ✅ **CollectionList** - Pre-built table with TanStack Table
- ✅ **CollectionForm** - Pre-built forms with React Hook Form
- ✅ **TanStack DB** - Offline-first with optimistic updates
- ✅ **Realtime Sync** - SSE-based automatic synchronization
- ✅ **Complete shadcn UI** - 53+ components (base-lyra style)

### TanStack Start Integration
- ✅ **File-based routing** - Simple, intuitive structure
- ✅ **API routes** - `/api/cms/*` catch-all handler
- ✅ **Server functions** - Type-safe client/server communication
- ✅ **SSR ready** - Server-side rendering support

## 🚀 Quick Start

### Prerequisites

**ONLY Postgres is required!** Everything else is batteries-included:
- ✅ Auth (Better Auth)
- ✅ Storage (Flydrive - local filesystem)
- ✅ Queue (pg-boss - uses Postgres)
- ✅ Email (Console adapter - no SMTP needed)
- ✅ Logging (Pino)

### Using Docker (Recommended)

```bash
# Start everything with docker-compose
docker-compose up

# The app will be available at:
# - App: http://localhost:3000
# - Admin: http://localhost:3000/admin
```

### Local Development

```bash
# 1. Install dependencies
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env with your Postgres credentials

# 3. Run migrations (creates tables)
bun run db:migrate

# 4. Seed sample data (optional)
bun run db:seed

# 5. Start dev server
bun run dev

# Open http://localhost:3000
```

## 📁 Project Structure

```
src/
├── server/
│   └── cms.ts              # CMS configuration (collections, jobs, auth)
├── configs/
│   └── admin.ts            # ⭐ Admin UI config (everything auto-generated!)
├── lib/
│   └── cms-client.ts       # Type-safe CMS client
├── routes/
│   ├── api/
│   │   └── cms/
│   │       └── $.ts        # CMS API catch-all handler
│   ├── admin.tsx           # Admin layout (uses AdminLayout from package)
│   └── admin/
│       └── $.tsx           # Catch-all (uses AdminRouter from package)
└── components/             # Custom components (optional overrides)
```

### Key Files

**`src/configs/admin.ts`** - Single source of truth for admin UI:
```typescript
export const adminConfig = defineAdminConfig<AppCMS>()({
  app: {
    brand: { name: "Barbershop Admin" }
  },
  collections: {
    barbers: {
      label: "Barbers",
      list: { defaultColumns: ["name", "email", "phone", "isActive"] }
    }
  }
})
```

Everything else is **automatically generated** from this config!

## 🗄️ Database Schema

### Collections

**Barbers** (`barbers`)
- name, email, phone, bio, avatar
- isActive (boolean)
- workingHours (JSON)

**Services** (`services`)
- name, description
- duration (minutes)
- price (cents)
- isActive (boolean)

**Appointments** (`appointments`)
- customerId → questpie_users (Better Auth)
- barberId → barbers
- serviceId → services
- scheduledAt, status, notes
- cancelledAt, cancellationReason

**Reviews** (`reviews`)
- appointmentId → appointments
- customerId → questpie_users
- barberId → barbers
- rating (1-5), comment

## 🔧 Config-Driven Admin Panel

### Everything Auto-Generated from Config

The entire admin UI is generated from `src/configs/admin.ts`:

**What's automatic:**
- ✅ **Sidebar navigation** - from `config.collections`
- ✅ **List views** - columns from `list.defaultColumns`
- ✅ **Routing** - `/admin/:collection/:id` patterns
- ✅ **Relations** - auto-loaded from `list.with`
- ✅ **Realtime sync** - SSE enabled by default
- ✅ **Brand/Logo** - from `app.brand`

**Minimal config example:**
```typescript
export const adminConfig = defineAdminConfig<AppCMS>()({
  collections: {
    barbers: {
      label: "Barbers",  // That's it! Rest is auto-generated
    }
  }
})
```

**Customize what you need:**
```typescript
barbers: {
  label: "Barbers",
  icon: "user",
  list: {
    defaultColumns: ["name", "email", "phone", "isActive"],
    defaultSort: { field: "name", direction: "asc" },
    with: ["appointments"]  // Auto-load relations
  },
  fields: {
    name: { label: "Full Name" },  // Override field labels
    isActive: {
      list: { renderCell: "StatusBadge" }  // Custom cell renderer
    }
  }
}
```

### Auto-Generated Routes

**No manual route files needed!** All routes auto-generated:
- `/admin` → Dashboard
- `/admin/barbers` → List view
- `/admin/barbers/new` → Create form
- `/admin/barbers/:id` → Edit form

### Components from @questpie/admin Package

```tsx
// Admin layout - auto-generated from config
<AdminLayout config={adminConfig} LinkComponent={Link}>
  {/* Auto sidebar, header, footer */}
</AdminLayout>

// Admin router - auto-generates all CRUD views
<AdminRouter
  config={adminConfig}
  segments={segments}
  navigate={navigate}
/>

// Manual components (for custom overrides)
<CollectionList collection="barbers" columns={[...]} />
<CollectionForm collection="barbers">
  <FormField name="name" required />
</CollectionForm>
```

## 🔐 Authentication

Uses Better Auth with email/password:

```bash
# Register
POST /api/cms/auth/sign-up
{ "email": "user@example.com", "password": "secure123" }

# Login
POST /api/cms/auth/sign-in
{ "email": "user@example.com", "password": "secure123" }

# Get session
GET /api/cms/auth/get-session
```

## 📧 Background Jobs

Queue jobs are automatically set up with pg-boss (uses Postgres - no Redis needed!):

```typescript
// Jobs defined in cms.ts
- send-appointment-confirmation
- send-appointment-cancellation
- send-appointment-reminder

// Triggered via hooks
afterCreate: async ({ data }) => {
  await cms.queue['send-appointment-confirmation'].publish({
    appointmentId: data.id,
  })
}
```

To run workers (processes jobs):
```bash
bun run worker
```

## 🎨 Styling

Uses **@questpie/admin** package with:
- Tailwind CSS v4
- shadcn/ui components (base-lyra style)
- oklch color space
- Light/dark theme support

Customization:
```css
/* Override in src/styles.css */
@import '@questpie/admin/styles';

/* Your custom styles */
```

## 🧪 Testing

```bash
# Run tests
bun test

# Type check
bun run check-types

# Lint
bun run lint
```

## 🐳 Docker

### Build image
```bash
docker build -t tanstack-barbershop .
```

### Run with docker-compose
```bash
docker-compose up -d
```

### Environment variables
See `.env.example` for all available options.

## 📚 Learn More

- [QUESTPIE CMS Documentation](../../packages/core/docs/)
- [@questpie/admin Package](../../packages/admin/README.md)
- [TanStack Start Docs](https://tanstack.com/start)
- [Better Auth Docs](https://www.better-auth.com/)

## 🤝 Contributing

This example demonstrates best practices for:
- Collection definitions
- Relations and eager loading
- Background job processing
- Admin UI with pre-built components
- Docker deployment

Feel free to use this as a template for your own projects!

## 📝 License

MIT
