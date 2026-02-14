/**
 * Homepage Route
 *
 * Renders the page with slug "home" from the CMS.
 */

import { createFileRoute } from "@tanstack/react-router";
import { PageRenderer } from "@/components/cms/PageRenderer";
import { getPage, type PageLoaderData } from "@/lib/getPages.function";

export const Route = createFileRoute("/_app/")({
	loader: async () => {
		return getPage({ data: { slug: "home" } });
	},
	component: HomepageComponent,
});

function HomepageComponent() {
	const { page } = Route.useLoaderData() as PageLoaderData;
	return <PageRenderer page={page} isHomepage />;
}
