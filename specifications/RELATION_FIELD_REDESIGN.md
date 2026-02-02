# Relation Field Redesign Plan

## Overview

Redesign relation fields to use unified `f.relation()` API that:

- Replaces legacy `.relations()` method
- Replaces legacy `.fields({})` raw Drizzle columns overload
- Auto-generates Drizzle relations from field definitions
- Supports FK constraints with `onDelete`/`onUpdate`
- Maintains compatibility with existing CRUD APIs (connect, create, etc.)

## Current State (Legacy)

```ts
const posts = collection("posts")
  .fields({
    title: text("title").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.table.id, { onDelete: "cascade" }),
  })
  .relations(({ table, one, many }) => ({
    author: one("users", {
      fields: [table.authorId],
      references: ["id"],
    }),
    comments: many("comments", { relationName: "post" }),
  }));
```

## Target State (New)

```ts
const posts = collection("posts").fields((f) => ({
  title: f.text({ required: true }),
  author: f.relation({
    to: () => users,
    required: true,
    onDelete: "cascade",
  }),
  comments: f.relation({
    to: () => comments,
    hasMany: true,
    foreignKey: "postId",
    onDelete: "cascade",
  }),
}));
```

## Relation Types

### 1. BelongsTo (default)

Creates FK column on this table.

```ts
author: f.relation({
  to: () => users,
  required: true,
  onDelete: "cascade",
});
// Creates: column "authorId" with .references(() => users.table.id)
```

### 2. HasMany

No column - FK is on target table.

```ts
posts: f.relation({
  to: () => posts,
  hasMany: true,
  foreignKey: "authorId", // FK column on posts table
  onDelete: "cascade", // Application-level cascade (hooks)
});
```

### 3. ManyToMany

No column - uses junction table.

```ts
tags: f.relation({
  to: () => tags,
  hasMany: true,
  through: () => postTags,
  sourceField: "postId",
  targetField: "tagId",
});
```

### 4. Multiple (Inline Array)

Creates jsonb column with array of FKs.

```ts
images: f.relation({
  to: () => assets,
  multiple: true,
});
// Creates: jsonb column with array of asset IDs
```

### 5. Polymorphic (MorphTo)

Creates two columns: type + id.

```ts
subject: f.relation({
  to: {
    users: () => users,
    posts: () => posts,
  },
  required: true,
  onDelete: "cascade",
});
// Creates: columns "subjectType" + "subjectId"
```

### 6. Polymorphic Reverse (MorphMany)

No column - reverse lookup.

```ts
activities: f.relation({
  to: () => activities,
  hasMany: true,
  morphName: "subject",
  morphType: "users",
});
```

## Upload Field

Upload is a specialized relation to asset collections.

```ts
// Single upload - default assets
avatar: f.upload({ mimeTypes: ["image/*"] });

// Single upload - custom collection
document: f.upload({
  collection: () => documents,
  mimeTypes: ["application/pdf"],
});

// Multiple uploads
gallery: f.upload({
  collection: () => assets,
  multiple: true,
  mimeTypes: ["image/*"],
  maxItems: 20,
});
```

## RelationFieldConfig Interface

```ts
interface RelationFieldConfig extends BaseFieldConfig {
  // Target collection(s)
  to:
    | (() => CollectionBuilder<any>)
    | Record<string, () => CollectionBuilder<any>>;

  // Relation type modifiers
  hasMany?: boolean; // true = hasMany/manyToMany
  multiple?: boolean; // true = jsonb array of FKs

  // Foreign key config (for hasMany - on target side)
  foreignKey?: string;

  // Junction table (for manyToMany)
  through?: () => CollectionBuilder<any>;
  sourceField?: string;
  targetField?: string;

  // Polymorphic reverse
  morphName?: string;
  morphType?: string;

  // Referential actions
  onDelete?: "cascade" | "set null" | "restrict" | "no action";
  onUpdate?: "cascade" | "set null" | "restrict" | "no action";

  // Drizzle relation config
  relationName?: string;

  // Query defaults
  orderBy?: Record<string, "asc" | "desc">;
  limit?: number;
  where?: Record<string, unknown>;
}
```

## Type Inference Rules

| Condition                                         | Inferred Type | Creates Column                 |
| ------------------------------------------------- | ------------- | ------------------------------ |
| `to: () => collection`                            | belongsTo     | ✅ `{field}Id`                 |
| `to: () => collection` + `hasMany` + `foreignKey` | hasMany       | ❌                             |
| `to: () => collection` + `hasMany` + `through`    | manyToMany    | ❌                             |
| `to: () => collection` + `multiple`               | multiple      | ✅ jsonb                       |
| `to: { type: () => collection, ... }`             | morphTo       | ✅ `{field}Type` + `{field}Id` |
| `to: () => collection` + `hasMany` + `morphName`  | morphMany     | ❌                             |

