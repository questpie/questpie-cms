---
title: Globals
---

# Defining Globals

Globals are singleton content structures used for managing site-wide settings, navigation menus, or any other data where only one instance should exist. They share many features with Collections (localization, access control, hooks) but enforce a single record constraint.

## The Builder API

Use the `global` function to define a global singleton. Like collections, it offers a fluent, type-safe API.

```typescript
import { defineGlobal } from "@questpie/cms";
import { text, boolean, jsonb } from "drizzle-orm/pg-core";

export const siteSettings = defineGlobal("site_settings")
  .options({
    timestamps: true, // Adds createdAt, updatedAt
    versioning: true, // Enable revision history
  })
  .fields({
    siteName: text("site_name").notNull(),
    siteDescription: text("site_description"),
    maintenanceMode: boolean("maintenance_mode").default(false),
    socialLinks: jsonb("social_links").$type<{ twitter: string; github: string }>(),
  })
  .localized(["siteName", "siteDescription"]) // Move these to i18n table
  .access({
    read: true, // Publicly readable
    update: "admin", // Only admins can update
  });
```

## Localization

Globals support the same localization strategy as Collections. Fields marked with `.localized()` are automatically moved to a separate `_i18n` table.

```typescript
.localized(["siteName", "siteDescription"])
```

When querying, the CMS automatically resolves localized fields based on the request locale or falls back to the default locale.

## Access Control

Globals support `read` and `update` permissions. Since there is only one record, `create` and `delete` are not applicable in the traditional sense (the record is lazily created on the first update if it doesn't exist).

```typescript
.access({
  read: ({ user }) => true,
  update: ({ user }) => user?.role === 'admin' || user?.permissions.includes('manage_settings'),
})
```

## Hooks

Lifecycle hooks allow you to execute logic before or after operations.

```typescript
.hooks({
  afterUpdate: async ({ row, input, db, logger }) => {
    logger.info("Site settings updated", { updatedBy: user?.id });
    
    // Example: Clear cache
    // await kv.delete('site-settings');
  }
})
```

## Registration

Register your globals in the `CMS` config alongside collections.

```typescript
import { CMS } from "@questpie/cms";
import { siteSettings } from "./globals/site-settings";

export const cms = new CMS({
  collections: [ ... ],
  globals: [
    siteSettings
  ],
  // ... other config
});
```

## API

The CMS automatically generates REST endpoints for your globals:

*   `GET /api/cms/globals/:name`: Get the global settings object.
*   `POST /api/cms/globals/:name` or `PATCH`: Update the settings.
*   `GET /api/cms/globals/:name/versions`: List version history (if enabled).
*   `POST /api/cms/globals/:name/revert/:version`: Revert to a specific version.

## Type Inference

You can infer the TypeScript types for your globals directly from the definition:

```typescript
type SiteSettings = typeof siteSettings.$infer.select;
type UpdateSiteSettings = typeof siteSettings.$infer.update;
```
