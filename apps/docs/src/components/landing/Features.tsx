import { CodeWindow } from "./CodeWindow";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Native Drizzle Schema",
    subtitle: "Collections = Schema + Hooks + Access",
    description: "No custom abstractions. Just Drizzle plus powerful extensions for access control, hooks, and validation.",
    code: `export const postsCollection = defineCollection('posts')
  .fields({
    title: varchar('title', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).default('draft'),
    authorId: varchar('author_id', { length: 255 }).notNull(),
  })
  .access({
    read: true,
    create: ({ user }) => !!user,
    update: async ({ user, row }) => user?.id === row.authorId
  })
  .hooks({
    beforeChange: async ({ data, user }) => {
      if (!data.slug) data.slug = slugify(data.title)
    }
  })`
  },
  {
    title: "Relations = Drizzle Relations",
    subtitle: "Type-Safe Joins & Nested Queries",
    description: "Define relationships using native Drizzle syntax. Query them with full type inference, including nested relations.",
    code: `export const comments = defineCollection('comments')
  .fields({ postId: varchar('post_id').notNull() })
  .relations(({ one, table }) => ({
    post: one('posts', { fields: [table.postId], references: ['id'] })
  }))

// Type-safe query with relations
const { docs } = await cms.collections.posts.find({
  with: { 
    comments: { with: { author: true } } 
  }
})`
  },
  {
    title: "Background Jobs",
    subtitle: "Type-Safe Queues (No Redis Required)",
    description: "Built on pg-boss (PostgreSQL). Define jobs with Zod schemas for fully typed payloads. Retries and scheduling built-in.",
    code: `const sendEmail = defineJob({
  name: 'send-email',
  schema: z.object({ email: z.string().email() }),
  handler: async ({ email }) => { /* ... */ }
})

// Publish with type checking
await cms.queue['send-email'].publish({
  email: 'user@example.com' // Verified by Zod
})`
  },
  {
    title: "Email Templates",
    subtitle: "React-Email Integration",
    description: "Write emails in React. Auto-generated HTML + Text. Type-safe template registry.",
    code: `const welcomeTemplate = defineEmailTemplate({
  name: 'welcome',
  schema: z.object({ name: z.string() }),
  render: ({ name }) => <h1>Welcome {name}!</h1>
})

// Send using registry
await cms.email.sendTemplate({
  template: 'welcome',
  context: { name: 'John' }, // Typed context
  to: 'user@example.com'
})`
  },
  {
    title: "Custom RPC Functions",
    subtitle: "Type-Safe Business Logic",
    description: "Define custom server functions with Zod input/output validation. Call them directly from the client like local functions.",
    code: `// Server
const ping = defineFunction({
  schema: z.object({ msg: z.string() }),
  handler: async ({ msg }) => ({ reply: \`Echo: \${msg}\` })
})

// Client
const { reply } = await client.api.cms.rpc.ping({ 
  msg: 'Hello' 
})`
  },
  {
    title: "Type-Safe Client",
    subtitle: "Unified RPC + CRUD",
    description: "The client infers types directly from your backend schema. No code generation required.",
    code: `const client = createClient<AppType>({ baseURL: '/api' })

// Fully typed query
const { docs } = await client.collections.posts.find({
  where: { 
    status: 'published',
    authorId: user.id 
  },
  with: { author: true }
})

// docs[0].title  (typed string)
// docs[0].author (typed User)`
  },
  {
    title: "One Backend, Any Framework",
    subtitle: "Framework Agnostic Adapters",
    description: "Define your CMS once, run it anywhere. We provide native adapters for the most popular modern frameworks.",
    code: `// Elysia
new Elysia()
  .use(createCMSFetchHandler(cms))

// Hono
const app = new Hono()
app.route('/api/cms', createCMSFetchHandler(cms))

// Next.js (App Router)
export const { GET, POST } = createCMSFetchHandler(cms)

// TanStack Start
export const Route = createAPIFileRoute('/api/cms/$')({
  GET: createCMSFetchHandler(cms)
})`
  }
];

export function Features() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4 space-y-24">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="font-mono text-sm tracking-[0.2em] uppercase text-primary">Core Architecture</h2>
          <h3 className="text-3xl md:text-4xl font-bold">Built for the Modern Stack</h3>
          <p className="text-muted-foreground">
            We don't reinvent the wheel. We integrate the best tools in the ecosystem into a cohesive, type-safe platform.
          </p>
        </div>

        {features.map((feature, i) => (
          <div key={i} className={cn("grid md:grid-cols-2 gap-12 items-center", i % 2 === 1 && "md:grid-flow-col-dense")}>
            <div className={cn("space-y-6", i % 2 === 1 && "md:col-start-2")}>
              <div className="inline-block p-2 bg-primary/10 border border-primary/20 rounded-none">
                <div className="w-8 h-8 bg-primary/20 flex items-center justify-center font-mono font-bold text-primary">
                  0{i + 1}
                </div>
              </div>
              <div>
                <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                <p className="font-mono text-xs text-primary uppercase tracking-wider mb-4">{feature.subtitle}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
            
            <div className={cn(i % 2 === 1 && "md:col-start-1")}>
                          <CodeWindow title="typescript" className="shadow-2xl shadow-primary/5">
                            {feature.code}
                          </CodeWindow>            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
