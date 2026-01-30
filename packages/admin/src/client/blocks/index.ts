/**
 * Block System Exports
 *
 * Core types and components for the visual page building system.
 */

// Components
export {
	BlockRenderer,
	type BlockRendererProps as BlockRendererComponentProps,
} from "./block-renderer.js";
// Prefetch utilities
export {
	type BlockPrefetchContext,
	BlockPrefetchError,
	type BlockPrefetchParams,
	type BlockPrefetchResult,
	prefetchBlockData,
	type TypedBlockPrefetch,
} from "./prefetch.js";
// Types
export type {
	BlockCategory,
	BlockContent,
	BlockNode,
	BlockPrefetch,
	BlockRendererProps,
} from "./types.js";
export {
	createBlockNode,
	EMPTY_BLOCK_CONTENT,
	isBlockContent,
} from "./types.js";
