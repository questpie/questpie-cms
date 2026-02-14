import { DatabaseZap, LayoutDashboard, Puzzle } from "lucide-react";

const features = [
	{
		icon: DatabaseZap,
		title: "Collections become APIs in seconds",
		description:
			"Define your data model with typed fields. Get a REST API, type-safe SDK, and full CRUD automatically — no boilerplate.",
	},
	{
		icon: LayoutDashboard,
		title: "Admin that writes itself",
		description:
			"List views, form layouts, and sidebar config come from your collection definition. Customize everything, generate by default.",
	},
	{
		icon: Puzzle,
		title: "Your framework, your rules",
		description:
			"Works with Hono, Elysia, Next.js, or any framework that handles HTTP. Bring your own design system and components.",
	},
];

export function Features() {
	return (
		<section id="features" className="border-t border-border/40 py-20">
			<div className="mx-auto w-full max-w-7xl px-4">
				<div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
					<h2 className="font-mono text-sm uppercase tracking-[0.2em] text-primary">
						Why QUESTPIE
					</h2>
					<h3 className="text-3xl font-bold tracking-tight md:text-4xl">
						Everything you need to ship fast.
					</h3>
				</div>

				<div className="grid gap-6 md:grid-cols-3">
					{features.map((feature) => (
						<article
							key={feature.title}
							className="border border-border bg-card/40 p-6 transition-colors hover:border-primary/40"
						>
							<div className="mb-4 inline-flex border border-primary/30 bg-primary/10 p-2">
								<feature.icon className="h-5 w-5 text-primary" />
							</div>
							<h4 className="mb-2 text-lg font-semibold">{feature.title}</h4>
							<p className="text-sm leading-relaxed text-muted-foreground">
								{feature.description}
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
