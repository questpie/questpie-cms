import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";

const frameworks = [
	{
		name: "TanStack Start",
		tagline: "Full-stack, type-safe",
		description:
			"Full-stack React framework with type-safe routing and server functions.",
		logo: <img src="/logos/tanstack.png" alt="TanStack" className="h-8 w-auto" />,
		highlighted: true,
	},
	{
		name: "Hono",
		tagline: "Bun-native, edge-ready",
		description:
			"Ultra-fast, runs on Bun, Deno, Cloudflare Workers, and Node.js.",
		logo: <img src="/logos/hono.png" alt="Hono" className="h-8 w-8" />,
	},
	{
		name: "Elysia",
		tagline: "Bun-native, type-safe",
		description:
			"End-to-end type safety with excellent Bun performance.",
		logo: <img src="/logos/elysia.svg" alt="Elysia" className="h-8 w-8" />,
	},
	{
		name: "Next.js",
		tagline: "App Router & Pages Router",
		description:
			"Works with both App Router and Pages Router via catch-all routes.",
		logo: <img src="/logos/nextjs.png" alt="Next.js" className="h-8 w-8" />,
	},
];

export function Frameworks() {
	return (
		<section id="adapters" className="border-t border-border/40 py-20">
			<div className="mx-auto w-full max-w-7xl px-4">
				<motion.div
					className="mx-auto mb-10 max-w-2xl space-y-3 text-center"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.6 }}
				>
					<h2 className="font-mono text-sm uppercase tracking-[0.2em] text-primary">
						Adapters
					</h2>
					<h3 className="text-3xl font-bold tracking-[-0.02em] text-balance md:text-4xl">
						Bring your own framework
					</h3>
				</motion.div>

				<div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{frameworks.map((fw, i) => (
						<motion.div
							key={fw.name}
							className="group border border-border bg-card/20 backdrop-blur-sm p-6 text-center transition-colors hover:border-primary/30"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{
								duration: 0.5,
								delay: i * 0.1,
							}}
						>
	<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
								{fw.logo}
							</div>
							<h4 className="text-lg font-semibold">
								{fw.name}
							</h4>
							<p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
								{fw.tagline}
							</p>
							<p className="mt-2 text-xs text-muted-foreground">
								{fw.description}
							</p>
						</motion.div>
					))}
				</div>

				<p className="mt-8 text-center text-sm text-muted-foreground text-balance">
					If it handles HTTP, it runs QUESTPIE. Write your own adapter in under 50 lines.
				</p>

				<div className="mt-4 text-center">
					<Link
						to="/docs/$"
						params={{ _splat: "client/adapters-overview" }}
						className="inline-flex items-center gap-2 font-mono text-xs text-primary transition-colors hover:text-primary/80"
					>
						Read the adapter docs →
					</Link>
				</div>
			</div>
		</section>
	);
}
