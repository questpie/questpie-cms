import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260121T194313_fancy_pink_unicorn.json"

const snapshot = snapshotJson as OperationSnapshot

export const fancyPinkUnicorn20260121T194313: Migration = {
	id: "fancyPinkUnicorn20260121T194313",
	async up({ db }) {
		await db.execute(sql`CREATE TABLE "services_i18n" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_id" text NOT NULL,
	"locale" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text
);`)
		await db.execute(sql`ALTER TABLE "services" DROP COLUMN "name";`)
		await db.execute(sql`ALTER TABLE "services" DROP COLUMN "description";`)
		await db.execute(sql`CREATE UNIQUE INDEX "services_i18n_parent_id_locale_index" ON "services_i18n" ("parent_id","locale");`)
		await db.execute(sql`ALTER TABLE "services_i18n" ADD CONSTRAINT "services_i18n_parent_id_services_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "services"("id") ON DELETE CASCADE;`)
	},
	async down({ db }) {
		await db.execute(sql`DROP TABLE "services_i18n";`)
		await db.execute(sql`ALTER TABLE "services" ADD COLUMN "name" varchar(255) NOT NULL;`)
		await db.execute(sql`ALTER TABLE "services" ADD COLUMN "description" text;`)
	},
	snapshot,
}
