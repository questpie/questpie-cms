import type { Migration, OperationSnapshot } from "questpie";
import { sql } from "drizzle-orm";
import snapshotJson from "./snapshots/20260117T120326_calm_pink_panda.json";

const snapshot = snapshotJson as OperationSnapshot;

export const calmPinkPanda20260117T120326: Migration = {
  id: "calmPinkPanda20260117T120326",
  async up({ db }) {
    await db.execute(sql`CREATE TABLE "barberServices" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"barber_id" text NOT NULL,
	"service_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(
      sql`ALTER TABLE "barberServices" ADD CONSTRAINT "barberServices_barber_id_barbers_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE;`,
    );
    await db.execute(
      sql`ALTER TABLE "barberServices" ADD CONSTRAINT "barberServices_service_id_services_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE;`,
    );
  },
  async down({ db }) {
    await db.execute(sql`DROP TABLE "barberServices";`);
  },
  snapshot,
};