## Column Naming Convention

- BelongsTo: `{fieldName}Id` (e.g., `author` → `authorId`)
- MorphTo: `{fieldName}Type` + `{fieldName}Id`
- Multiple: `{fieldName}` as jsonb
- HasMany/ManyToMany: no column

## Auto-Generated Drizzle Relations

System automatically generates Drizzle relations from field definitions:

```ts
// From field definitions:
author: f.relation({ to: () => users, required: true });
comments: f.relation({
  to: () => comments,
  hasMany: true,
  foreignKey: "postId",
});

// Auto-generates:
relations(postsTable, ({ one, many }) => ({
  author: one(usersTable, {
    fields: [postsTable.authorId],
    references: [usersTable.id],
  }),
  comments: many(commentsTable),
}));
```

## CRUD API Compatibility

All existing CRUD operations work unchanged:

```ts
// Create with nested relations
await cms.api.collections.posts.create({
  title: "Post",
  author: { connect: { id: "user-id" } },
  tags: { create: [{ name: "Tech" }] },
});

// Query with relations
await cms.api.collections.posts.findOne({
  where: { id },
  with: { author: true, comments: { with: { replies: true } } },
});

// Filter by relation
await cms.api.collections.posts.find({
  where: { author: { name: "John" } },
});

// Plain array of IDs for manyToMany
await cms.api.collections.posts.updateById({
  id,
  data: { tags: ["tag-id-1", "tag-id-2"] },
});
```

## Implementation Steps

### Phase 1: Core Relation Field

1. Rewrite `fields/builtin/relation.ts`:
   - New `RelationFieldConfig` interface
   - `toColumn()` - creates FK column with `.references()` for belongsTo
   - `toColumn()` - creates jsonb for multiple
   - `toColumn()` - creates type+id columns for morphTo
   - `getMetadata()` - returns relation metadata for CRUD

2. Update `fields/types.ts`:
   - Update `RelationFieldMetadata` for new config

3. Update `fields/builtin/defaults.ts`:
   - Remove `polymorphicRelation` (merged into `relation`)

### Phase 2: Collection Builder Integration

4. Update `collection/builder/collection-builder.ts`:
   - Auto-generate Drizzle relations from fieldDefinitions
   - Remove legacy `.fields({})` overload
   - Remove/deprecate `.relations()` method

5. Update `collection/builder/collection.ts`:
   - Build Drizzle relations from field metadata
   - Extract relation config for CRUD operations

### Phase 3: Upload Field Update

6. Update `fields/builtin/upload.ts`:
   - Add `collection` parameter for custom asset collections
   - Use relation field logic internally

### Phase 4: Test Migration

7. Migrate `test/collection/collection-relations.test.ts`:
   - Replace raw Drizzle columns with `f.relation()`
   - Remove `.relations()` calls

8. Migrate `test/collection/collection-upload.test.ts`:
   - Update to new syntax

9. Run all tests and fix issues

### Phase 5: Cleanup

10. Remove deprecated code:
    - `fields/builtin/polymorphic-relation.ts`
    - Legacy `.fields({})` overload
    - `.relations()` method

## Files to Modify

| File                                           | Changes                                |
| ---------------------------------------------- | -------------------------------------- |
| `fields/builtin/relation.ts`                   | Complete rewrite                       |
| `fields/builtin/upload.ts`                     | Add `collection` parameter             |
| `fields/builtin/polymorphic-relation.ts`       | DELETE                                 |
| `fields/builtin/defaults.ts`                   | Remove polymorphicRelation             |
| `fields/builtin/index.ts`                      | Remove polymorphicRelation export      |
| `fields/types.ts`                              | Update RelationFieldMetadata           |
| `collection/builder/collection-builder.ts`     | Auto-generate relations, remove legacy |
| `collection/builder/collection.ts`             | Build relations from field metadata    |
| `collection/builder/types.ts`                  | Update RelationConfig if needed        |
| `test/collection/collection-relations.test.ts` | Migrate to new syntax                  |
| `test/collection/collection-upload.test.ts`    | Migrate to new syntax                  |

## Success Criteria

- [ ] All existing tests pass with new syntax
- [ ] `f.relation()` supports all relation types
- [ ] FK constraints work correctly
- [ ] CRUD operations (connect, create, etc.) work unchanged
- [ ] `with` queries work unchanged
- [ ] Filtering by relations works unchanged
- [ ] No `.relations()` calls in codebase
- [ ] No raw Drizzle columns in `.fields()`
