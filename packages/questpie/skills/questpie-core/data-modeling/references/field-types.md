# Field Types Reference

Complete configuration options for every built-in QUESTPIE field type. All fields are accessed through the `f` builder inside `.fields(({ f }) => ({...}))`.

## Common Options (All Fields)

| Option | Type | Default | Description |
|---|---|---|---|
| `required` | `boolean` | `false` | Field must have a value |
| `default` | `T` | -- | Default value |
| `label` | `string \| Record<string, string>` | -- | Display label (supports i18n) |
| `description` | `string \| Record<string, string>` | -- | Help text |
| `localized` | `boolean` | `false` | Per-locale values |
| `input` | `"optional"` | -- | Optional in API input but required in DB (e.g., auto-generated slugs) |
| `meta` | `object` | -- | Admin UI rendering hints |
| `virtual` | `SQL` | -- | SQL expression for computed read-only field |

## `f.text(options?)`

Short strings, titles, slugs. DB type: `varchar` or `text`.

| Option | Type | Default | Description |
|---|---|---|---|
| `maxLength` | `number` | -- | Max string length (uses varchar when set) |
| `required` | `boolean` | `false` | Required field |
| `default` | `string` | -- | Default value |
| `localized` | `boolean` | `false` | Per-locale values |
| `input` | `"optional"` | -- | Optional in API input |
| `label` | `string \| i18n` | -- | Display label |
| `description` | `string \| i18n` | -- | Help text |
| `virtual` | `SQL` | -- | SQL computed value |

```ts
name: f.text({ required: true, maxLength: 255 }),
slug: f.text({ required: true, maxLength: 255, input: "optional" }),
```

## `f.textarea(options?)`

Long text, descriptions. DB type: `text`. Same options as `f.text()`. Renders as textarea in admin.

```ts
bio: f.textarea({ localized: true }),
description: f.textarea({ label: { en: "Description", sk: "Popis" } }),
```

## `f.richText(options?)`

Rich formatted content stored as HTML. DB type: `text`. Same options as `f.text()`. Renders as rich text editor in admin.

```ts
content: f.richText({ localized: true }),
body: f.richText({ required: true }),
```

## `f.email(options?)`

Email addresses with format validation. Same options as `f.text()`.

```ts
email: f.email({ required: true }),
contactEmail: f.email({ label: "Contact Email" }),
```

## `f.url(options?)`

URLs with format validation. Same options as `f.text()`.

```ts
website: f.url(),
profileUrl: f.url({ label: "Profile URL" }),
```

## `f.number(options?)`

Numeric values. DB type: `integer` or `numeric`.

| Option | Type | Default | Description |
|---|---|---|---|
| `required` | `boolean` | `false` | Required |
| `default` | `number` | -- | Default value |
| `min` | `number` | -- | Minimum value |
| `max` | `number` | -- | Maximum value |
| `label` | `string \| i18n` | -- | Display label |
| `description` | `string \| i18n` | -- | Help text |

```ts
price: f.number({ required: true, min: 0 }),
duration: f.number({ required: true, label: "Duration (minutes)" }),
sortOrder: f.number({ default: 0 }),
```

## `f.boolean(options?)`

Boolean flags. DB type: `boolean`.

| Option | Type | Default | Description |
|---|---|---|---|
| `required` | `boolean` | `false` | Required |
| `default` | `boolean` | -- | Default value |
| `label` | `string \| i18n` | -- | Display label |
| `description` | `string \| i18n` | -- | Help text |

```ts
isActive: f.boolean({ default: true, required: true }),
isFeatured: f.boolean({ default: false }),
```

Admin meta hint to render as switch:

```ts
isActive: f.boolean({
  default: true,
  meta: { admin: { displayAs: "switch" } },
}),
```

## `f.date(options?)`

Calendar dates. DB type: `date`.

| Option | Type | Default | Description |
|---|---|---|---|
| `required` | `boolean` | `false` | Required |
| `default` | `Date \| string` | -- | Default value |
| `label` | `string \| i18n` | -- | Display label |

```ts
publishedAt: f.date(),
birthDate: f.date({ required: true }),
```

## `f.time(options?)`

Time of day. DB type: `time`.

| Option | Type | Default | Description |
|---|---|---|---|
| `required` | `boolean` | `false` | Required |
| `default` | `string` | -- | Default value |
| `label` | `string \| i18n` | -- | Display label |

```ts
startTime: f.time({ label: "Start" }),
endTime: f.time({ label: "End" }),
```

## `f.datetime(options?)`

Date + time. DB type: `timestamp`.

| Option | Type | Default | Description |
|---|---|---|---|
| `required` | `boolean` | `false` | Required |
| `default` | `Date \| string` | -- | Default value |
| `label` | `string \| i18n` | -- | Display label |

```ts
scheduledAt: f.datetime({ required: true }),
expiresAt: f.datetime(),
```

## `f.select(options)`

Single value from a predefined list. DB type: `varchar`.

| Option | Type | Default | Description |
|---|---|---|---|
| `options` | `string[] \| { value, label }[]` | -- | Available choices (REQUIRED) |
| `required` | `boolean` | `false` | Required |
| `default` | `string` | -- | Default value |
| `label` | `string \| i18n` | -- | Display label |

Simple string options:

```ts
status: f.select({
  options: ["draft", "published", "archived"],
  default: "draft",
  required: true,
}),
```

Options with i18n labels:

```ts
status: f.select({
  options: [
    { value: "pending", label: { en: "Pending", sk: "Cakajuce" } },
    { value: "confirmed", label: { en: "Confirmed", sk: "Potvrdene" } },
    { value: "completed", label: { en: "Completed", sk: "Dokoncene" } },
  ],
  required: true,
  default: "pending",
}),
```

