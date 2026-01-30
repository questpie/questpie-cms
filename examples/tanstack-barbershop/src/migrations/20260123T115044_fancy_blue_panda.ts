import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260123T115044_fancy_blue_panda.json"

const snapshot = snapshotJson as OperationSnapshot

export const fancyBluePanda20260123T115044: Migration = {
	id: "fancyBluePanda20260123T115044",
	async up({ db }) {
		await db.execute(sql`ALTER TABLE "services_i18n" ADD COLUMN "_localized" jsonb;`)
	},
	async down({ db }) {
		await db.execute(sql`ALTER TABLE "services_i18n" DROP COLUMN "_localized";`)
	},
	snapshot,
}
