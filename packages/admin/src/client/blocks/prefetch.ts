/**
 * Block Prefetch Utilities
 *
 * SSR data prefetching for blocks that need external data.
 * Allows blocks to declare prefetch functions that are executed
 * in route loaders on the server.
 *
 * @example
 * ```ts
 * // In route loader (TanStack Start, Next.js, Hono, etc.)
 * const blockData = await prefetchBlockData(page.content, blocks, {
 *   locale: "en",
 *   defaultLocale: "en",
 *   cms: cmsClient,
 * });
 *
 * // Pass to BlockRenderer
 * <BlockRenderer content={page.content} blocks={blocks} data={blockData} />
 * ```
 */

import type { BlockDefinition } from "../builder/block/types.js";
import type { BlockContent, BlockNode } from "./types.js";

/**
 * Context passed to block prefetch functions.
 * Provides access to CMS client, locale info, and request context.
 */
export type BlockPrefetchContext<TCms = unknown> = {
	/** CMS client for data fetching */
	cms: TCms;
	/** Current locale for the request */
	locale: string;
	/** Default/fallback locale */
	defaultLocale: string;
	/** Original request object (for headers, cookies, auth) */
	request?: Request;
};

/**
 * Extended context passed to individual block prefetch functions.
 * Includes block-specific values in addition to the base context.
 */
export type BlockPrefetchParams<TCms = unknown> = BlockPrefetchContext<TCms> & {
	/** Block instance ID */
	id: string;
	/** Block field values */
	values: Record<string, unknown>;
};

/**
 * Result map from prefetchBlockData.
 * Keys are block IDs, values are the data returned by each block's prefetch.
 */
export type BlockPrefetchResult = Record<string, unknown>;

/**
 * Internal type for tracking prefetch requirements.
 */
type PrefetchRequirement = {
	blockId: string;
	blockType: string;
	prefetch: (params: BlockPrefetchParams<unknown>) => Promise<unknown>;
	values: Record<string, unknown>;
};

/**
 * Recursively collect all blocks with prefetch functions.
 */
function collectPrefetchRequirements(
	nodes: BlockNode[],
	blocks: Record<string, BlockDefinition>,
	values: Record<string, Record<string, unknown>>,
	requirements: PrefetchRequirement[],
): void {
	for (const node of nodes) {
		const blockDef = blocks[node.type];

		if (blockDef?.prefetch) {
			requirements.push({
				blockId: node.id,
				blockType: node.type,
				prefetch: blockDef.prefetch as (
					params: BlockPrefetchParams<unknown>,
				) => Promise<unknown>,
				values: values[node.id] || {},
			});
		}

		// Process children recursively
		if (node.children?.length) {
			collectPrefetchRequirements(node.children, blocks, values, requirements);
		}
	}
}

/**
 * Prefetch data for all blocks that have prefetch functions.
 *
 * This function should be called in your route loader (server-side) to
 * fetch all data needed by blocks before rendering. It executes all
 * prefetch functions in parallel for optimal performance.
 *
 * @param content - Block content from the collection (contains _tree and _values)
 * @param blocks - Registered block definitions (with optional prefetch functions)
 * @param context - Prefetch context with CMS client, locale, and optional request
 *
 * @returns Promise resolving to a map of block ID -> prefetched data
 *
 * @example
 * ```ts
 * // TanStack Start loader
 * export const Route = createFileRoute("/$locale/pages/$slug")({
 *   loader: async ({ params, context }) => {
 *     const page = await context.cms.pages.findOne({ where: { slug: params.slug } });
 *
 *     const blockData = await prefetchBlockData(page.content, blocks, {
 *       cms: context.cms,
 *       locale: params.locale,
 *       defaultLocale: "en",
 *     });
 *
 *     return { page, blockData };
 *   },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Next.js App Router
 * export default async function Page({ params }) {
 *   const page = await cms.pages.findOne({ where: { slug: params.slug } });
 *
 *   const blockData = await prefetchBlockData(page.content, blocks, {
 *     cms,
 *     locale: params.locale,
 *     defaultLocale: "en",
 *   });
 *
 *   return <PageContent page={page} blockData={blockData} />;
 * }
 * ```
 */
export async function prefetchBlockData<TCms = unknown>(
	content: BlockContent | null | undefined,
	blocks: Record<string, BlockDefinition>,
	context: BlockPrefetchContext<TCms>,
): Promise<BlockPrefetchResult> {
	// Handle empty or invalid content
	if (!content?._tree?.length) {
		return {};
	}

	// Collect all blocks with prefetch functions
	const requirements: PrefetchRequirement[] = [];
	collectPrefetchRequirements(
		content._tree,
		blocks,
		content._values,
		requirements,
	);

	// No prefetch needed
	if (requirements.length === 0) {
		return {};
	}

	// Execute all prefetch functions in parallel
	const results = await Promise.allSettled(
		requirements.map(async ({ blockId, blockType, prefetch, values }) => {
			try {
				const data = await prefetch({
					...context,
					id: blockId,
					values,
				});
				return { blockId, data };
			} catch (error) {
				// Re-throw with block context for better debugging
				throw new BlockPrefetchError(blockId, blockType, error);
			}
		}),
	);

	// Build result map, logging errors but not failing the entire page
	const prefetchResult: BlockPrefetchResult = {};

	for (const result of results) {
		if (result.status === "fulfilled") {
			prefetchResult[result.value.blockId] = result.value.data;
		} else {
			// Log error but continue - block will render without data
			if (process.env.NODE_ENV !== "production") {
				console.error("[prefetchBlockData]", result.reason);
			}
		}
	}

	return prefetchResult;
}

/**
 * Error thrown when a block's prefetch function fails.
 * Includes block context for easier debugging.
 */
export class BlockPrefetchError extends Error {
	constructor(
		public readonly blockId: string,
		public readonly blockType: string,
		public readonly cause: unknown,
	) {
		const message =
			cause instanceof Error ? cause.message : "Unknown prefetch error";
		super(`Block prefetch failed for "${blockType}" (${blockId}): ${message}`);
		this.name = "BlockPrefetchError";
	}
}

/**
 * Type helper for creating typed prefetch functions.
 *
 * @example
 * ```ts
 * type PostsData = { posts: Post[] };
 *
 * const prefetchPosts: TypedBlockPrefetch<PostsData, CMSClient> = async ({
 *   cms,
 *   values,
 *   locale,
 * }) => {
 *   const posts = await cms.posts.find({ limit: values.count, locale });
 *   return { posts };
 * };
 * ```
 */
export type TypedBlockPrefetch<TData, TCms = unknown> = (
	params: BlockPrefetchParams<TCms>,
) => Promise<TData>;
