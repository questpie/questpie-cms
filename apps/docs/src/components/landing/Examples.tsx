import { ArrowRight, Github } from "lucide-react";

const examples = [
  {
    title: "Barbershop Booking",
    stack: "Elysia + React",
    description: "Complete booking system with appointments, services, and admin dashboard.",
    link: "https://github.com/questpie/questpie-cms/tree/main/examples/elysia-barbershop"
  },
  {
    title: "SaaS Starter",
    stack: "Hono + Next.js",
    description: "Multi-tenant SaaS boilerplate with subscription billing and team management.",
    link: "https://github.com/questpie/questpie-cms/tree/main/examples/hono-barbershop"
  },
  {
    title: "E-commerce Core",
    stack: "TanStack Start",
    description: "Headless e-commerce backend with product catalog and order processing.",
    link: "https://github.com/questpie/questpie-cms/tree/main/examples/tanstack-barbershop"
  }
];

export function Examples() {
  return (
    <section className="py-24 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="space-y-4">
            <h2 className="font-mono text-sm tracking-[0.2em] uppercase text-primary">Real-World Usage</h2>
            <h3 className="text-3xl font-bold">Start with a template</h3>
            <p className="text-muted-foreground max-w-xl">
              Don't start from scratch. Clone one of our production-ready examples to see best practices in action.
            </p>
          </div>
          <a 
            href="https://github.com/questpie/questpie-cms/tree/main/examples" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
          >
            View all examples on GitHub <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {examples.map((ex, i) => (
            <a 
              key={i} 
              href={ex.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-6 border border-border bg-card/30 hover:border-primary/50 hover:bg-card/50 transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-mono uppercase tracking-wider border border-primary/20">
                  {ex.stack}
                </div>
                <Github className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <h4 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{ex.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {ex.description}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
