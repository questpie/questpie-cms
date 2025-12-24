# defining Collections

Collections are the heart of QUESTPIE CMS. They define your database schema, API endpoints, and admin UI structure.

## The Builder API

We use a fluent API to define collections. This ensures complete type safety across your application.

```typescript
import { collection, fields } from "@questpie/core";

export const posts = collection("posts")
  .options({
    timestamps: true, // Adds createdAt, updatedAt
  })
  .fields({
    title: fields.text("title").notNull(),
    slug: fields.text("slug").unique().notNull(),
    content: fields.richText("content"),
    isPublished: fields.checkbox("is_published"),
    
    // Relations
    authorId: fields.text("author_id").notNull(),
    
    // Assets
    coverImage: fields.image("cover_image"),
  })
  .title(t => t.title) // Used for display in Admin UI
  .indexes((t) => [
    // Drizzle index definitions
  ]);
```

## Available Fields

We provide a set of opinionated field helpers in `fields`:

*   `text(name)`: Short text (varchar 255).
*   `textarea(name)`: Long text.
*   `richText(name)`: JSON storage for rich text editors.
*   `number(name)`: Integer.
*   `checkbox(name)`: Boolean.
*   `timestamp(name)`: Date/Time.
*   `image(name)`: Single image (JSON with key/url).
*   `file(name)`: Single file (JSON with key/url/mime).
*   `gallery(name)`: Array of images.

## Hooks

You can define lifecycle hooks to execute logic during CRUD operations.

```typescript
.hooks({
  afterCreate: async ({ data, context }) => {
    // Access services from context
    await context.queue.publish('send-notification', { postId: data.id });
    
    // Log action
    context.logger.info('Post created', { id: data.id });
  }
})
```

## Access Control

Define granular permissions based on the current user.

```typescript
.access({
  read: ({ user }) => true, // Public
  create: ({ user }) => user?.role === 'admin',
  update: ({ user, data }) => user?.id === data.authorId,
})
```
