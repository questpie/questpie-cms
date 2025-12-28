import type { SQL } from "drizzle-orm";

/**
 * Search configuration for a collection
 */
export type SearchableConfig = {
	/**
	 * Title is always indexed (from .title() method)
	 */
	title?: boolean;

	/**
	 * Extract searchable content from record
	 * @example content: (record) => extractTextFromJson(record.content)
	 */
	content?: (record: any) => string | null;

	/**
	 * Generate embeddings for semantic search (optional)
	 * @example embeddings: async (record, ctx) => await ctx.cms.embeddings.generate(text)
	 */
	embeddings?: (record: any, context: SearchableContext) => Promise<number[]>;

	/**
	 * Custom metadata to store in search index
	 * Useful for filtering search results
	 * @example metadata: (record) => ({ status: record.status, authorId: record.authorId })
	 */
	metadata?: (record: any) => Record<string, any>;

	/**
	 * Disable automatic indexing (manual control via hooks)
	 * @default false
	 */
	manual?: boolean;
};

export type SearchableContext = {
	cms: any;
	locale: string;
	defaultLocale: string;
};

/**
 * Search strategy
 */
export type SearchStrategy = "bm25" | "trigram" | "semantic" | "hybrid";

/**
 * Search query options
 */
export type SearchOptions = {
	/**
	 * Search query string
	 */
	query: string;

	/**
	 * Filter by collections (default: all searchable collections)
	 */
	collections?: string[];

	/**
	 * Search locale (default: context locale)
	 */
	locale?: string;

	/**
	 * Result limit (default: 10)
	 */
	limit?: number;

	/**
	 * Result offset (default: 0)
	 */
	offset?: number;

	/**
	 * Search strategy (default: "hybrid")
	 */
	strategy?: SearchStrategy;

	/**
	 * Minimum similarity score for trigram search (default: 0.3)
	 */
	similarity?: number;

	/**
	 * Metadata filters
	 * @example { status: "published", authorId: "123" }
	 */
	filters?: Record<string, any>;

	/**
	 * Include highlights in results (default: true)
	 */
	highlights?: boolean;

	/**
	 * Load full record with relations (default: false)
	 */
	loadRecord?: boolean;

	/**
	 * Relations to load if loadRecord is true
	 */
	with?: Record<string, any>;
};

/**
 * Search result
 */
export type SearchResult = {
	/**
	 * Search index ID
	 */
	id: string;

	/**
	 * Collection name
	 */
	collection: string;

	/**
	 * Record ID
	 */
	recordId: string;

	/**
	 * Search score (relevance)
	 */
	score: number;

	/**
	 * Title from index
	 */
	title: string;

	/**
	 * Content preview from index
	 */
	content?: string;

	/**
	 * Highlighted snippets
	 */
	highlights?: {
		title?: string;
		content?: string;
	};

	/**
	 * Custom metadata
	 */
	metadata: Record<string, any>;

	/**
	 * Full record (if loadRecord = true)
	 */
	record?: any;

	/**
	 * Locale
	 */
	locale: string;

	/**
	 * Last updated timestamp
	 */
	updatedAt: Date;
};

/**
 * Search service interface
 */
export type SearchService = {
	/**
	 * Global search across collections
	 */
	search(options: SearchOptions): Promise<SearchResult[]>;

	/**
	 * Index a record
	 */
	index(params: {
		collection: string;
		recordId: string;
		locale: string;
		title: string;
		content?: string;
		metadata?: Record<string, any>;
		embedding?: number[];
	}): Promise<void>;

	/**
	 * Remove from index
	 */
	remove(params: {
		collection: string;
		recordId: string;
		locale?: string; // If not provided, remove all locales
	}): Promise<void>;

	/**
	 * Reindex entire collection
	 */
	reindex(collection: string): Promise<void>;

	/**
	 * Clear entire search index
	 */
	clear(): Promise<void>;
};

/**
 * BM25 configuration
 */
export type BM25Config = {
	/**
	 * Term frequency saturation parameter (default: 1.2)
	 */
	k1?: number;

	/**
	 * Length normalization parameter (default: 0.75)
	 */
	b?: number;
};

/**
 * Embeddings provider configuration
 */
export type EmbeddingsConfig = {
	/**
	 * Provider (openai, custom, etc.)
	 */
	provider: "openai" | "custom";

	/**
	 * Model name
	 */
	model?: string;

	/**
	 * Embedding dimensions (default: 1536)
	 */
	dimensions?: number;

	/**
	 * API key (for OpenAI)
	 */
	apiKey?: string;

	/**
	 * Custom generation function
	 */
	generate?: (text: string) => Promise<number[]>;
};

/**
 * Search configuration
 */
export type SearchConfig = {
	/**
	 * Enable search service (default: true)
	 */
	enabled?: boolean;

	/**
	 * BM25 ranking parameters
	 */
	bm25?: BM25Config;

	/**
	 * Trigram similarity threshold (default: 0.3)
	 */
	similarity?: number;

	/**
	 * Embeddings configuration (optional)
	 */
	embeddings?: EmbeddingsConfig;

	/**
	 * Default search strategy (default: "hybrid")
	 */
	defaultStrategy?: SearchStrategy;
};
