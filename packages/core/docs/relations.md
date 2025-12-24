# Relations in QUESTPIE CMS

Complete guide to defining and using relations between collections.

## Table of Contents

- [Relation Types](#relation-types)
- [One-to-One / Many-to-One (BelongsTo)](#one-to-one--many-to-one-belongsto)
- [One-to-Many (HasMany)](#one-to-many-hasmany)
- [Many-to-Many](#many-to-many)
- [Polymorphic Relations](#polymorphic-relations)
- [Eager Loading](#eager-loading)
- [Aggregations](#aggregations)
- [Cascade Operations](#cascade-operations)
- [Nested Mutations](#nested-mutations)
- [Best Practices](#best-practices)

## Relation Types

QUESTPIE CMS supports four main relation types:

1. **`one`** - Many-to-One / One-to-One (BelongsTo)
2. **`many`** - One-to-Many (HasMany)
3. **`manyToMany`** - Many-to-Many through junction table
4. **`polymorphic`** - Relation that can point to multiple collection types

## One-to-One / Many-to-One (BelongsTo)

Use when **this collection holds the foreign key** pointing to another collection.

### Definition

```typescript
import { collection, fields } from "@questpie/core/server";
import { uuid } from "drizzle-orm/pg-core";

const posts = collection("posts")
	.fields({
		title: fields.text("title"),
		authorId: uuid("author_id").notNull(), // Foreign key
		categoryId: uuid("category_id"),
	})
	.relations((table, i18n, helpers) => ({
		// Many posts belong to one author
		author: helpers.one("users", {
			fields: [table.authorId],
			references: ["id"],
		}),

		// Many posts belong to one category
		category: helpers.one("categories", {
			fields: [table.categoryId],
			references: ["id"],
		}),
	}));
```

### Usage

```typescript
// Load post with author
const post = await posts.crud.findFirst({
	where: { id: postId },
	with: {
		author: true,
	},
}, context);

// post.author is a User object (or null)

// Partial field selection
const post = await posts.crud.findFirst({
	where: { id: postId },
	with: {
		author: {
			columns: { id: true, name: true, email: true },
		},
	},
}, context);
```

## One-to-Many (HasMany)

Use when **another collection holds the foreign key** pointing to this collection.

### Definition

```typescript
const users = collection("users")
	.fields({
		name: fields.text("name"),
		email: fields.text("email"),
	})
	.relations((table, i18n, helpers) => ({
		// One user has many posts
		posts: helpers.many("posts", {
			relationName: "author", // Links to the reverse relation in posts
		}),
	}));
```

**Important:** The `relationName` must match the relation name in the related collection that points back.

### Usage

```typescript
// Load user with all their posts
const user = await users.crud.findFirst({
	where: { id: userId },
	with: {
		posts: true,
	},
}, context);

// user.posts is an array of Post objects

// With filtering and ordering
const user = await users.crud.findFirst({
	where: { id: userId },
	with: {
		posts: {
			where: { published: true },
			orderBy: { createdAt: "desc" },
			limit: 10,
		},
	},
}, context);
```

## Many-to-Many

Use when **two collections are linked through a junction table**.

### Definition

```typescript
// Junction table
const postsTags = collection("posts_tags")
	.fields({
		postId: uuid("post_id").notNull(),
		tagId: uuid("tag_id").notNull(),
	})
	.indexes((table) => ({
		pk: primaryKey({ columns: [table.postId, table.tagId] }),
	}));

// Posts collection
const posts = collection("posts")
	.fields({
		title: fields.text("title"),
	})
	.relations((table, i18n, helpers) => ({
		tags: helpers.manyToMany("tags", {
			through: "posts_tags",        // Junction table name
			sourceField: "postId",         // FK in junction pointing to posts
			targetField: "tagId",          // FK in junction pointing to tags
		}),
	}));

// Tags collection
const tags = collection("tags")
	.fields({
		name: fields.text("name"),
	})
	.relations((table, i18n, helpers) => ({
		posts: helpers.manyToMany("posts", {
			through: "posts_tags",
			sourceField: "tagId",
			targetField: "postId",
		}),
	}));
```

### Usage

```typescript
// Load post with tags
const post = await posts.crud.findFirst({
	where: { id: postId },
	with: {
		tags: {
			orderBy: { name: "asc" },
			where: { active: true },
		},
	},
}, context);

// post.tags is an array of Tag objects

// Load tag with posts
const tag = await tags.crud.findFirst({
	where: { id: tagId },
	with: {
		posts: {
			limit: 20,
		},
	},
}, context);
```

## Eager Loading

Load relations with customized queries.

### Basic Loading

```typescript
const posts = await posts.crud.findMany({
	with: {
		author: true,      // Load full author
		category: true,    // Load full category
	},
}, context);
```

### Partial Fields

```typescript
const posts = await posts.crud.findMany({
	with: {
		author: {
			columns: { id: true, name: true },  // Only load specific fields
		},
	},
}, context);
```

### Nested Relations

```typescript
const posts = await posts.crud.findMany({
	with: {
		author: {
			with: {
				profile: true,  // Nested relation
			},
		},
		comments: {
			with: {
				author: true,   // Load comment authors
			},
			limit: 5,
		},
	},
}, context);
```

### Filtering Related Records

```typescript
const users = await users.crud.findMany({
	with: {
		posts: {
			where: {
				published: true,
				createdAt: { gte: new Date("2024-01-01") },
			},
			orderBy: { createdAt: "desc" },
			limit: 10,
		},
	},
}, context);
```

## Aggregations

Perform aggregate queries on relations without loading full data.

### Count Only

```typescript
const user = await users.crud.findFirst({
	where: { id: userId },
	with: {
		posts: {
			_count: true,  // Shorthand for counting
		},
	},
}, context);

// user.posts = { _count: 42 }
```

### Full Aggregations

```typescript
const user = await users.crud.findFirst({
	where: { id: userId },
	with: {
		posts: {
			_aggregate: {
				_count: true,
				_sum: { views: true },      // Sum of views
				_avg: { rating: true },     // Average rating
				_min: { createdAt: true },  // Earliest post
				_max: { createdAt: true },  // Latest post
			},
		},
	},
}, context);

// Result:
// user.posts = {
//   _count: 42,
//   _sum: { views: 15234 },
//   _avg: { rating: 4.2 },
//   _min: { createdAt: Date(...) },
//   _max: { createdAt: Date(...) }
// }
```

### Aggregation with Filtering

```typescript
const user = await users.crud.findFirst({
	where: { id: userId },
	with: {
		posts: {
			where: { published: true },  // Only count published posts
			_count: true,
		},
	},
}, context);
```

## Cascade Operations

Control what happens to related records when a parent is deleted.

### Cascade Delete

Automatically delete related records:

```typescript
const users = collection("users")
	.fields({ name: fields.text("name") })
	.relations((table, i18n, helpers) => ({
		posts: helpers.many("posts", {
			relationName: "author",
			onDelete: "cascade",  // Delete all posts when user is deleted
		}),
	}));

// When you delete a user, all their posts are automatically deleted
await users.crud.delete({ id: userId }, context);
```

### Set Null

Set foreign key to null instead of deleting:

```typescript
const users = collection("users")
	.fields({ name: fields.text("name") })
	.relations((table, i18n, helpers) => ({
		posts: helpers.many("posts", {
			relationName: "author",
			onDelete: "set null",  // Set authorId to null
		}),
	}));

// When you delete a user, posts.authorId is set to null
await users.crud.delete({ id: userId }, context);
```

### Restrict

Prevent deletion if related records exist:

```typescript
const users = collection("users")
	.fields({ name: fields.text("name") })
	.relations((table, i18n, helpers) => ({
		posts: helpers.many("posts", {
			relationName: "author",
			onDelete: "restrict",  // Throw error if posts exist
		}),
	}));

// This will throw an error if user has posts
await users.crud.delete({ id: userId }, context);
// Error: "Cannot delete: 5 related posts record(s) exist"
```

### Many-to-Many Cascade

For many-to-many relations, cascade deletes junction records:

```typescript
const posts = collection("posts")
	.relations((table, i18n, helpers) => ({
		tags: helpers.manyToMany("tags", {
			through: "posts_tags",
			sourceField: "postId",
			targetField: "tagId",
			onDelete: "cascade",  // Delete junction records
		}),
	}));

// When post is deleted, posts_tags entries are removed
await posts.crud.delete({ id: postId }, context);
```

## Polymorphic Relations

Use when **one collection can belong to multiple different collection types**.

### Definition

```typescript
import { collection, fields } from "@questpie/core/server";
import { uuid, text } from "drizzle-orm/pg-core";

// Comments can belong to either Posts or Products
const comments = collection("comments")
	.fields({
		text: fields.textarea("text"),
		commentableType: text("commentable_type").notNull(), // "posts" or "products"
		commentableId: uuid("commentable_id").notNull(),     // ID of the related record
	})
	.relations((table, i18n, helpers) => ({
		commentable: helpers.polymorphic({
			typeField: table.commentableType,
			idField: table.commentableId,
			collections: {
				posts: "posts",       // When type = "posts", load from posts collection
				products: "products", // When type = "products", load from products collection
			},
		}),
	}));
```

### Usage

```typescript
// Load comment with its parent (Post or Product)
const comment = await comments.crud.findFirst({
	where: { id: commentId },
	with: {
		commentable: true,
	},
}, context);

// comment.commentable will be either a Post or Product object
// depending on comment.commentableType

// Load all comments with their parents
const allComments = await comments.crud.findMany({
	with: {
		commentable: {
			// Can apply filters, though they apply to all types
			columns: { id: true, title: true, name: true },
		},
	},
}, context);
```

### Creating Polymorphic Records

```typescript
// Comment on a post
await comments.crud.create({
	text: "Great post!",
	commentableType: "posts",
	commentableId: postId,
}, context);

// Comment on a product
await comments.crud.create({
	text: "Love this product!",
	commentableType: "products",
	commentableId: productId,
}, context);
```

### Use Cases

Perfect for:
- **Comments** that can be on Posts, Products, Videos, etc.
- **Likes/Reactions** on different content types
- **Attachments** that can belong to different entities
- **Activity Logs** tracking changes across multiple collections
- **Tags/Labels** applicable to various content types

## Nested Mutations

Create related records in a single operation using **nested create, connect, and connectOrCreate** operations.

### Basic Nested Create

```typescript
// Create a user with posts in one operation
const user = await users.crud.create({
	name: "John Doe",
	email: "john@example.com",
	// Nested relation operations
	posts: {
		create: [
			{ title: "First Post", content: "..." },
			{ title: "Second Post", content: "..." },
		],
	},
}, context);

// Result: User created + 2 posts created (with authorId set automatically)
```

### Connect to Existing Records

```typescript
// Create a post and link to existing tags
const post = await posts.crud.create({
	title: "New Post",
	content: "...",
	tags: {
		connect: [
			{ id: tag1Id },
			{ id: tag2Id },
		],
	},
}, context);

// Result: Post created + junction records created linking to existing tags
```

### Connect or Create (Upsert Logic)

```typescript
// Create a post and connect to tag if exists, otherwise create it
const post = await posts.crud.create({
	title: "New Post",
	content: "...",
	tags: {
		connectOrCreate: [
			{
				where: { id: knownTagId },
				create: { name: "JavaScript" }, // Only used if tag doesn't exist
			},
		],
	},
}, context);
```

### Combined Operations

Mix create, connect, and connectOrCreate in a single call:

```typescript
const post = await posts.crud.create({
	title: "Advanced TypeScript Tips",
	content: "...",
	tags: {
		// Link existing tag
		connect: [{ id: existingTagId }],
		// Create new tags
		create: [
			{ name: "TypeScript" },
			{ name: "Advanced" },
		],
		// Create if doesn't exist
		connectOrCreate: [
			{
				where: { id: maybeExistingId },
				create: { name: "Tips" },
			},
		],
	},
}, context);
```

### One-to-Many Nested Mutations

```typescript
// Create user with profile and posts
const user = await users.crud.create({
	name: "Jane Doe",
	email: "jane@example.com",
	profile: {
		create: {
			bio: "Software engineer",
			avatar: "/images/avatar.jpg",
		},
	},
	posts: {
		create: [
			{
				title: "Introduction",
				content: "Hello world!",
				comments: {
					create: [
						{ text: "Welcome!", authorId: otherUserId },
					],
				},
			},
		],
	},
}, context);
```

### Many-to-Many Nested Mutations

```typescript
// Create post with new and existing tags
const post = await posts.crud.create({
	title: "Full-Stack Development",
	content: "...",
	tags: {
		// Link to existing tags
		connect: [
			{ id: frontendTagId },
			{ id: backendTagId },
		],
		// Create new tags
		create: [
			{ name: "Full-Stack" },
			{ name: "Web Development" },
		],
	},
	// Also create comments
	comments: {
		create: [
			{ text: "Great article!", authorId: userId1 },
		],
	},
}, context);

// Result:
// 1. Post created
// 2. 2 new tags created
// 3. 4 junction records created (2 existing + 2 new tags)
// 4. 1 comment created
```

### Transaction Safety

All nested mutations run in a **database transaction**:

```typescript
try {
	const result = await posts.crud.create({
		title: "Test",
		tags: {
			create: [{ name: "Tag1" }],
			connect: [{ id: "invalid-id" }], // This will fail
		},
	}, context);
} catch (error) {
	// Entire operation rolled back
	// No post created, no tag created, no junction records
}
```

### Supported Relations

| Relation Type   | Create | Connect | ConnectOrCreate | Notes                              |
| --------------- | ------ | ------- | --------------- | ---------------------------------- |
| **one**         | ❌      | ❌       | ❌               | Use direct FK assignment           |
| **many**        | ✅      | ✅       | ✅               | Creates records with FK set        |
| **manyToMany**  | ✅      | ✅       | ✅               | Creates records + junction entries |
| **polymorphic** | ❌      | ❌       | ❌               | Manual creation recommended        |

### Performance Considerations

- Each nested create/connect is a separate query
- All queries run in a single transaction
- Use batching for large numbers of related records
- Consider manual bulk operations for 100+ records

## Best Practices

### 1. Always Use `relationName` for Bidirectional Relations

```typescript
// posts.ts
const posts = collection("posts")
	.relations((table, i18n, helpers) => ({
		author: helpers.one("users", {
			fields: [table.authorId],
			references: ["id"],
			relationName: "posts",  // Links to users.posts
		}),
	}));

// users.ts
const users = collection("users")
	.relations((table, i18n, helpers) => ({
		posts: helpers.many("posts", {
			relationName: "author",  // Links to posts.author
		}),
	}));
```

### 2. Use Aggregations for Counts

Instead of loading all records to count them:

```typescript
// ❌ Bad - loads all posts
const user = await users.crud.findFirst({
	where: { id: userId },
	with: { posts: true },
}, context);
const postCount = user.posts.length;

// ✅ Good - uses SQL COUNT
const user = await users.crud.findFirst({
	where: { id: userId },
	with: { posts: { _count: true } },
}, context);
const postCount = user.posts._count;
```

### 3. Limit Related Records

Always use `limit` when loading has-many relations:

```typescript
const users = await users.crud.findMany({
	with: {
		posts: {
			limit: 10,           // Prevent loading thousands of posts
			orderBy: { createdAt: "desc" },
		},
	},
}, context);
```

### 4. Choose the Right Cascade Strategy

- **`cascade`** - Use when child records are meaningless without parent
- **`set null`** - Use when child records can exist independently
- **`restrict`** - Use when you want to prevent accidental data loss
- **`no action`** - Default, no automatic handling

### 5. Junction Table Naming

Use consistent naming for junction tables:

```typescript
// Format: {table1}_{table2} in alphabetical order
const postsTags = collection("posts_tags");  // Good
const tagsProducts = collection("tags_products");  // Good
const tag_post = collection("tag_post");     // Avoid
```

## Type Safety

All relations are fully type-safe:

```typescript
const post = await posts.crud.findFirst({
	where: { id: postId },
	with: {
		author: true,
		tags: true,
	},
}, context);

// TypeScript knows:
// - post.author is User | null
// - post.tags is Tag[]
// - All fields are properly typed
```

## Advanced Example

Complete example with multiple relation types:

```typescript
// Users
const users = collection("users")
	.fields({
		name: fields.text("name"),
		email: fields.text("email"),
	})
	.relations((table, i18n, helpers) => ({
		posts: helpers.many("posts", {
			relationName: "author",
			onDelete: "cascade",
		}),
		comments: helpers.many("comments", {
			relationName: "author",
			onDelete: "set null",
		}),
	}));

// Posts
const posts = collection("posts")
	.fields({
		title: fields.text("title"),
		authorId: uuid("author_id").notNull(),
	})
	.relations((table, i18n, helpers) => ({
		author: helpers.one("users", {
			fields: [table.authorId],
			references: ["id"],
			relationName: "posts",
		}),
		comments: helpers.many("comments", {
			relationName: "post",
		}),
		tags: helpers.manyToMany("tags", {
			through: "posts_tags",
			sourceField: "postId",
			targetField: "tagId",
			onDelete: "cascade",
		}),
	}));

// Usage
const post = await posts.crud.findFirst({
	where: { slug: "my-post" },
	with: {
		author: {
			columns: { id: true, name: true },
		},
		comments: {
			where: { approved: true },
			orderBy: { createdAt: "desc" },
			limit: 10,
			with: {
				author: {
					columns: { id: true, name: true },
				},
			},
		},
		tags: {
			orderBy: { name: "asc" },
		},
	},
}, context);
```

## Migration from Other Systems

### From Drizzle Relations

QUESTPIE relations are similar to Drizzle but with CMS-specific features:

```typescript
// Drizzle
relations(posts, ({ one, many }) => ({
	author: one(users, {
		fields: [posts.authorId],
		references: [users.id],
	}),
}));

// QUESTPIE
.relations((table, i18n, helpers) => ({
	author: helpers.one("users", {
		fields: [table.authorId],
		references: ["id"],
	}),
}))
```

### From Prisma

```prisma
// Prisma
model Post {
  author   User @relation(fields: [authorId], references: [id])
  authorId String
}
```

```typescript
// QUESTPIE
.fields({
	authorId: uuid("author_id").notNull(),
})
.relations((table, i18n, helpers) => ({
	author: helpers.one("users", {
		fields: [table.authorId],
		references: ["id"],
	}),
}))
```
