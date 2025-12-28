---
title: Example Qs Usage
---

# Query String with `qs` - Examples

The QUESTPIE client and Hono adapter use `qs` for query string serialization, providing cleaner URLs and better support for nested objects.

## Benefits

- ✅ **Nested objects** - Clean syntax for complex filters
- ✅ **Arrays** - Proper array handling
- ✅ **URL-friendly** - No encoded JSON strings
- ✅ **Standard** - Used by Express, Axios, and many others

---

## Client Examples

### Basic Query

```typescript
// Client
const posts = await client.collections.posts.find({
  limit: 10,
  offset: 0
})

// URL: /api/cms/posts?limit=10&offset=0
```

### Nested Where Clause

```typescript
// Client
const posts = await client.collections.posts.find({
  where: {
    author: {
      name: 'John'
    },
    status: 'published'
  }
})

// With JSON.stringify (old way - ugly):
// /api/cms/posts?where=%7B%22author%22%3A%7B%22name%22%3A%22John%22%7D%7D

// With qs (new way - clean):
// /api/cms/posts?where[author][name]=John&where[status]=published
```

### Relations (with)

```typescript
// Client
const posts = await client.collections.posts.find({
  with: {
    author: true,
    comments: {
      limit: 5,
      orderBy: { createdAt: 'desc' }
    }
  }
})

// URL: /api/cms/posts?with[author]=true&with[comments][limit]=5&with[comments][orderBy][createdAt]=desc
```

### Complex Filters

```typescript
// Client
const products = await client.collections.products.find({
  where: {
    price: { gte: 100, lte: 500 },
    category: { in: ['electronics', 'computers'] },
    inStock: true
  },
  orderBy: [
    { price: 'asc' },
    { createdAt: 'desc' }
  ],
  limit: 20
})

// URL (formatted for readability):
// /api/cms/products?
//   where[price][gte]=100&
//   where[price][lte]=500&
//   where[category][in][0]=electronics&
//   where[category][in][1]=computers&
//   where[inStock]=true&
//   orderBy[0][price]=asc&
//   orderBy[1][createdAt]=desc&
//   limit=20
```

---

## Server Parsing

The Hono adapter automatically parses these query strings back to nested objects:

```typescript
// Hono adapter receives:
// ?where[user][id]=123&where[status]=active

// qs.parse() converts to:
{
  where: {
    user: { id: '123' },
    status: 'active'
  }
}

// Passed to CRUD:
const result = await crud.find({
  where: {
    user: { id: '123' },
    status: 'active'
  }
}, context)
```

---

## Array Formats

The client uses `arrayFormat: "brackets"` by default:

```typescript
// Client
const posts = await client.collections.posts.find({
  where: {
    id: { in: ['1', '2', '3'] }
  }
})

// URL: /api/cms/posts?where[id][in][0]=1&where[id][in][1]=2&where[id][in][2]=3
```

---

## Custom Configuration

If you need to customize `qs` behavior in your app:

```typescript
import { createQCMSClient } from '@questpie/client'
import qs from 'qs'

// Custom query string serialization
const customFetch: typeof fetch = async (url, options) => {
  // Intercept and modify query strings
  const modifiedUrl = url // your custom logic
  return fetch(modifiedUrl, options)
}

const client = createQCMSClient({
  baseURL: 'http://localhost:3000',
  fetch: customFetch
})
```

---

## Comparison: Before vs After

### Before (with JSON.stringify)

```typescript
// Client
const query = new URLSearchParams()
query.set('where', JSON.stringify({ user: { name: 'John' } }))
// URL: ?where=%7B%22user%22%3A%7B%22name%22%3A%22John%22%7D%7D

// Server
const where = JSON.parse(query.get('where')) // manual parsing
```

### After (with qs)

```typescript
// Client
const query = qs.stringify({ where: { user: { name: 'John' } } })
// URL: ?where[user][name]=John

// Server
const parsed = qs.parse(queryString)
// { where: { user: { name: 'John' } } } - automatic!
```

---

## Type Safety

The client maintains full type safety with `qs`:

```typescript
import { createQCMSClient } from '@questpie/client'
import type { cms } from './server'

const client = createQCMSClient<typeof cms>({
  baseURL: 'http://localhost:3000'
})

// ✅ Type-safe - knows posts collection structure
const posts = await client.collections.posts.find({
  where: {
    authorId: '123',  // ✅ typed
    status: 'published'  // ✅ typed
  },
  with: {
    author: true,  // ✅ knows posts has author relation
    comments: true  // ✅ knows posts has comments relation
  }
})
```
