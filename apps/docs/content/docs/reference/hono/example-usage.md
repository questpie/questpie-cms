---
title: Example Usage
---

# Hono Adapter Usage Example

The QUESTPIE Hono adapter provides both server-side integration and a type-safe client SDK for your CMS.

## Server Setup

```typescript
import { Hono } from 'hono'
import { questpieHono } from '@questpie/hono'
import { cms } from './cms'

const app = new Hono()

// Mount QCMS routes
app.route('/', questpieHono(cms, {
  basePath: '/api',
  cors: {
    origin: '*',
    credentials: true
  }
}))

// Custom routes for your business logic
app.post('/api/custom/checkout', async (c) => {
  // Your custom business logic here
  const body = await c.req.json()

  // Access CMS programmatically if needed
  const context = await cms.createContext({
    user: c.get('user'),
    locale: 'en',
    accessMode: 'user'
  })

  const cart = await cms.api.collections.carts.findOne({ where: { id: body.cartId } }, context)

  return c.json({ success: true, orderId: '...' })
})

export default {
  port: 3000,
  fetch: app.fetch
}
```

## Client Usage

```typescript
import { createQCMSClient } from '@questpie/hono'
import type { cms } from './server'

const client = createQCMSClient<typeof cms>({
  baseURL: 'http://localhost:3000',
  basePath: '/api'
})

// ✅ Type-safe collections
const posts = await client.collections.posts.find({
  limit: 10,
  where: {
    status: 'published'
  }
})

// ✅ Type-safe relations
const post = await client.collections.posts.findOne({
  where: { id: '123' },
  with: {
    author: true,
    comments: true
  }
})

// ✅ Create, update, delete
const newPost = await client.collections.posts.create({
  title: 'Hello World',
  content: { /* rich content */ }
})

await client.collections.posts.update('123', {
  title: 'Updated Title'
})

await client.collections.posts.delete('123')
```

## Custom Business Logic

For custom business logic beyond CRUD operations, create normal Hono routes:

```typescript
// server.ts
app.post('/api/custom/add-to-cart', async (c) => {
  const { productId, quantity } = await c.req.json()
  const context = await cms.createContext({
    user: c.get('user'),
    locale: 'en',
    accessMode: 'user'
  })

  // Your business logic
  const product = await cms.api.collections.products.findOne({ where: { id: productId } }, context)

  if (product.stock < quantity) {
    return c.json({ error: 'Insufficient stock' }, 400)
  }

  // ... create cart item

  return c.json({ success: true, cartId: '...' })
})
```

```typescript
// client.ts
import { hc } from 'hono/client'
import type { AppType } from './server'

// Use Hono's native client for custom routes
const honoClient = hc<AppType>('http://localhost:3000')

const result = await honoClient.api.custom['add-to-cart'].$post({
  json: { productId: '123', quantity: 2 }
})
```

## Combined Approach

For the best developer experience, you can use both clients together:

```typescript
import { createQCMSClient } from '@questpie/hono'
import { hc } from 'hono/client'
import type { cms } from './server'
import type { AppType } from './server'

// CMS client for CRUD operations
const cmsClient = createQCMSClient<typeof cms>({
  baseURL: 'http://localhost:3000'
})

// Hono client for custom routes
const apiClient = hc<AppType>('http://localhost:3000')

// Use both as needed
const posts = await cmsClient.collections.posts.find({ limit: 10 })
const cart = await apiClient.api.custom['add-to-cart'].$post({
  json: { productId: '123', quantity: 2 }
})
```

## Why This Approach?

- **CMS Client**: Provides advanced type inference for CRUD operations (input → output types)
- **Hono Client**: Native integration for custom business logic with full type safety
- **Flexibility**: Use the right tool for the job - CRUD or custom routes
- **Type Safety**: Full end-to-end type safety for both CMS and custom endpoints
