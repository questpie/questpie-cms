import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { HeroVisual } from "./HeroVisual";
import { type Headline, headlines } from "./headlines";

export type HeroProps = {
	headlineIndex: number;
};

export function Hero({ headlineIndex }: HeroProps) {
	const headline: Headline = headlines[headlineIndex] ?? headlines[0];

	return (
		<section className="relative overflow-hidden py-20 lg:py-28">
			{/* Background */}
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
				<div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
			</div>

			<div className="w-full max-w-7xl relative mx-auto px-4 z-10">
				<div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
					{/* Left: Copy */}
					<div>
						{/* Beta badge */}
						<div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-primary font-mono mb-6">
							<span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
							Beta
						</div>

						{/* Headline */}
						<h1 className="text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
							{headline.top}{" "}
							<span className="text-primary">{headline.highlight}</span>
						</h1>

						{/* Subheadline */}
						<p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
							Headless CMS framework for TypeScript. Drizzle schema, Better
							Auth, pg-boss queues—plus a config-driven admin UI. All type-safe,
							all yours to own.
						</p>

						{/* CTA buttons */}
						<div className="flex flex-col sm:flex-row gap-4">
							<Link
								to="/docs/$"
								className="group inline-flex items-center justify-center h-12 px-8 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
							>
								Get Started
								<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
							</Link>
							<a
								href="#examples"
								className="inline-flex items-center justify-center h-12 px-8 text-sm font-medium border border-border hover:bg-muted transition-colors"
							>
								View Examples
							</a>
						</div>
					</div>

					{/* Right: Visual */}
					<div className="relative">
						<HeroVisual />
					</div>
				</div>
			</div>
		</section>
	);
}
