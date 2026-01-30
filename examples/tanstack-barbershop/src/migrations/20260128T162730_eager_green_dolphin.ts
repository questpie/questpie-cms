import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260128T162730_eager_green_dolphin.json"

const snapshot = snapshotJson as OperationSnapshot

export const eagerGreenDolphin20260128T162730: Migration = {
	id: "eagerGreenDolphin20260128T162730",
	async up({ db }) {
		await db.execute(sql`CREATE TABLE "questpie_search" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"collection_name" text NOT NULL,
	"record_id" text NOT NULL,
	"locale" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"metadata" jsonb DEFAULT '{}',
	"fts_vector" tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple', coalesce(title, '')), 'A') || setweight(to_tsvector('simple', coalesce(content, '')), 'B')) STORED NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_search_entry" UNIQUE("collection_name","record_id","locale")
);`)
		await db.execute(sql`CREATE TABLE "questpie_search_facets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"search_id" text NOT NULL,
	"collection_name" text NOT NULL,
	"locale" text NOT NULL,
	"facet_name" text NOT NULL,
	"facet_value" text NOT NULL,
	"numeric_value" numeric,
	"created_at" timestamp DEFAULT now() NOT NULL
);`)
		await db.execute(sql`CREATE INDEX "idx_search_fts" ON "questpie_search" USING gin ("fts_vector");`)
		await db.execute(sql`CREATE INDEX "idx_search_trigram" ON "questpie_search" USING gin ("title" gin_trgm_ops);`)
		await db.execute(sql`CREATE INDEX "idx_search_collection_locale" ON "questpie_search" ("collection_name","locale");`)
		await db.execute(sql`CREATE INDEX "idx_search_record_id" ON "questpie_search" ("record_id");`)
		await db.execute(sql`CREATE INDEX "idx_facets_agg" ON "questpie_search_facets" ("collection_name","locale","facet_name","facet_value");`)
		await db.execute(sql`CREATE INDEX "idx_facets_search_id" ON "questpie_search_facets" ("search_id");`)
		await db.execute(sql`CREATE INDEX "idx_facets_collection" ON "questpie_search_facets" ("collection_name");`)
	},
	async down({ db }) {
		await db.execute(sql`DROP TABLE "questpie_search";`)
		await db.execute(sql`DROP TABLE "questpie_search_facets";`)
	},
	snapshot,
}
