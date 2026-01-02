# Admin View Components

Pre-built components pre CRUD operácie postavené na TanStack DB Collections.

## CollectionList

Zobrazenie zoznamu s TanStack Table, sorting, a realtime sync.

```tsx
import { CollectionList } from '@questpie/admin/components'
import type { cms } from './server/cms'
import { Button } from '@questpie/admin/components/ui/button'

function PostsList() {
  return (
    <CollectionList<typeof cms, 'posts'>
      collection="posts"
      columns={[
        {
          accessorKey: 'title',
          header: 'Title',
        },
        {
          accessorKey: 'author.name',
          header: 'Author',
        },
        {
          accessorKey: 'createdAt',
          header: 'Created',
          cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
        },
      ]}
      baseFindOptions={{
        where: { published: { eq: true } },
        with: { author: true },
      }}
      realtime={true}
      headerActions={
        <Button onClick={() => router.push('/posts/new')}>
          Create Post
        </Button>
      }
      rowActions={(post) => (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => router.push(`/posts/${post.id}`)}>
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleDelete(post.id)}>
            Delete
          </Button>
        </div>
      )}
      onRowClick={(post) => router.push(`/posts/${post.id}`)}
    />
  )
}
```

## CollectionForm

Formulár s React Hook Form + optimistic updates.

```tsx
import { CollectionForm, FormField } from '@questpie/admin/components'
import type { cms } from './server/cms'

function PostForm({ id }: { id?: string }) {
  return (
    <CollectionForm<typeof cms, 'posts'>
      collection="posts"
      id={id}
      title={id ? 'Edit Post' : 'Create Post'}
      onSuccess={() => router.push('/posts')}
      onCancel={() => router.back()}
    >
      <FormField name="title" label="Title" required placeholder="Enter post title" />

      <FormField
        name="content"
        label="Content"
        type="textarea"
        placeholder="Write your post..."
      />

      <FormField name="published" label="Published" type="switch" />

      <FormField
        name="status"
        label="Status"
        type="select"
        options={[
          { label: 'Draft', value: 'draft' },
          { label: 'Published', value: 'published' },
        ]}
      />
    </CollectionForm>
  )
}
```

## FormField

Generický field komponent s explicitným type (default je `text`).

```tsx
import { FormField } from '@questpie/admin/components'

// Text input
<FormField name="title" label="Title" required />

// Textarea
<FormField name="content" label="Content" type="textarea" />

// Number
<FormField name="views" label="Views" type="number" />

// Checkbox
<FormField name="featured" label="Featured" type="checkbox" />

// Switch
<FormField name="published" label="Published" type="switch" />

// Select
<FormField
  name="category"
  label="Category"
  type="select"
  options={[
    { label: 'Tech', value: 'tech' },
    { label: 'Design', value: 'design' },
  ]}
/>

// Date
<FormField name="publishedAt" label="Publish Date" type="date" />

// Custom component
<FormField
  name="featuredImage"
  label="Featured Image"
  component={ImageUploader}
/>
```

## Complete Example

```tsx
import { AdminProvider } from '@questpie/admin/hooks'
import { CollectionList, CollectionForm, FormField } from '@questpie/admin/components'
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
      <Router>
        <Routes>
          <Route path="/posts" element={<PostsList />} />
          <Route path="/posts/new" element={<PostForm />} />
          <Route path="/posts/:id" element={<PostForm />} />
        </Routes>
      </Router>
    </AdminProvider>
  )
}

function PostsList() {
  return (
    <div className="container py-8">
      <CollectionList<typeof cms, 'posts'>
        collection="posts"
        columns={[
          { accessorKey: 'title', header: 'Title' },
          { accessorKey: 'createdAt', header: 'Created' },
        ]}
        realtime={true}
        headerActions={
          <Button onClick={() => router.push('/posts/new')}>
            Create Post
          </Button>
        }
      />
    </div>
  )
}

function PostForm({ id }: { id?: string }) {
  return (
    <div className="container py-8 max-w-2xl">
      <CollectionForm<typeof cms, 'posts'>
        collection="posts"
        id={id}
        title={id ? 'Edit Post' : 'Create Post'}
        onSuccess={() => router.push('/posts')}
      >
        <FormField name="title" label="Title" required />
        <FormField name="content" label="Content" type="textarea" />
        <FormField name="published" label="Published" type="switch" />
      </CollectionForm>
    </div>
  )
}
```

## Features

✅ **TanStack DB** - Offline-first, realtime sync
✅ **TanStack Table** - Sorting, filtering, pagination
✅ **React Hook Form** - Form validation, error handling
✅ **Optimistic Updates** - Instant UI feedback
✅ **Type Safety** - Full TypeScript inference
✅ **Customizable** - Override any component or behavior
