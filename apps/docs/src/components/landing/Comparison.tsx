import { Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Comparison() {
  return (
    <section className="py-24 border-y border-border bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        
        {/* Problem / Solution Grid */}
        <div className="grid md:grid-cols-2 gap-12 mb-24">
          <div className="space-y-6">
            <h2 className="font-mono text-sm tracking-[0.2em] uppercase text-muted-foreground">The Problem</h2>
            <h3 className="text-3xl font-bold">Why do you have to choose?</h3>
            <div className="space-y-4">
              <div className="p-6 border border-red-500/20 bg-red-500/5 space-y-2">
                <h4 className="font-bold text-red-400">Vendor Lock-in</h4>
                <p className="text-sm text-muted-foreground">Proprietary platforms (Sanity, Contentful) own your data and infrastructure.</p>
              </div>
              <div className="p-6 border border-red-500/20 bg-red-500/5 space-y-2">
                <h4 className="font-bold text-red-400">Framework Fragmentation</h4>
                <p className="text-sm text-muted-foreground">Payload is Next.js only. Strapi forces its own runtime. No flexibility.</p>
              </div>
              <div className="p-6 border border-red-500/20 bg-red-500/5 space-y-2">
                <h4 className="font-bold text-red-400">Type-Safety Theater</h4>
                <p className="text-sm text-muted-foreground">Reinventing schemas means your DB types and API types always drift apart.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-mono text-sm tracking-[0.2em] uppercase text-primary">The Answer</h2>
            <h3 className="text-3xl font-bold">Native Integrations, No Reinvention</h3>
            <div className="space-y-4">
              <div className="p-6 border border-primary/20 bg-primary/5 space-y-2">
                <h4 className="font-bold text-primary">Drizzle ORM is your Schema</h4>
                <p className="text-sm text-muted-foreground">No translation layer. Type safety from DB to client.</p>
              </div>
              <div className="p-6 border border-primary/20 bg-primary/5 space-y-2">
                <h4 className="font-bold text-primary">Framework Agnostic</h4>
                <p className="text-sm text-muted-foreground">One backend core. Adapters for Elysia, Hono, Next.js, and TanStack Start.</p>
              </div>
              <div className="p-6 border border-primary/20 bg-primary/5 space-y-2">
                <h4 className="font-bold text-primary">Batteries Included</h4>
                <p className="text-sm text-muted-foreground">Auth, Email, Queues, Storage - all built-in but fully swappable via adapters.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-4 px-4 font-mono text-sm text-muted-foreground uppercase">Feature</th>
                <th className="py-4 px-4 font-bold text-primary bg-primary/5 border-x border-primary/20 w-1/4">QUESTPIE</th>
                <th className="py-4 px-4 font-medium text-muted-foreground w-1/5">Strapi</th>
                <th className="py-4 px-4 font-medium text-muted-foreground w-1/5">Payload</th>
                <th className="py-4 px-4 font-medium text-muted-foreground w-1/5">Sanity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { name: "Type-safe (DB to client)", questpie: true, strapi: "partial", payload: true, sanity: "runtime" },
                { name: "Self-hosted", questpie: true, strapi: true, payload: true, sanity: false },
                { name: "Framework Agnostic", questpie: true, strapi: false, payload: false, sanity: true },
                { name: "Native Drizzle ORM", questpie: true, strapi: false, payload: "partial", sanity: "N/A" },
                { name: "Native Better Auth", questpie: true, strapi: false, payload: false, sanity: false },
                { name: "Built-in Queue (No Redis)", questpie: true, strapi: false, payload: "cron", sanity: false },
                { name: "Decoupled Admin UI", questpie: true, strapi: false, payload: false, sanity: "cloud" },
              ].map((row, i) => (
                <tr key={i} className="group hover:bg-muted/50 transition-colors">
                  <td className="py-4 px-4 text-sm font-medium">{row.name}</td>
                  <td className="py-4 px-4 bg-primary/5 border-x border-primary/20 text-center">
                    <Check className="mx-auto h-5 w-5 text-primary" />
                  </td>
                  <td className="py-4 px-4 text-center text-muted-foreground">
                    {renderStatus(row.strapi)}
                  </td>
                  <td className="py-4 px-4 text-center text-muted-foreground">
                    {renderStatus(row.payload)}
                  </td>
                  <td className="py-4 px-4 text-center text-muted-foreground">
                    {renderStatus(row.sanity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}

function renderStatus(status: boolean | string) {
  if (status === true) return <Check className="mx-auto h-5 w-5 text-foreground" />;
  if (status === false) return <X className="mx-auto h-5 w-5 text-muted-foreground/50" />;
  if (status === "partial") return <span className="text-xs font-mono text-yellow-500">LIMITED</span>;
  if (status === "runtime") return <span className="text-xs font-mono text-yellow-500">RUNTIME</span>;
  if (status === "cron") return <span className="text-xs font-mono text-yellow-500">CRON</span>;
  if (status === "cloud") return <span className="text-xs font-mono text-yellow-500">CLOUD</span>;
  return <span className="text-xs font-mono text-muted-foreground">N/A</span>;
}
