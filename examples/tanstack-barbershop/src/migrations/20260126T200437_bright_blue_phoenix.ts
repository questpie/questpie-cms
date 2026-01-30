import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260126T200437_bright_blue_phoenix.json"

const snapshot = snapshotJson as OperationSnapshot

export const brightBluePhoenix20260126T200437: Migration = {
	id: "brightBluePhoenix20260126T200437",
	async up({ db }) {
		await db.execute(sql`ALTER TABLE "barbers" ADD COLUMN "bio" jsonb;`)
		await db.execute(sql`ALTER TABLE "services" ADD COLUMN "description" jsonb;`)
		await db.execute(sql`ALTER TABLE "services_i18n" DROP COLUMN "description";`)
		await db.execute(sql`ALTER TABLE "barbers_i18n" DROP COLUMN "bio";`)
	},
	async down({ db }) {
		await db.execute(sql`ALTER TABLE "services_i18n" ADD COLUMN "description" text;`)
		await db.execute(sql`ALTER TABLE "barbers_i18n" ADD COLUMN "bio" text;`)
		await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "bio";`)
		await db.execute(sql`ALTER TABLE "services" DROP COLUMN "description";`)
	},
	snapshot,
}
