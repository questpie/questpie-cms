import type { BlockNode, BlockPrefetchResult } from "@questpie/admin/client";
import { prefetchBlockData } from "@questpie/admin/client";
import { isDraftMode } from "@questpie/admin/shared";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { client } from "@/lib/cms-client";
import blocks from "@/questpie/admin/blocks";

function getLocaleFromCookie(cookieHeader?: string): "en" | "sk" {
	if (!cookieHeader) return "en";
	const match = cookieHeader.match(/barbershop-locale=([^;]+)/);
	return match?.[1] === "sk" ? "sk" : "en";
}

export type PageLoaderData = {
	page: {
		id: string;
		title: string;
		slug: string;
		description: string | null;
		content: SerializableBlockContent | null;
		metaTitle: string | null;
		metaDescription: string | null;
		isPublished: boolean;
	};
	blockData: BlockPrefetchResult;
};

type SerializableBlockContent = {
	_tree: BlockNode[];
	_values: Record<string, Record<string, {}>>;
};

export const getPage = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const cookie = headers.get("cookie");
		const cookieHeader = cookie ? String(cookie) : undefined;
		const isDraft = isDraftMode(cookieHeader);
		const locale = getLocaleFromCookie(cookieHeader);

		// Fetch page from CMS
		type PageRecord = {
			id: string;
			title: string;
			slug: string;
			description: string | null;
			content: SerializableBlockContent | null;
			metaTitle: string | null;
			metaDescription: string | null;
			isPublished: boolean;
		};

		// TODO: tighten pages collection types from client
		const page = (await client.collections.pages.findOne({
			where: isDraft
				? { slug: data.slug }
				: { slug: data.slug, isPublished: true },
			locale,
		} satisfies Parameters<
			typeof client.collections.pages.findOne
		>[0])) as unknown as PageRecord | null;

		if (!page) {
			throw notFound();
		}

		const content = page.content || null;

		const blockData: BlockPrefetchResult = content
			? await prefetchBlockData(content, blocks, {
					// TODO: strengthen prefetch context types (cms client + blocks map)
					cms: client.collections,
					locale,
					defaultLocale: "en",
				})
			: {};

		return {
			page: {
				id: page.id,
				title: page.title,
				slug: page.slug,
				description: page.description,
				content,
				metaTitle: page.metaTitle,
				metaDescription: page.metaDescription,
				isPublished: page.isPublished,
			},
			blockData,
		};
	});
