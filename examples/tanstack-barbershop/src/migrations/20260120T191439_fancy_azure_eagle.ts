import type { Migration, OperationSnapshot } from "questpie";
import { sql } from "drizzle-orm";
import snapshotJson from "./snapshots/20260120T191439_fancy_azure_eagle.json";

const snapshot = snapshotJson as OperationSnapshot;

export const fancyAzureEagle20260120T191439: Migration = {
  id: "fancyAzureEagle20260120T191439",
  async up({ db }) {
    await db.execute(sql`CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"shopName" text DEFAULT 'The Barbershop' NOT NULL,
	"tagline" text DEFAULT 'Your Style, Our Passion',
	"contactEmail" text DEFAULT 'contact@barbershop.com' NOT NULL,
	"contactPhone" text DEFAULT '+1 234 567 890',
	"address" text DEFAULT '123 Main Street',
	"city" text DEFAULT 'New York',
	"zipCode" text DEFAULT '10001',
	"isOpen" boolean DEFAULT true NOT NULL,
	"bookingEnabled" boolean DEFAULT true NOT NULL,
	"bookingSettings" jsonb DEFAULT '{"minAdvanceHours":2,"maxAdvanceDays":30,"slotDurationMinutes":30,"allowCancellation":true,"cancellationDeadlineHours":24}',
	"socialLinks" jsonb DEFAULT '{}',
	"metaDescription" text DEFAULT 'Professional barbershop services - haircuts, beard grooming, and more.',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "site_settings_versions" (
	"version_id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"id" text NOT NULL,
	"version_number" integer NOT NULL,
	"version_operation" text NOT NULL,
	"version_user_id" text,
	"version_created_at" timestamp DEFAULT now() NOT NULL,
	"shopName" text DEFAULT 'The Barbershop' NOT NULL,
	"tagline" text DEFAULT 'Your Style, Our Passion',
	"contactEmail" text DEFAULT 'contact@barbershop.com' NOT NULL,
	"contactPhone" text DEFAULT '+1 234 567 890',
	"address" text DEFAULT '123 Main Street',
	"city" text DEFAULT 'New York',
	"zipCode" text DEFAULT '10001',
	"isOpen" boolean DEFAULT true NOT NULL,
	"bookingEnabled" boolean DEFAULT true NOT NULL,
	"bookingSettings" jsonb DEFAULT '{"minAdvanceHours":2,"maxAdvanceDays":30,"slotDurationMinutes":30,"allowCancellation":true,"cancellationDeadlineHours":24}',
	"socialLinks" jsonb DEFAULT '{}',
	"metaDescription" text DEFAULT 'Professional barbershop services - haircuts, beard grooming, and more.',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(
      sql`CREATE INDEX "site_settings_versions_id_version_number_index" ON "site_settings_versions" ("id","version_number");`,
    );
    await db.execute(
      sql`CREATE INDEX "site_settings_versions_version_created_at_index" ON "site_settings_versions" ("version_created_at");`,
    );
  },
  async down({ db }) {
    await db.execute(sql`DROP TABLE "site_settings";`);
    await db.execute(sql`DROP TABLE "site_settings_versions";`);
  },
  snapshot,
};
