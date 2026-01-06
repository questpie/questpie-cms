import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CodeWindow } from "./CodeWindow";
import { cn } from "@/lib/utils";
import { ArrowRight, Terminal, Database, Users, Layers } from "lucide-react";

const steps = [
  {
    id: 1,
    title: "Start Simple",
    description: "Initialize your type-safe CMS backend.",
    icon: Terminal,
    code: `// Step 1: Start simple
export const cms = defineQCMS({ name: 'my-app' })
  .auth({ /* Better Auth options */ })
  .build({ db: { url: process.env.DATABASE_URL } })`
  },
  {
    id: 2,
    title: "Add Collections",
    description: "Define schema with native Drizzle ORM.",
    icon: Database,
    code: `// Step 2: Add collections (native Drizzle schema)
export const cms = defineQCMS({ name: 'my-app' })
  .collections({
    posts: defineCollection('posts').fields({
      title: varchar('title', { length: 255 }).notNull(),
      content: text('content'),
      publishedAt: timestamp('published_at', { mode: 'date' })
    })
  })
  .auth({ /* ... */ })
  .build({ /* ... */ })`
  },
  {
    id: 3,
    title: "Add Jobs",
    description: "Type-safe background jobs with Zod.",
    icon: Users,
    code: `// Step 3: Add background jobs
export const cms = defineQCMS({ name: 'my-app' })
  .collections({ posts, comments, authors })
  .jobs({
    sendWelcomeEmail: defineJob({
      name: 'send-welcome-email',
      schema: z.object({ userId: z.string(), email: z.string().email() }),
      handler: async ({ userId, email }) => {
        // Type-safe payload!
      }
    })
  })
  .auth({ /* ... */ })
  .build({ /* ... */ })`
  },
  {
    id: 4,
    title: "Fully Composed",
    description: "Compose modules and distribute via npm.",
    icon: Layers,
    code: `// Step 4: Fully composed, type-safe CMS
export const cms = defineQCMS({ name: 'my-app' })
  .collections({ posts, comments, authors, products, orders })
  .jobs({ sendWelcomeEmail, processOrder, generateReport })
  .globals({ siteSettings, theme })
  .auth({ /* Better Auth */ })
  .build({ db, email, queue, storage })

// Fully inferred types across your app!
type MyCMS = typeof cms`
  }
];

export function Hero() {
  const [activeStep, setActiveStep] = useState(0);

  // Auto-advance loop (pauses on hover could be added, but keeping simple)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden pt-24 pb-24 lg:pt-32 lg:pb-32">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] ambient-beam opacity-30" />
      </div>

      <div className="container relative mx-auto px-4 z-10 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Column: Copy */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] uppercase tracking-widest text-primary font-mono backdrop-blur-sm">
            <span className="w-1.5 h-1.5 bg-primary animate-pulse" />
            v2.0 Beta Release
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.1]">
            Type-Safe Backend for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Content-Driven</span> Apps
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Compose modular backends with Drizzle, Better Auth, and TypeScript. 
            Works with Elysia, Hono, Next.js, TanStack Start—or any framework.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link 
              to="/docs" 
              className="inline-flex items-center justify-center h-12 px-8 text-sm font-medium transition-all bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
            >
              Read Documentation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link 
              to="/examples"
              disabled
              className="inline-flex items-center justify-center h-12 px-8 text-sm font-medium transition-all border border-input bg-background hover:bg-accent hover:text-accent-foreground opacity-50 cursor-not-allowed"
            >
              View Examples
            </Link>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground text-left max-w-lg mx-auto lg:mx-0">
            {[
              "Native Drizzle ORM + Better Auth",
              "Full type-safety (schema to client)",
              "Batteries included: queues, email",
              "Modular: compose & distribute",
              "Framework-agnostic adapters"
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Right Column: Code Preview */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent blur-3xl -z-10" />
          
          <div className="space-y-4">
            {/* Step Indicators */}
            <div className="grid grid-cols-4 gap-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeStep;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(index)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-2 border transition-all text-center group",
                      isActive 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border bg-card/50 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-mono uppercase hidden sm:block">{step.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Code Window */}
            <CodeWindow 
              title={`src/cms.ts — Step ${activeStep + 1}`} 
              className="h-[400px] flex flex-col"
            >
              {steps[activeStep].code}
            </CodeWindow>
          </div>
        </div>
      </div>
    </section>
  );
}
