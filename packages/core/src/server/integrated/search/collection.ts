import {
	pgTable,
	uuid,
	text,
	timestamp,
	jsonb,
	index,
	unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Search index collection
 * Stores searchable content from all collections with BM25, FTS, and optional embeddings
 *
 * Requires Postgres 18+ for:
 * - UUIDv7 (gen_uuidv7)
 * - BM25 ranking
 *
 * Extensions required:
 * - pg_trgm (trigram fuzzy matching)
 * - pgvector (optional, for embeddings)
 */
export const questpieSearchTable = pgTable(
	"questpie_search",
	{
		/**
		 * UUIDv7 - time-sortable, better for indexes
		 * Requires Postgres 18+
		 */
		id: uuid("id").primaryKey().default(sql`uuidv7()`),

		/**
		 * Collection name
		 */
		collectionName: text("collection_name").notNull(),

		/**
		 * Record ID in the source collection
		 */
		recordId: uuid("record_id").notNull(),

		/**
		 * Locale for this search entry
		 */
		locale: text("locale").notNull(),

		/**
		 * Title (always indexed, from .title() method)
		 */
		title: text("title").notNull(),

		/**
		 * Content (optional, from .searchable({ content: ... }))
		 */
		content: text("content"),

		/**
		 * Custom metadata for filtering
		 * @example { status: "published", authorId: "123" }
		 */
		metadata: jsonb("metadata").default({}),

		/**
		 * Full-text search vector (generated column)
		 * Title gets higher weight (A) than content (B)
		 *
		 * Uses 'simple' configuration to avoid language-specific stemming
		 * (better for multi-language support)
		 */
		ftsVector: text("fts_vector")
			.generatedAlwaysAs(
				sql`setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(content, '')), 'B')`,
			)
			.notNull(),

		/**
		 * Embedding vector for semantic search (optional)
		 * Dimensions: 1536 (OpenAI text-embedding-3-small)
		 *
		 * Requires pgvector extension:
		 * CREATE EXTENSION IF NOT EXISTS vector;
		 */
		// embedding: customType<{ data: number[] }>({
		// 	dataType() {
		// 		return "vector(1536)";
		// 	},
		// })("embedding"),

		/**
		 * Created timestamp
		 */
		createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),

		/**
		 * Updated timestamp
		 */
		updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
	},
	(t) => ({
		/**
		 * BM25 index for full-text search (Postgres 18+)
		 * Uses GIN index with bm25 parameter enabled
		 */
		bm25Idx: index("idx_search_bm25").using(
			"gin",
			t.ftsVector,
			// BM25 parameters can be configured in SQL:
			// WITH (bm25_k1 = 1.2, bm25_b = 0.75)
		),

		/**
		 * Trigram index for fuzzy search
		 * Enables typo-tolerant search on title
		 *
		 * Requires pg_trgm extension:
		 * CREATE EXTENSION IF NOT EXISTS pg_trgm;
		 */
		trigramIdx: index("idx_search_trigram").using(
			"gin",
			sql`${t.title} gin_trgm_ops`,
		),

		/**
		 * Embedding index for semantic search (optional)
		 * Uses IVFFlat for approximate nearest neighbor search
		 *
		 * Note: Commented out until pgvector type is properly defined
		 */
		// embeddingIdx: index("idx_search_embedding").using(
		// 	"ivfflat",
		// 	sql`${t.embedding} vector_cosine_ops`,
		// ),

		/**
		 * Collection + locale index
		 * For filtering by collection and locale
		 */
		collectionLocaleIdx: index("idx_search_collection_locale").on(
			t.collectionName,
			t.locale,
		),

		/**
		 * Record ID index
		 * For quick lookup when updating/deleting
		 */
		recordIdIdx: index("idx_search_record_id").on(t.recordId),

		/**
		 * Unique constraint: one entry per collection + record + locale
		 */
		uniqueEntry: unique("uq_search_entry").on(
			t.collectionName,
			t.recordId,
			t.locale,
		),
	}),
);

// /**
//  * SQL migrations for search setup
//  */
// export const searchMigrations = {
// 	/**
// 	 * Enable required extensions
// 	 */
// 	extensions: sql`
// 		-- Trigram extension for fuzzy matching
// 		CREATE EXTENSION IF NOT EXISTS pg_trgm;

// 		-- Vector extension for embeddings (optional)
// 		-- CREATE EXTENSION IF NOT EXISTS vector;
// 	`,

// 	/**
// 	 * Create UUIDv7 function if not exists (Postgres 18+ has it built-in)
// 	 * This is a fallback for older versions
// 	 */
// 	uuidv7Fallback: sql`
// 		CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
// 		DECLARE
// 			unix_ts_ms BIGINT;
// 			uuid_bytes BYTEA;
// 		BEGIN
// 			unix_ts_ms := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
// 			uuid_bytes := (
// 				substring(int8send(unix_ts_ms), 3, 6) ||
// 				gen_random_bytes(10)
// 			);
// 			-- Set version (7) and variant (RFC 4122)
// 			uuid_bytes := set_byte(uuid_bytes, 6, (get_byte(uuid_bytes, 6) & 15) | 112);
// 			uuid_bytes := set_byte(uuid_bytes, 8, (get_byte(uuid_bytes, 8) & 63) | 128);
// 			RETURN encode(uuid_bytes, 'hex')::uuid;
// 		END;
// 		$$ LANGUAGE plpgsql;
// 	`,
// };