## `f.relation(options)`

Reference to another collection.

| Option | Type | Default | Description |
|---|---|---|---|
| `to` | `string` | -- | Target collection name (REQUIRED) |
| `required` | `boolean` | `false` | Required |
| `hasMany` | `boolean` | `false` | Has-many relation |
| `through` | `string` | -- | Junction collection (required with hasMany) |
| `sourceField` | `string` | -- | FK in junction -> this collection (required with through) |
| `targetField` | `string` | -- | FK in junction -> target collection (required with through) |
| `onDelete` | `"cascade" \| "set null" \| "restrict"` | -- | Foreign key behavior |
| `label` | `string \| i18n` | -- | Display label |

Belongs-to (single):

```ts
author: f.relation({ to: "users", required: true }),
category: f.relation({ to: "categories", onDelete: "set null" }),
```

Many-to-many (through junction):

```ts
tags: f.relation({
  to: "tags",
  hasMany: true,
  through: "postTags",
  sourceField: "post",
  targetField: "tag",
}),
```

Dynamic options (admin):

```ts
city: f.relation({
  to: "cities",
  options: {
    handler: async ({ data, search, ctx }) => {
      const cities = await ctx.db.query.cities.findMany({
        where: { countryId: data.country },
      });
      return { options: cities.map((c) => ({ value: c.id, label: c.name })) };
    },
    deps: ({ data }) => [data.country],
  },
}),
```

## `f.upload(options)`

File upload linked to a storage collection.

| Option | Type | Default | Description |
|---|---|---|---|
| `to` | `string` | -- | Upload/storage collection name (REQUIRED) |
| `mimeTypes` | `string[]` | -- | Allowed MIME types (e.g., `["image/*"]`) |
| `maxSize` | `number` | -- | Max file size in bytes |
| `label` | `string \| i18n` | -- | Display label |

```ts
avatar: f.upload({ to: "assets", mimeTypes: ["image/*"], maxSize: 5_000_000 }),
document: f.upload({ to: "assets", mimeTypes: ["application/pdf"] }),
cover: f.upload({ to: "assets" }),
```

## `f.object(options)`

Nested structured data stored as JSONB.

| Option | Type | Default | Description |
|---|---|---|---|
| `fields` | `Record \| () => Record` | -- | Nested field definitions (REQUIRED) |
| `default` | `object` | -- | Default value |
| `label` | `string \| i18n` | -- | Display label |

Plain object form:

```ts
address: f.object({
  fields: {
    street: f.text({ required: true }),
    city: f.text({ required: true }),
    zip: f.text(),
  },
}),
```

Function form (for helpers/reuse):

```ts
.fields(({ f }) => {
  const daySchedule = () => ({
    isOpen: f.boolean({ default: true }),
    start: f.time(),
    end: f.time(),
  });

  return {
    workingHours: f.object({
      fields: () => ({
        monday: f.object({ fields: daySchedule }),
        tuesday: f.object({ fields: daySchedule }),
      }),
    }),
  };
})
```

## `f.array(options)`

Repeatable items stored as JSONB.

| Option | Type | Default | Description |
|---|---|---|---|
| `of` | `Field` | -- | Item field type (REQUIRED) |
| `maxItems` | `number` | -- | Maximum number of items |
| `default` | `any[]` | -- | Default value |
| `localized` | `boolean` | `false` | Per-locale array |
| `label` | `string \| i18n` | -- | Display label |

Array of primitives:

```ts
tags: f.array({ of: f.text() }),
```

Array of objects:

```ts
socialLinks: f.array({
  of: f.object({
    fields: () => ({
      platform: f.select({ options: ["instagram", "facebook", "twitter"] }),
      url: f.url(),
    }),
  }),
  maxItems: 5,
}),
```

Localized array (each locale has its own array):

```ts
navigation: f.array({
  localized: true,
  of: f.object({
    fields: {
      label: f.text({ required: true }),
      href: f.text({ required: true }),
      isExternal: f.boolean({ default: false }),
    },
  }),
}),
```

Admin meta for ordering:

```ts
items: f.array({
  of: f.object({ fields: { name: f.text() } }),
  meta: { admin: { orderable: true, mode: "inline" } },
}),
```

## `f.blocks(options?)`

Content blocks for page builders. Stored as JSONB.

| Option | Type | Default | Description |
|---|---|---|---|
| `localized` | `boolean` | `false` | Per-locale blocks |
| `label` | `string \| i18n` | -- | Display label |

```ts
content: f.blocks({ localized: true }),
pageContent: f.blocks(),
```

## `f.json(options?)`

Raw JSON data. No schema validation.

```ts
metadata: f.json(),
rawConfig: f.json({ label: "Configuration" }),
```

## Admin Meta Options

The `meta.admin` object controls field rendering in the admin panel:

```ts
isActive: f.boolean({
  default: true,
  meta: { admin: { displayAs: "switch" } },
}),
slug: f.text({
  meta: { admin: { placeholder: "auto-generated" } },
}),
socialLinks: f.array({
  of: f.object({ fields: { url: f.url() } }),
  meta: { admin: { orderable: true, mode: "inline" } },
}),
```

## Reactive Field Behaviors

Fields support reactive behaviors in `meta.admin`:

| Behavior | Description |
|---|---|
| `hidden` | `({ data }) => boolean` -- conditionally hide |
| `readOnly` | `({ data }) => boolean` -- conditionally read-only |
| `disabled` | `({ data }) => boolean` -- conditionally disable |
| `compute` | `{ handler, deps, debounce }` -- auto-compute values |

All reactive handlers run server-side with access to `ctx.db`, `ctx.user`, `ctx.req`.
