import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260123T180708_calm_red_panda.json"

const snapshot = snapshotJson as OperationSnapshot

export const calmRedPanda20260123T180708: Migration = {
	id: "calmRedPanda20260123T180708",
	async up({ db }) {
		await db.execute(sql`CREATE TABLE "pages" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(255) NOT NULL UNIQUE,
	"content" jsonb,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`)
		await db.execute(sql`CREATE TABLE "pages_i18n" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_id" text NOT NULL,
	"locale" text NOT NULL,
	"_localized" jsonb,
	"title" varchar(255) NOT NULL,
	"description" text,
	"meta_title" varchar(255),
	"meta_description" text
);`)
		await db.execute(sql`CREATE UNIQUE INDEX "pages_i18n_parent_id_locale_index" ON "pages_i18n" ("parent_id","locale");`)
		await db.execute(sql`ALTER TABLE "pages_i18n" ADD CONSTRAINT "pages_i18n_parent_id_pages_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pages"("id") ON DELETE CASCADE;`)
	},
	async down({ db }) {
		await db.execute(sql`ALTER TABLE "pages_i18n" DROP CONSTRAINT IF EXISTS "pages_i18n_parent_id_pages_id_fkey";`)
		await db.execute(sql`DROP TABLE "pages";`)
		await db.execute(sql`DROP TABLE "pages_i18n";`)
	},
	snapshot,
}
