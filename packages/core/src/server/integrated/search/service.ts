import { and, eq, sql, inArray, or, desc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { questpieSearchTable } from "./collection";
import type {
	SearchService,
	SearchOptions,
	SearchResult,
	SearchConfig,
} from "./types";

/**
 * Search service implementation using Postgres 18+ features
 * - BM25 ranking for relevance
 * - Trigram fuzzy matching for typo tolerance
 * - Optional semantic search with embeddings
 */
export class SearchServiceImpl implements SearchService {
	constructor(
		private db: PostgresJsDatabase<any>,
		private config: SearchConfig = {},
	) {}

	/**
	 * Global search across collections
	 */
	async search(options: SearchOptions): Promise<SearchResult[]> {
		const {
			query,
			collections,
			locale = "en",
			limit = 10,
			offset = 0,
			strategy = this.config.defaultStrategy || "hybrid",
			similarity = this.config.similarity || 0.3,
			filters,
			highlights = true,
			loadRecord = false,
		} = options;

		// Build WHERE conditions
		const conditions: any[] = [];

		// Filter by collections
		if (collections && collections.length > 0) {
			conditions.push(
				inArray(questpieSearchTable.collectionName, collections),
			);
		}

		// Filter by locale
		conditions.push(eq(questpieSearchTable.locale, locale));

		// Filter by metadata
		if (filters) {
			for (const [key, value] of Object.entries(filters)) {
				conditions.push(
					sql`${questpieSearchTable.metadata}->>${key} = ${value}`,
				);
			}
		}

		// Build search query based on strategy
		let searchQuery;

		switch (strategy) {
			case "bm25":
				searchQuery = this.buildBM25Query(query, conditions, limit, offset);
				break;

			case "trigram":
				searchQuery = this.buildTrigramQuery(
					query,
					conditions,
					similarity,
					limit,
					offset,
				);
				break;

			case "semantic":
				// TODO: Implement when embeddings are added
				throw new Error("Semantic search not yet implemented");

			case "hybrid":
			default:
				searchQuery = this.buildHybridQuery(
					query,
					conditions,
					similarity,
					limit,
					offset,
				);
				break;
		}

		const rows = await searchQuery;

		// Map to SearchResult
		const results: SearchResult[] = rows.map((row: any) => ({
			id: row.id,
			collection: row.collection_name,
			recordId: row.record_id,
			score: Number(row.score) || 0,
			title: row.title,
			content: row.content,
			highlights: highlights
				? this.generateHighlights(query, row.title, row.content)
				: undefined,
			metadata: row.metadata || {},
			locale: row.locale,
			updatedAt: row.updated_at,
		}));

		// Load full records if requested
		if (loadRecord) {
			// TODO: Implement record loading with relations
			// This requires access to CMS instance and CRUD operations
		}

		return results;
	}

	/**
	 * Index a record
	 */
	async index(params: {
		collection: string;
		recordId: string;
		locale: string;
		title: string;
		content?: string;
		metadata?: Record<string, any>;
		embedding?: number[];
	}): Promise<void> {
		const { collection, recordId, locale, title, content, metadata } = params;

		// Upsert into search index
		await this.db
			.insert(questpieSearchTable)
			.values({
				collectionName: collection,
				recordId,
				locale,
				title,
				content,
				metadata: metadata || {},
				// embedding: embedding, // TODO: Add when pgvector type is ready
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [
					questpieSearchTable.collectionName,
					questpieSearchTable.recordId,
					questpieSearchTable.locale,
				],
				set: {
					title,
					content,
					metadata: metadata || {},
					// embedding: embedding,
					updatedAt: new Date(),
				},
			});
	}

	/**
	 * Remove from index
	 */
	async remove(params: {
		collection: string;
		recordId: string;
		locale?: string;
	}): Promise<void> {
		const { collection, recordId, locale } = params;

		const conditions = [
			eq(questpieSearchTable.collectionName, collection),
			eq(questpieSearchTable.recordId, recordId),
		];

		if (locale) {
			conditions.push(eq(questpieSearchTable.locale, locale));
		}

		await this.db
			.delete(questpieSearchTable)
			.where(and(...conditions));
	}

	/**
	 * Reindex entire collection
	 */
	async reindex(collection: string): Promise<void> {
		// TODO: Implement when we have access to CMS and collection metadata
		throw new Error("Reindex not yet implemented");
	}

	/**
	 * Clear entire search index
	 */
	async clear(): Promise<void> {
		await this.db.delete(questpieSearchTable);
	}

	/**
	 * Build BM25 query (Postgres 18+)
	 */
	private buildBM25Query(
		query: string,
		conditions: any[],
		limit: number,
		offset: number,
	) {
		const tsQuery = sql`websearch_to_tsquery('simple', ${query})`;
		const k1 = this.config.bm25?.k1 || 1.2;
		const b = this.config.bm25?.b || 0.75;

		return this.db
			.select({
				id: questpieSearchTable.id,
				collection_name: questpieSearchTable.collectionName,
				record_id: questpieSearchTable.recordId,
				title: questpieSearchTable.title,
				content: questpieSearchTable.content,
				metadata: questpieSearchTable.metadata,
				locale: questpieSearchTable.locale,
				updated_at: questpieSearchTable.updatedAt,
				// BM25 score
				score: sql<number>`ts_rank_bm25(
					${questpieSearchTable.ftsVector}::tsvector,
					${tsQuery},
					${k1}::real,
					${b}::real
				)`,
			})
			.from(questpieSearchTable)
			.where(
				and(
					...conditions,
					sql`${questpieSearchTable.ftsVector}::tsvector @@ ${tsQuery}`,
				),
			)
			.orderBy(desc(sql`ts_rank_bm25(
				${questpieSearchTable.ftsVector}::tsvector,
				${tsQuery},
				${k1}::real,
				${b}::real
			)`))
			.limit(limit)
			.offset(offset);
	}

	/**
	 * Build trigram query (fuzzy matching)
	 */
	private buildTrigramQuery(
		query: string,
		conditions: any[],
		similarity: number,
		limit: number,
		offset: number,
	) {
		return this.db
			.select({
				id: questpieSearchTable.id,
				collection_name: questpieSearchTable.collectionName,
				record_id: questpieSearchTable.recordId,
				title: questpieSearchTable.title,
				content: questpieSearchTable.content,
				metadata: questpieSearchTable.metadata,
				locale: questpieSearchTable.locale,
				updated_at: questpieSearchTable.updatedAt,
				// Similarity score
				score: sql<number>`similarity(${questpieSearchTable.title}, ${query})`,
			})
			.from(questpieSearchTable)
			.where(
				and(
					...conditions,
					sql`${questpieSearchTable.title} % ${query}`,
					sql`similarity(${questpieSearchTable.title}, ${query}) > ${similarity}`,
				),
			)
			.orderBy(desc(sql`similarity(${questpieSearchTable.title}, ${query})`))
			.limit(limit)
			.offset(offset);
	}

	/**
	 * Build hybrid query (BM25 + trigram)
	 * Combines full-text search with fuzzy matching
	 */
	private buildHybridQuery(
		query: string,
		conditions: any[],
		similarity: number,
		limit: number,
		offset: number,
	) {
		const tsQuery = sql`websearch_to_tsquery('simple', ${query})`;
		const k1 = this.config.bm25?.k1 || 1.2;
		const b = this.config.bm25?.b || 0.75;

		return this.db
			.select({
				id: questpieSearchTable.id,
				collection_name: questpieSearchTable.collectionName,
				record_id: questpieSearchTable.recordId,
				title: questpieSearchTable.title,
				content: questpieSearchTable.content,
				metadata: questpieSearchTable.metadata,
				locale: questpieSearchTable.locale,
				updated_at: questpieSearchTable.updatedAt,
				// Combined score: BM25 (70%) + Trigram (30%)
				score: sql<number>`(
					COALESCE(
						ts_rank_bm25(
							${questpieSearchTable.ftsVector}::tsvector,
							${tsQuery},
							${k1}::real,
							${b}::real
						), 0
					) * 0.7 +
					COALESCE(
						similarity(${questpieSearchTable.title}, ${query}), 0
					) * 0.3
				)`,
			})
			.from(questpieSearchTable)
			.where(
				and(
					...conditions,
					or(
						sql`${questpieSearchTable.ftsVector}::tsvector @@ ${tsQuery}`,
						sql`${questpieSearchTable.title} % ${query}`,
					),
				),
			)
			.orderBy(desc(sql`(
				COALESCE(
					ts_rank_bm25(
						${questpieSearchTable.ftsVector}::tsvector,
						${tsQuery},
						${k1}::real,
						${b}::real
					), 0
				) * 0.7 +
				COALESCE(
					similarity(${questpieSearchTable.title}, ${query}), 0
				) * 0.3
			)`))
			.limit(limit)
			.offset(offset);
	}

	/**
	 * Generate highlights for search results
	 */
	private generateHighlights(
		query: string,
		title?: string,
		content?: string,
	): { title?: string; content?: string } {
		const highlights: { title?: string; content?: string } = {};

		if (title) {
			// Simple highlighting: wrap matching terms in <mark> tags
			const regex = new RegExp(`(${query})`, "gi");
			highlights.title = title.replace(regex, "<mark>$1</mark>");
		}

		if (content) {
			// Extract snippet around match and highlight
			const regex = new RegExp(`(${query})`, "gi");
			const match = regex.exec(content);

			if (match) {
				const start = Math.max(0, match.index - 50);
				const end = Math.min(content.length, match.index + query.length + 50);
				let snippet = content.slice(start, end);

				if (start > 0) snippet = "..." + snippet;
				if (end < content.length) snippet = snippet + "...";

				highlights.content = snippet.replace(regex, "<mark>$1</mark>");
			}
		}

		return highlights;
	}
}

/**
 * Create search service instance
 */
export function createSearchService(
	db: PostgresJsDatabase<any>,
	config: SearchConfig = {},
): SearchService {
	return new SearchServiceImpl(db, config);
}
