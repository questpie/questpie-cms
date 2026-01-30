import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260127T133244_swift_purple_phoenix.json"

const snapshot = snapshotJson as OperationSnapshot

export const swiftPurplePhoenix20260127T133244: Migration = {
	id: "swiftPurplePhoenix20260127T133244",
	async up({ db }) {
		await db.execute(sql`ALTER TABLE "barbers_i18n" ADD COLUMN "bio" jsonb;`)
		await db.execute(sql`ALTER TABLE "services_i18n" ADD COLUMN "description" jsonb;`)
		await db.execute(sql`ALTER TABLE "services" DROP COLUMN "description";`)
		await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "bio";`)
	},
	async down({ db }) {
		await db.execute(sql`ALTER TABLE "services" ADD COLUMN "description" jsonb;`)
		await db.execute(sql`ALTER TABLE "barbers" ADD COLUMN "bio" jsonb;`)
		await db.execute(sql`ALTER TABLE "barbers_i18n" DROP COLUMN "bio";`)
		await db.execute(sql`ALTER TABLE "services_i18n" DROP COLUMN "description";`)
	},
	snapshot,
}
