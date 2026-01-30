/**
 * Block System Types
 *
 * Core types for the visual page building system.
 * Server stores blocks as JSONB with $i18n markers - these types
 * define the client-side structure and rendering.
 */

import type * as React from "react";

/**
 * Block node in the tree structure.
 * Represents a single block instance with its position and children.
 */
export type BlockNode = {
	/** Unique block instance ID (UUID) */
	id: string;
	/** Block type name (e.g., "hero", "columns", "text") */
	type: string;
	/** Child blocks (for layout blocks that accept children) */
	children: BlockNode[];
};

/**
 * Block content structure stored in JSONB.
 * This is the shape of data stored in the database and passed to BlockRenderer.
 */
export type BlockContent = {
	/** Block tree with hierarchy and order */
	_tree: BlockNode[];
	/** Block values indexed by block ID */
	_values: Record<string, Record<string, unknown>>;
};

/**
 * Block category for organization in the block picker.
 * Categories help users find blocks quickly when adding new content.
 */
export type BlockCategory =
	| "layout" // Columns, Grid, Container, Section
	| "content" // Text, Heading, List, Quote
	| "media" // Image, Video, Gallery, Audio
	| "sections" // Hero, Features, Testimonials, CTA
	| "interactive" // Form, Accordion, Tabs, Carousel
	| (string & {}); // Custom categories

/**
 * Props passed to block renderer components.
 * Each block receives these props when being rendered.
 */
export type BlockRendererProps<TValues = Record<string, unknown>> = {
	/** Block instance ID */
	id: string;
	/** Block field values (merged with i18n for current locale) */
	values: TValues;
	/** Data from prefetch function (if defined on block) */
	data?: unknown;
	/** Rendered child blocks (for layout blocks) */
	children?: React.ReactNode;
	/** Whether this block is currently selected in the editor */
	isSelected?: boolean;
	/** Whether rendering in preview mode */
	isPreview?: boolean;
};

/**
 * Block prefetch function type.
 * Called during SSR to fetch data needed by the block.
 * Use with prefetchBlockData() utility in route loaders.
 *
 * @see prefetchBlockData in ./prefetch.ts
 */
export type BlockPrefetch<TData = unknown, TCms = unknown> = (params: {
	/** Block instance ID */
	id: string;
	/** Block field values */
	values: Record<string, unknown>;
	/** CMS client for data fetching */
	cms: TCms;
	/** Current locale */
	locale: string;
	/** Default/fallback locale */
	defaultLocale: string;
	/** Original request (for headers, cookies, auth) */
	request?: Request;
}) => Promise<TData>;

/**
 * Empty block content for initialization.
 */
export const EMPTY_BLOCK_CONTENT: BlockContent = {
	_tree: [],
	_values: {},
};

/**
 * Check if a value is a valid BlockContent structure.
 */
export function isBlockContent(value: unknown): value is BlockContent {
	if (value == null || typeof value !== "object") return false;
	const obj = value as Record<string, unknown>;
	return (
		Array.isArray(obj._tree) &&
		typeof obj._values === "object" &&
		obj._values !== null
	);
}

/**
 * Create a new block node with generated ID.
 */
export function createBlockNode(
	type: string,
	children: BlockNode[] = [],
): BlockNode {
	return {
		id: crypto.randomUUID(),
		type,
		children,
	};
}
