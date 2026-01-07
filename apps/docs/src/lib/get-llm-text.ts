import { source } from "@/lib/source";
import type { InferPageType } from "fumadocs-core/source";

export async function getLLMText(page: InferPageType<typeof source>) {
	const content = await page.data.getText("raw");

	return `# ${page.data.title} (${page.url})

${content}`;
}
