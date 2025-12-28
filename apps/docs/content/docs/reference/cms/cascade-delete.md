---
title: Cascade Delete
---

# Cascade Delete Strategies

QUESTPIE CMS provides two complementary approaches to cascade delete operations:

1. **Database-level constraints** (fast, no hooks)
2. **Application-level cascade** (slower, triggers hooks)

## Database-Level Constraints (Recommended for Performance)

Database foreign key constraints handle CASCADE/SET NULL/RESTRICT operations at the database layer using Drizzle's `.references()` method.

### Example

```typescript
import { collection } from "@questpie/cms/server";
import { uuid, text } from "drizzle-orm/pg-core";

const authors = defineCollection("authors")
  .fields({
    name: text("name").notNull(),
  })
  .build();

const posts = defineCollection("posts")
  .fields({
    title: text("title").notNull(),
    // DB constraint: when author is deleted, cascade delete posts
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.table.id, { onDelete: "cascade" }),
  })
  .build();
```

**When author is deleted:**
- ✅ PostgreSQL automatically deletes all related posts
- ✅ Fast (single query)
- ❌ **No hooks are triggered** on deleted posts

### Available DB Constraints

- `onDelete: "cascade"` - Delete related records
- `onDelete: "set null"` - Set FK to null (requires nullable field)
- `onDelete: "restrict"` - Prevent deletion if related records exist
- `onDelete: "no action"` - Default behavior

## Application-Level Cascade (For Hooks)

If you need `beforeDelete` or `afterDelete` hooks to run on cascade-deleted records, explicitly configure cascade in the relation definition.

### Example

```typescript
const authors = defineCollection("authors")
  .fields({
    name: text("name").notNull(),
  })
  .relations(({ many }) => ({
    // Explicitly enable application-level cascade
    posts: many("posts", {
      relationName: "author",
      onDelete: "cascade", // ← Triggers hooks on deleted posts
    }),
  }))
  .build();

const posts = defineCollection("posts")
  .fields({
    title: text("title").notNull(),
    authorId: uuid("author_id")
      .notNull()
      // DB constraint still recommended for data integrity
      .references(() => authors.table.id, { onDelete: "cascade" }),
  })
  .relations(({ table, one }) => ({
    author: one("authors", {
      fields: [table.authorId],
      references: ["id"],
      relationName: "author",
    }),
  }))
  .hooks({
    beforeDelete: async ({ data, context }) => {
      console.log(`Deleting post: ${data.title}`);
      // Cleanup related data, queue jobs, etc.
    },
  })
  .build();
```

**When author is deleted:**
- ✅ Finds all related posts
- ✅ Calls `beforeDelete` hook for each post
- ✅ Deletes each post individually
- ✅ Calls `afterDelete` hook for each post
- ❌ Slower (N+1 queries if many related records)

## Multi-Level Cascade

Application-level cascade works recursively through multiple levels:

```typescript
// authors -> posts -> comments

const authors = defineCollection("authors")
  .relations(({ many }) => ({
    posts: many("posts", { relationName: "author", onDelete: "cascade" }),
  }))
  .build();

const posts = defineCollection("posts")
  .relations(({ many }) => ({
    comments: many("comments", { relationName: "post", onDelete: "cascade" }),
  }))
  .build();

const comments = defineCollection("comments")
  .fields({
    postId: uuid("post_id").references(() => posts.table.id, { onDelete: "cascade" }),
  })
  .hooks({
    afterDelete: async ({ data, context }) => {
      // This hook runs when author is deleted!
      await context.queue.publish("comment:cleanup", { commentId: data.id });
    },
  })
  .build();
```

**When author is deleted:**
1. Author's posts are deleted (calls post hooks)
2. Each post's comments are deleted (calls comment hooks)
3. All hooks run in order

## Choosing the Right Strategy

### Use DB-Level Constraints When:
- ✅ You don't need hooks on deleted records
- ✅ Performance is critical
- ✅ Simple cleanup (no external services to notify)
- ✅ Data integrity is the primary concern

### Use Application-Level Cascade When:
- ✅ You need to run hooks on cascade-deleted records
- ✅ Need to notify external services (queues, webhooks)
- ✅ Complex cleanup logic (delete files, update caches, etc.)
- ✅ Auditing requirements (track all deletions)

### Hybrid Approach (Recommended)
Use **both** for maximum safety and flexibility:

```typescript
const posts = defineCollection("posts")
  .fields({
    authorId: uuid("author_id")
      .notNull()
      // DB constraint ensures data integrity even if app logic fails
      .references(() => authors.table.id, { onDelete: "cascade" }),
  })
  .relations(({ table, one }) => ({
    author: one("authors", {
      fields: [table.authorId],
      references: ["id"],
      relationName: "author",
    }),
  }))
  .build();

const authors = defineCollection("authors")
  .relations(({ many }) => ({
    // Application cascade triggers hooks
    posts: many("posts", {
      relationName: "author",
      onDelete: "cascade", // ← Ensures hooks run
    }),
  }))
  .build();
```

This gives you:
- **DB constraint** prevents orphaned records if application fails
- **Application cascade** triggers all hooks and cleanup logic

## Many-to-Many Cascade

For many-to-many relations, configure cascade on the junction table:

```typescript
const articles = defineCollection("articles").build();
const tags = defineCollection("tags").build();

const articleTagJunction = defineCollection("article_tag_junction")
  .fields({
    articleId: uuid("article_id")
      .references(() => articles.table.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .references(() => tags.table.id, { onDelete: "cascade" }),
  })
  .build();

const articlesWithRelation = defineCollection("articles")
  .relations(({ manyToMany }) => ({
    tags: manyToMany("tags", {
      through: "article_tag_junction",
      sourceField: "articleId",
      targetField: "tagId",
      onDelete: "cascade", // ← Deletes junction records when article deleted
    }),
  }))
  .build();
```

## Performance Considerations

**Database-level cascade:**
- Single DELETE query
- O(1) complexity regardless of number of related records
- Executes in ~1-10ms for thousands of records

**Application-level cascade:**
- N DELETE queries (one per related record)
- O(N) complexity where N = number of related records
- Executes in ~50ms-500ms+ depending on hooks and record count

**Recommendation:** Use application-level cascade selectively for collections where hooks are essential, and DB constraints everywhere else.
