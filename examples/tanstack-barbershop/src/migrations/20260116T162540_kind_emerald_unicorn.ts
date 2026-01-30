import type { Migration, OperationSnapshot } from "questpie";
import { sql } from "drizzle-orm";
import snapshotJson from "./snapshots/20260116T162540_kind_emerald_unicorn.json";

const snapshot = snapshotJson as OperationSnapshot;

export const kindEmeraldUnicorn20260116T162540: Migration = {
  id: "kindEmeraldUnicorn20260116T162540",
  async up({ db }) {
    await db.execute(sql`CREATE TABLE "adminSavedViews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" varchar(255) NOT NULL,
	"collection_name" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"configuration" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(
      sql`ALTER TABLE "services" ADD COLUMN "image" varchar(255);`,
    );
  },
  async down({ db }) {
    await db.execute(sql`DROP TABLE "adminSavedViews";`);
    await db.execute(sql`ALTER TABLE "services" DROP COLUMN "image";`);
  },
  snapshot,
};
