import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260127T134124_bold_azure_falcon.json"

const snapshot = snapshotJson as OperationSnapshot

export const boldAzureFalcon20260127T134124: Migration = {
	id: "boldAzureFalcon20260127T134124",
	async up({ db }) {
		await db.execute(sql`ALTER TABLE "barbers_i18n" ADD COLUMN "specialties" jsonb;`)
		await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "specialties";`)
	},
	async down({ db }) {
		await db.execute(sql`ALTER TABLE "barbers" ADD COLUMN "specialties" jsonb;`)
		await db.execute(sql`ALTER TABLE "barbers_i18n" DROP COLUMN "specialties";`)
	},
	snapshot,
}
