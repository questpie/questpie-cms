import { createFileRoute } from "@tanstack/react-router";

type LLMSPage = {
	slugs: string[];
	url: string;
	data: {
		title?: string;
	};
};

function generateLLMSTxt(baseUrl: string, pages: LLMSPage[]) {
	// Group pages by first slug segment (section)
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

	const sectionOrder: Array<{ key: string; title: string }> = [
		{ key: "getting-started", title: "Getting Started" },
		{ key: "mentality", title: "Mentality" },
		{ key: "server", title: "Server" },
		{ key: "admin", title: "Admin" },
		{ key: "guides", title: "Guides" },
		{ key: "examples", title: "Examples" },
		{ key: "reference", title: "Reference" },
		{ key: "migration", title: "Migration" },
	];

	for (const section of sectionOrder) {
		const sectionPages = categories.get(section.key);
		if (!sectionPages?.length) continue;

		sections.push(`## ${section.title}\n`);
		for (const page of sectionPages) {
			sections.push(`- ${page.data.title}: ${baseUrl}${page.url}.mdx`);
		}
		sections.push("");
	}

	// Any remaining categories not listed above
	const covered = new Set(sectionOrder.map((s) => s.key));
	for (const [category, categoryPages] of categories) {
		if (covered.has(category) || category === "root") continue;

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

	return `# QUESTPIE Documentation

> Server-first TypeScript CMS framework

QUESTPIE helps you define schema, admin behavior, and runtime workflows in one server-first architecture.

## Documentation

- Full documentation: ${baseUrl}/llms-full.txt
- Individual pages: ${baseUrl}/docs/{path}.mdx

${sections.join("\n")}
## Architecture Notes

- Server defines WHAT (schema, introspection, policies, workflows)
- Client defines HOW (registry-based rendering and design system integration)
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
				const { source } = await import("@/lib/source");
				const baseUrl = getBaseUrl(request);
				const pages = source.getPages() as LLMSPage[];

				return new Response(generateLLMSTxt(baseUrl, pages), {
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
