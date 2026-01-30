import { cn } from "@/lib/utils";
import { CodeWindow } from "./CodeWindow";

const features = [
	{
		title: "Collections",
		subtitle: "Drizzle schema + hooks + access control",
		description:
			"Define your schema with native Drizzle columns. Add hooks for business logic, access rules for permissions. That's it.",
		file: "src/collections/posts.ts",
		code: `const posts = q.collection('posts')
  .fields({
    title: varchar('title', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).default('draft'),
    authorId: varchar('author_id', { length: 255 }).notNull(),
  })
  .access({
    read: true,
    create: ({ user }) => !!user,
    update: ({ user, doc }) => user?.id === doc.authorId
  })
  .hooks({
    beforeChange: async ({ data, operation }) => {
      if (operation === 'create' && !data.slug) {
        data.slug = slugify(data.title)
      }
    }
  })`,
	},
	{
		title: "Relations",
		subtitle: "Drizzle relations, type-safe queries",
		description:
			"One-to-many, many-to-many—define them once, query with full type inference. Nested relations just work.",
		file: "src/collections/comments.ts",
		code: `const comments = q.collection('comments')
  .fields({ postId: varchar('post_id').notNull() })
  .relations(({ one, table }) => ({
    post: one('posts', {
      fields: [table.postId],
      references: ['id']
    })
  }))

// Query with relations
const { docs } = await app.api.collections.posts.find({
  with: { comments: { with: { author: true } } }
})`,
	},
	{
		title: "Background Jobs",
		subtitle: "pg-boss queues, no Redis needed",
		description:
			"Define jobs with Zod schemas. Publish with type checking. Retries, scheduling, priorities—all built on Postgres.",
		file: "src/jobs/send-email.ts",
		code: `const sendEmail = q.job({
  name: 'send-email',
  schema: z.object({
    to: z.string().email(),
    template: z.string()
  }),
  handler: async (payload) => {
    await mailer.send(payload)
  }
})

// Type-safe publish
await app.queue.sendEmail.publish({
  to: 'user@example.com',
  template: 'welcome'
})`,
	},
	{
		title: "Type-Safe Client",
		subtitle: "No codegen, types flow from schema",
		description:
			"Create a client, pass your app type. Collections, functions, globals—all typed. Works in React, Vue, Svelte, anywhere.",
		file: "src/lib/api-client.ts",
		code: `import { createClient } from 'questpie/client'
import type { app } from './server'

const client = createClient<typeof app>({
  baseURL: 'http://localhost:3000'
})

// Fully typed
const { docs } = await client.collections.posts.find({
  where: { status: 'published' },
  with: { author: true }
})

console.log(docs[0].title)       // string
console.log(docs[0].author.name) // string`,
	},
];

export function Features() {
	return (
		<section
			id="features"
			className="py-24 relative overflow-hidden border-t border-border/30"
		>
			{/* Subtle background glow */}
			<div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[150px] -translate-y-1/2" />

			<div className="w-full max-w-7xl mx-auto px-4 space-y-20 relative z-10">
				<div className="text-center max-w-2xl mx-auto space-y-4">
					<h2 className="font-mono text-sm tracking-[0.2em] uppercase text-primary">
						Backend
					</h2>
					<h3 className="text-3xl md:text-4xl font-bold">
						How It Works
					</h3>
					<p className="text-muted-foreground">
						Collections, relations, jobs—all wired together with TypeScript.
						Each piece uses a library you can learn independently.
					</p>
				</div>

				{features.map((feature, i) => (
					<div
						key={feature.title}
						className={cn(
							"grid md:grid-cols-2 gap-12 items-center",
							i % 2 === 1 && "md:grid-flow-col-dense",
						)}
					>
						<div
							className={cn(
								"space-y-4 min-w-0",
								i % 2 === 1 && "md:col-start-2",
							)}
						>
							<div>
								<h4 className="text-xl font-bold mb-1">{feature.title}</h4>
								<p className="font-mono text-xs text-primary uppercase tracking-wider mb-3">
									{feature.subtitle}
								</p>
								<p className="text-muted-foreground leading-relaxed">
									{feature.description}
								</p>
							</div>
						</div>

						<div className={cn(i % 2 === 1 && "md:col-start-1", "min-w-0")}>
							<CodeWindow title={feature.file}>{feature.code}</CodeWindow>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
