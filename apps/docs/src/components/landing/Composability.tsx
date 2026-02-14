import { Link } from "@tanstack/react-router";
import { Box, Layers, Palette, Plug } from "lucide-react";
import { motion } from "motion/react";

const layers = [
	{
		icon: Box,
		label: "Core",
		api: "q()",
		description: "Collections, globals, fields, jobs, auth — all type-safe.",
	},
	{
		icon: Plug,
		label: "Adapters",
		api: ".build()",
		description:
			"Storage, queue, email, search, realtime — swap providers, keep your schema.",
	},
	{
		icon: Layers,
		label: "Modules",
		api: ".use()",
		description:
			"Compose builders together. Admin module ships the full panel.",
	},
	{
		icon: Palette,
		label: "Client",
		api: "qa()",
		description:
			"Field renderers, views, widgets, components — all registries.",
	},
];

export function Composability() {
	return (
		<section id="composability" className="border-t border-border/40 py-20">
			<div className="mx-auto w-full max-w-7xl px-4">
				<motion.div
					className="mx-auto mb-12 max-w-2xl space-y-3 text-center"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.6 }}
				>
					<h2 className="font-mono text-sm uppercase tracking-[0.2em] text-primary">
						Architecture
					</h2>
					<h3 className="text-3xl font-bold tracking-[-0.02em] text-balance md:text-4xl">
						Four layers. Zero lock-in.
					</h3>
					<p className="text-muted-foreground text-balance">
						Server defines <strong className="text-foreground">what</strong>.
						Client defines <strong className="text-foreground">how</strong>.
						Adapters define <strong className="text-foreground">where</strong>.
						Compose them your way.
					</p>
				</motion.div>

				{/* 4 layer cards in a row */}
				<div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{layers.map((layer, i) => (
						<motion.div
							key={layer.label}
							className="group border border-border bg-card/20 backdrop-blur-sm p-5 transition-colors hover:border-primary/30"
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{
								duration: 0.5,
								delay: i * 0.1,
							}}
						>
							<div className="mb-3 flex h-9 w-9 items-center justify-center border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
								<layer.icon className="h-4 w-4" />
							</div>
							<h4 className="text-sm font-semibold mb-1">{layer.label}</h4>
							<code className="text-[10px] font-mono text-primary">
								{layer.api}
							</code>
							<p className="text-xs text-muted-foreground mt-2 leading-relaxed">
								{layer.description}
							</p>
						</motion.div>
					))}
				</div>

				<div className="mt-8 text-center">
					<Link
						to="/docs/$"
						params={{ _splat: "mentality" }}
						className="inline-flex items-center gap-2 font-mono text-xs text-primary transition-colors hover:text-primary/80"
					>
						Read the architecture philosophy →
					</Link>
				</div>
			</div>
		</section>
	);
}
