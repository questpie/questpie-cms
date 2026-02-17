import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { AdminShowcase } from "@/components/landing/AdminShowcase";
import { CallToAction } from "@/components/landing/CallToAction";
import { Composability } from "@/components/landing/Composability";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Frameworks } from "@/components/landing/Frameworks";
import { Hero } from "@/components/landing/Hero";
import { Navbar } from "@/components/landing/Navbar";
import { NumbersStrip } from "@/components/landing/NumbersStrip";
import { RealtimeDemo } from "@/components/landing/RealtimeDemo";
import { SchemaToEverything } from "@/components/landing/SchemaToEverything";
import { baseOptions } from "@/lib/layout.shared";
import {
	generateJsonLd,
	generateLinks,
	generateMeta,
	siteConfig,
} from "@/lib/seo";

export const Route = createFileRoute("/")({
	component: Home,
	head: () => ({
		links: generateLinks({
			url: siteConfig.url,
			includeIcons: false,
			includePreconnect: false,
		}),
		meta: generateMeta({
			title: siteConfig.title,
			description: siteConfig.description,
			url: siteConfig.url,
		}),
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(generateJsonLd()),
			},
		],
	}),
	headers: () => ({
		"Cache-Control":
			"public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
	}),
	staleTime: 60 * 60_000,
	gcTime: 2 * 60 * 60_000,
});

function Home() {
	return (
		<HomeLayout {...baseOptions()} nav={{ component: <Navbar /> }}>
			<div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary relative overflow-hidden">
				{/* Global grid pattern */}
				<div
					className="fixed inset-0 pointer-events-none opacity-[0.07]"
					style={{
						backgroundImage:
							"linear-gradient(oklch(0.5984 0.3015 310.74 / 0.5) 1px, transparent 1px), linear-gradient(90deg, oklch(0.5984 0.3015 310.74 / 0.5) 1px, transparent 1px)",
						backgroundSize: "64px 64px",
					}}
				/>

				{/* Global ambient glow — top */}
				<div className="hidden dark:block fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] pointer-events-none bg-[radial-gradient(ellipse,_oklch(0.5984_0.3015_310.74_/_0.12)_0%,_transparent_70%)]" />

				{/* Global ambient glow — mid */}
				<div className="hidden dark:block fixed top-[50%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none bg-[radial-gradient(ellipse,_oklch(0.5984_0.3015_310.74_/_0.06)_0%,_transparent_70%)]" />

				{/* Global ambient glow — bottom */}
				<div className="hidden dark:block fixed bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] pointer-events-none bg-[radial-gradient(ellipse,_oklch(0.5984_0.3015_310.74_/_0.1)_0%,_transparent_70%)]" />

				<main className="flex-1 relative">
					<Hero />
					<NumbersStrip />
					<SchemaToEverything />
					<Composability />
					<Features />
					<RealtimeDemo />
					<Frameworks />
					<AdminShowcase />
					<CallToAction />
				</main>

				<Footer />
			</div>
		</HomeLayout>
	);
}
