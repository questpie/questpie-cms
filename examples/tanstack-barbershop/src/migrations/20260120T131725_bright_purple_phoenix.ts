import type { Migration, OperationSnapshot } from "questpie";
import { sql } from "drizzle-orm";
import snapshotJson from "./snapshots/20260120T131725_bright_purple_phoenix.json";

const snapshot = snapshotJson as OperationSnapshot;

export const brightPurplePhoenix20260120T131725: Migration = {
  id: "brightPurplePhoenix20260120T131725",
  async up({ db }) {
    await db.execute(sql`CREATE TABLE "admin_preferences" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" varchar(255) NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(
      sql`ALTER TABLE "adminSavedViews" RENAME TO "admin_saved_views";`,
    );
    await db.execute(
      sql`ALTER TABLE "barberServices" RENAME TO "barber_services";`,
    );
    await db.execute(
      sql`ALTER TABLE "barbers" ADD COLUMN "social_links" jsonb;`,
    );
    await db.execute(
      sql`CREATE UNIQUE INDEX "admin_preferences_user_key_idx" ON "admin_preferences" ("user_id","key");`,
    );
  },
  async down({ db }) {
    await db.execute(
      sql`ALTER TABLE "admin_saved_views" RENAME TO "adminSavedViews";`,
    );
    await db.execute(
      sql`ALTER TABLE "barber_services" RENAME TO "barberServices";`,
    );
    await db.execute(sql`DROP TABLE "admin_preferences";`);
    await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "social_links";`);
  },
  snapshot,
};
