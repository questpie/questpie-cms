import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260126T201652_swift_azure_dolphin.json"

const snapshot = snapshotJson as OperationSnapshot

export const swiftAzureDolphin20260126T201652: Migration = {
	id: "swiftAzureDolphin20260126T201652",
	async up({ db }) {
		await db.execute(sql`ALTER TABLE "barbers_i18n" ADD COLUMN "bio" text;`)
		await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "bio";`)
	},
	async down({ db }) {
		await db.execute(sql`ALTER TABLE "barbers" ADD COLUMN "bio" jsonb;`)
		await db.execute(sql`ALTER TABLE "barbers_i18n" DROP COLUMN "bio";`)
	},
	snapshot,
}
