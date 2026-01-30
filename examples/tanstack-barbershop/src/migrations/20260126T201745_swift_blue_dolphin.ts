import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260126T201745_swift_blue_dolphin.json"

const snapshot = snapshotJson as OperationSnapshot

export const swiftBlueDolphin20260126T201745: Migration = {
	id: "swiftBlueDolphin20260126T201745",
	async up({ db }) {
		await db.execute(sql`ALTER TABLE "barbers_i18n" ALTER COLUMN "bio" SET DATA TYPE varchar(1000) USING "bio"::varchar(1000);`)
	},
	async down({ db }) {
		await db.execute(sql`ALTER TABLE "barbers_i18n" ALTER COLUMN "bio" SET DATA TYPE text USING "bio"::text;`)
	},
	snapshot,
}
