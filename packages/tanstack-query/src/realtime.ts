/**
 * Realtime utilities for TanStack Query integration
 *
 * Uses SSE multiplexer to efficiently handle multiple subscriptions
 * over a single HTTP connection.
 */

import {
	getMultiplexer,
	type TopicConfig,
	type TopicInput,
} from "./multiplexer.js";

// Re-export types
export type { TopicConfig, TopicInput } from "./multiplexer.js";
export { destroyAllMultiplexers, getMultiplexer } from "./multiplexer.js";

// ============================================================================
// Types
// ============================================================================

export type SSESnapshotOptions = {
	/** Base URL for the CMS API (e.g., "/api/cms") */
	baseUrl: string;
	/** Topic configuration */
	topic: TopicConfig;
	/** Include credentials (cookies) - defaults to true */
	withCredentials?: boolean;
	/** Abort signal for cleanup */
	signal?: AbortSignal;
	/** Optional custom topic ID */
	customId?: string;
};

export type RealtimeQueryConfig = {
	/** Base URL for realtime endpoints */
	baseUrl: string;
	/** Whether realtime is enabled */
	enabled?: boolean;
	/** Include credentials */
	withCredentials?: boolean;
};

// ============================================================================
// SSE Snapshot Stream
// ============================================================================

/**
 * Create an AsyncGenerator that yields snapshot data via the SSE multiplexer.
 *
 * This function uses a shared multiplexer connection to efficiently handle
 * multiple subscriptions without hitting browser connection limits.
 *
 * Use with TanStack Query's experimental `streamedQuery`:
 *
 * @example
 * ```ts
 * import { experimental_streamedQuery as streamedQuery } from '@tanstack/react-query'
 *
 * const { data } = useQuery({
 *   queryKey: ['posts'],
 *   queryFn: streamedQuery({
 *     streamFn: ({ signal }) => sseSnapshotStream({
 *       baseUrl: '/api/cms',
 *       topic: { resourceType: 'collection', resource: 'posts' },
 *       signal,
 *     }),
 *     reducer: (_, chunk) => chunk, // Replace with latest snapshot
 *     initialValue: undefined,
 *   }),
 * })
 * ```
 */
export async function* sseSnapshotStream<TData>(
	options: SSESnapshotOptions,
): AsyncGenerator<TData, void, unknown> {
	const { baseUrl, topic, withCredentials = true, signal, customId } = options;

	// Queue for data waiting to be consumed
	const queue: TData[] = [];

	// Promise resolver for when new data arrives
	let resolveNext: (() => void) | null = null;

	// Track if the stream is closed
	let closed = false;

	// Get the shared multiplexer for this base URL
	const multiplexer = getMultiplexer(baseUrl, withCredentials);

	// Subscribe to the topic via multiplexer
	const unsubscribe = multiplexer.subscribe(
		topic,
		(data) => {
			if (!closed) {
				queue.push(data as TData);
				resolveNext?.();
			}
		},
		signal,
		customId,
	);

	try {
		while (!closed && !signal?.aborted) {
			// Yield all queued items
			while (queue.length > 0) {
				yield queue.shift()!;
			}

			// Wait for more data
			if (!closed && !signal?.aborted) {
				await new Promise<void>((resolve) => {
					resolveNext = resolve;
				});
				resolveNext = null;
			}
		}
	} finally {
		closed = true;
		unsubscribe();
	}
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a topic config for a collection query.
 */
export function buildCollectionTopic(
	collectionName: string,
	options?: {
		where?: Record<string, unknown>;
		with?: Record<string, unknown>;
		limit?: number;
		offset?: number;
		orderBy?: Record<string, "asc" | "desc">;
	},
): TopicConfig {
	return {
		resourceType: "collection",
		resource: collectionName,
		...(options?.where && { where: options.where }),
		...(options?.with && { with: options.with }),
		...(options?.limit !== undefined && { limit: options.limit }),
		...(options?.offset !== undefined && { offset: options.offset }),
		...(options?.orderBy && { orderBy: options.orderBy }),
	};
}

/**
 * Build a topic config for a global query.
 */
export function buildGlobalTopic(
	globalName: string,
	options?: {
		where?: Record<string, unknown>;
		with?: Record<string, unknown>;
	},
): TopicConfig {
	return {
		resourceType: "global",
		resource: globalName,
		...(options?.where && { where: options.where }),
		...(options?.with && { with: options.with }),
	};
}
