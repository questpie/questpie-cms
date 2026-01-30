import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260127T123429_gentle_purple_griffin.json"

const snapshot = snapshotJson as OperationSnapshot

export const gentlePurpleGriffin20260127T123429: Migration = {
	id: "gentlePurpleGriffin20260127T123429",
	async up({ db }) {
		await db.execute(sql`ALTER TABLE "barbers" ADD COLUMN "bio" jsonb;`)
		await db.execute(sql`ALTER TABLE "barbers_i18n" DROP COLUMN "bio";`)
	},
	async down({ db }) {
		await db.execute(sql`ALTER TABLE "barbers_i18n" ADD COLUMN "bio" varchar(1000);`)
		await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "bio";`)
	},
	snapshot,
}
