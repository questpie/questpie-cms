# Admin Hooks - TanStack DB Integration

Admin hooks sú postavené na **TanStack DB Collections** pre offline-first, realtime data management.

## Výhody TanStack DB

✅ **Offline-first** - Data sú dostupné aj bez pripojenia
✅ **Optimistic updates** - Okamžitá UI odozva
✅ **Realtime sync** - Automatická synchronizácia cez SSE
✅ **Better DX** - Jednoduchšie API než query/mutation hooks
✅ **Built-in caching** - Inteligentné cache management

## Basic Usage

### 1. Setup AdminProvider

```tsx
import { AdminProvider } from '@questpie/admin/hooks'
import { createQCMSClient } from '@questpie/cms/client'
import { QueryClient } from '@tanstack/react-query'
import type { cms } from './server/cms'

const client = createQCMSClient<typeof cms>({
  baseURL: 'http://localhost:3000'
})

const queryClient = new QueryClient()

function App() {
  return (
    <AdminProvider client={client} queryClient={queryClient}>
      <YourAdminApp />
    </AdminProvider>
  )
}
```

### 2. Use Collection Hook

```tsx
import { useCollection } from '@questpie/admin/hooks'
import type { cms } from './server/cms'

function PostsList() {
  const posts = useCollection<typeof cms, 'posts'>('posts', {
    // Optional: Add filters
    baseFindOptions: {
      where: { published: { eq: true } },
      orderBy: { createdAt: 'desc' },
    },
    // Enable realtime sync
    realtime: true,
  })

  return (
    <div>
      <h1>Posts ({posts.items.length})</h1>
      {posts.items.map(post => (
        <div key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </div>
      ))}
    </div>
  )
}
```

### 3. Create Item (Optimistic Update)

```tsx
import { useCollection } from '@questpie/admin/hooks'

function CreatePost() {
  const posts = useCollection<typeof cms, 'posts'>('posts')

  const handleCreate = async () => {
    // Optimistic insert - UI updates immediately
    await posts.insert({
      title: 'New Post',
      content: 'Hello World',
      published: false,
    })
  }

  return (
    <button onClick={handleCreate}>
      Create Post
    </button>
  )
}
```

### 4. Update Item (Optimistic Update)

```tsx
import { useCollection, useCollectionItemById } from '@questpie/admin/hooks'

function EditPost({ id }: { id: string }) {
  const posts = useCollection<typeof cms, 'posts'>('posts')
  const post = useCollectionItemById(posts, id)

  const handleUpdate = async () => {
    if (!post) return

    // Optimistic update - UI updates immediately
    await posts.update(id, {
      title: 'Updated Title',
    })
  }

  if (!post) return <div>Loading...</div>

  return (
    <div>
      <h1>{post.title}</h1>
      <button onClick={handleUpdate}>Update Title</button>
    </div>
  )
}
```

### 5. Delete Item (Optimistic Update)

```tsx
import { useCollection } from '@questpie/admin/hooks'

function DeletePost({ id }: { id: string }) {
  const posts = useCollection<typeof cms, 'posts'>('posts')

  const handleDelete = async () => {
    // Optimistic delete - UI updates immediately
    await posts.delete(id)
  }

  return (
    <button onClick={handleDelete}>
      Delete
    </button>
  )
}
```

## Advanced Usage

### Realtime Sync with Custom Config

```tsx
const posts = useCollection<typeof cms, 'posts'>('posts', {
  realtime: {
    enabled: true,
    baseURL: 'http://localhost:3000',
    basePath: '/cms',
  },
})
```

### With Relations (Eager Loading)

```tsx
const posts = useCollection<typeof cms, 'posts'>('posts', {
  baseFindOptions: {
    with: {
      author: true,
      tags: true,
    },
  },
})

// Now posts.items include author and tags data
posts.items.forEach(post => {
  console.log(post.author?.name)
  console.log(post.tags?.map(t => t.name))
})
```

### Filter & Sort

```tsx
const posts = useCollection<typeof cms, 'posts'>('posts', {
  baseFindOptions: {
    where: {
      AND: [
        { published: { eq: true } },
        { createdAt: { gte: new Date('2024-01-01') } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    limit: 10,
  },
})
```

### Pagination with LoadSubset

```tsx
import { useCollection } from '@questpie/admin/hooks'

function PaginatedPosts() {
  const posts = useCollection<typeof cms, 'posts'>('posts')

  const handleLoadMore = () => {
    posts.loadSubset({
      limit: 10,
      offset: posts.items.length,
    })
  }

  return (
    <div>
      {posts.items.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
      <button onClick={handleLoadMore}>Load More</button>
    </div>
  )
}
```

## API Reference

### `useCollection(collectionName, options)`

Returns a TanStack DB Collection with full CRUD operations.

**Options:**
- `baseFindOptions` - Initial query (filters, sorting, relations)
- `realtime` - Enable SSE realtime sync (boolean or config object)
- `getKey` - Custom key extractor (defaults to `item.id`)

**Returns Collection with:**
- `items` - Array of collection items
- `insert(data)` - Create new item (optimistic)
- `update(id, data)` - Update item (optimistic)
- `delete(id)` - Delete item (optimistic)
- `loadSubset(options)` - Load more items with filters
- `replaceAll(items)` - Replace all items (for realtime)

### `useCollectionItemById(collection, id)`

Get single item from collection by ID (offline-first).

### `useCollectionInsert(collectionName)`

Get insert function for collection.

### `useCollectionUpdate(collectionName)`

Get update function for collection.

### `useCollectionDelete(collectionName)`

Get delete function for collection.

## Legacy Query/Mutation Hooks

For backward compatibility, query/mutation hooks are still available:

```tsx
import {
  useCollectionList,
  useCollectionItem,
  useCollectionCreate,
  useCollectionUpdateMutation,
  useCollectionDeleteMutation,
} from '@questpie/admin/hooks'
```

**Recommendation:** Use TanStack DB hooks (`useCollection`) for better DX and offline-first support.
