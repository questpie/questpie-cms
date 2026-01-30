import { CodeWindow } from "./CodeWindow";

const backendCode = `// questpie/server/collections/posts.ts
import { q } from 'questpie'
import { varchar, text } from 'drizzle-orm/pg-core'

export const posts = q.collection('posts')
  .fields({
    title: varchar('title', { length: 255 }),
    content: text('content'),
  })
  .hooks({
    beforeChange: async ({ data }) => {
      data.slug = slugify(data.title)
    }
  })
  .access({
    read: true,
    create: ({ user }) => !!user,
  })`;

const adminCode = `// questpie/admin/collections/posts.ts
import { qa } from '@questpie/admin'

export const postsAdmin = qa.collection('posts')
  .fields(({ r }) => ({
    title: r.text({ label: 'Title' }),
    content: r.richText({ label: 'Content' }),
  }))
  .list(({ v, f }) => v.table({
    columns: [f.title]
  }))
  .form(({ v, f }) => v.form({
    fields: [f.title, f.content]
  }))`;

export function Philosophy() {
	return (
		<section className="py-24 border-t border-border/50 relative overflow-hidden">
			{/* Background glows */}
			<div className="absolute top-0 left-1/3 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px]" />
			<div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />

			<div className="w-full max-w-7xl mx-auto px-4 relative z-10">
				{/* Header */}
				<div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
					<h2 className="font-mono text-sm tracking-[0.2em] uppercase text-primary">
						Philosophy
					</h2>
					<h3 className="text-3xl md:text-4xl font-bold">
						Why Backend & Admin Are Separate
					</h3>
					<p className="text-muted-foreground">
						Most CMS solutions couple schema and UI together. We chose explicit
						over magic.
					</p>
				</div>

				{/* Split code comparison */}
				<div className="grid lg:grid-cols-2 gap-6 mb-12">
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<span className="font-mono text-xs text-primary">
								questpie/server/
							</span>
							<span className="text-sm text-muted-foreground">
								— Backend schema
							</span>
						</div>
						<CodeWindow title="collections/posts.ts">{backendCode}</CodeWindow>
					</div>

					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<span className="font-mono text-xs text-primary">
								questpie/admin/
							</span>
							<span className="text-sm text-muted-foreground">
								— Admin UI config
							</span>
						</div>
						<CodeWindow title="collections/posts.ts">{adminCode}</CodeWindow>
					</div>
				</div>

				{/* Benefits */}
				<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
					{[
						{
							title: "Explicit over magic",
							desc: "You see exactly what fields are in admin. Easy to audit.",
						},
						{
							title: "Independent evolution",
							desc: "Refactor backend without breaking admin. Different teams work in parallel.",
						},
						{
							title: "Headless-first",
							desc: "Backend works without admin. API is the product, admin is the bonus.",
						},
						{
							title: "Type safety",
							desc: "Collection names autocomplete from backend. Typo = compile-time error.",
						},
					].map((item) => (
						<div key={item.title} className="space-y-2">
							<h4 className="font-medium">{item.title}</h4>
							<p className="text-muted-foreground">{item.desc}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
