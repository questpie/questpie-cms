import { createFileRoute } from "@tanstack/react-router";
import { source } from "@/lib/source";

function generateLLMSTxt(baseUrl: string) {
  const pages = source.getPages();

  // Group pages by their first slug segment (category)
  const categories = new Map<string, typeof pages>();
  for (const page of pages) {
    const category = page.slugs[0] ?? "root";
    if (!categories.has(category)) {
      categories.set(category, []);
    }
    categories.get(category)!.push(page);
  }

  // Generate structured links
  const sections: string[] = [];

  // Introduction section
  const intro = categories.get("introduction");
  if (intro) {
    sections.push("## Getting Started\n");
    for (const page of intro) {
      sections.push(`- ${page.data.title}: ${baseUrl}${page.url}.mdx`);
    }
    sections.push("");
  }

  // Core Concepts section
  const coreConcepts = categories.get("core-concepts");
  if (coreConcepts) {
    sections.push("## Core Concepts\n");
    for (const page of coreConcepts) {
      sections.push(`- ${page.data.title}: ${baseUrl}${page.url}.mdx`);
    }
    sections.push("");
  }

  // Guides section
  const guides = categories.get("guides");
  if (guides) {
    sections.push("## Guides\n");
    for (const page of guides) {
      sections.push(`- ${page.data.title}: ${baseUrl}${page.url}.mdx`);
    }
    sections.push("");
  }

  // Reference section
  const reference = categories.get("reference");
  if (reference) {
    sections.push("## Reference\n");
    for (const page of reference) {
      sections.push(`- ${page.data.title}: ${baseUrl}${page.url}.mdx`);
    }
    sections.push("");
  }

  // Any remaining categories
  for (const [category, categoryPages] of categories) {
    if (
      ["introduction", "core-concepts", "guides", "reference", "root"].includes(
        category,
      )
    ) {
      continue;
    }
    const title = category
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    sections.push(`## ${title}\n`);
    for (const page of categoryPages) {
      sections.push(`- ${page.data.title}: ${baseUrl}${page.url}.mdx`);
    }
    sections.push("");
  }

  return `# QUESTPIE CMS

> A headless CMS that lives inside your codebase

QUESTPIE CMS is a type-safe, embeddable headless CMS built with TypeScript. It integrates directly into your application, providing a powerful admin interface and API without external dependencies.

## Documentation

- Full documentation: ${baseUrl}/llms-full.txt
- Individual pages: ${baseUrl}/docs/{path}.mdx

${sections.join("\n")}
## Features

- Type-safe collections and fields using Drizzle ORM
- Built-in authentication with Better Auth
- File storage with Flydrive
- Background jobs with pg-boss
- Email templates with React Email
- Real-time subscriptions via SSE
- Framework adapters for Hono, Elysia, Next.js, and TanStack Start
`;
}

function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  const isLocalhost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
  // Use X-Forwarded-Proto header if behind reverse proxy, force https in production
  const protocol = isLocalhost
    ? "http"
    : request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || url.host;
  return `${protocol}://${host}`;
}

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseUrl = getBaseUrl(request);

        return new Response(generateLLMSTxt(baseUrl), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control":
              "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
        });
      },
    },
  },
});
