import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Comparison } from "@/components/landing/Comparison";
import { Examples } from "@/components/landing/Examples";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
	component: Home,
});

function Home() {
	return (
		<HomeLayout {...baseOptions()}>
			<div className="flex flex-col min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary">
                {/* Background Grid */}
                <div className="fixed inset-0 bg-grid-quest opacity-[0.03] pointer-events-none z-0" />
                
                {/* Main Content */}
                <main className="flex-1 relative z-10">
                    <Hero />
                    <Features />
                    <Comparison />
                    <Examples />
                </main>
                
                <Footer />
			</div>
		</HomeLayout>
	);
}