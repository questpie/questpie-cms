import type { BlockNode } from "@questpie/admin/client";
import { isDraftMode } from "@questpie/admin/shared";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { cms, getRequestLocale } from "@/lib/server-helpers";

// Use a compatible type shape that matches ServerFn expectations
// The _values uses {} instead of unknown for compatibility
export type PageLoaderData = {
	page: {
		id: string;
		title: string;
		slug: string;
		description: string | null;
		content: {
			_tree: BlockNode[];
			_values: Record<string, Record<string, {}>>;
			_data?: Record<string, Record<string, {}>>;
		} | null;
		metaTitle: string | null;
		metaDescription: string | null;
		isPublished: boolean;
	};
};

export const getPage = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const cookie = headers.get("cookie");
		const cookieHeader = cookie ? String(cookie) : undefined;
		const isDraft = isDraftMode(cookieHeader);
		const locale = getRequestLocale();

		// Use direct CMS API for proper afterRead hooks (including blocks prefetch)
		const ctx = await cms.createContext({
			accessMode: "system",
			locale,
		});

		const page = (await cms.api.collections.pages.findOne(
			{
				where: isDraft
					? { slug: data.slug }
					: { slug: data.slug, isPublished: true },
			},
			ctx,
		)) as unknown as PageLoaderData["page"] | null;

		if (!page) {
			throw notFound();
		}

		return {
			page: {
				id: page.id,
				title: page.title,
				slug: page.slug,
				description: page.description,
				content: page.content as any,
				metaTitle: page.metaTitle,
				metaDescription: page.metaDescription,
				isPublished: page.isPublished,
			},
		} as PageLoaderData;
	});
