import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/20260126T143625_happy_crimson_panda.json"

const snapshot = snapshotJson as OperationSnapshot

export const happyCrimsonPanda20260126T143625: Migration = {
	id: "happyCrimsonPanda20260126T143625",
	async up({ db }) {
		await db.execute(sql`CREATE TABLE "barbers_i18n" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_id" text NOT NULL,
	"locale" text NOT NULL,
	"_localized" jsonb,
	"bio" text
);`)
		await db.execute(sql`CREATE TABLE "reviews_i18n" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_id" text NOT NULL,
	"locale" text NOT NULL,
	"_localized" jsonb,
	"comment" text
);`)
		await db.execute(sql`CREATE TABLE "site_settings_i18n" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_id" text NOT NULL,
	"locale" text NOT NULL,
	"tagline" text DEFAULT 'Your Style, Our Passion',
	"navigation" jsonb DEFAULT '[{"label":"Home","href":"/"},{"label":"Services","href":"/services"},{"label":"Our Team","href":"/barbers"},{"label":"Contact","href":"/contact"}]',
	"ctaButtonText" text DEFAULT 'Book Now',
	"footerTagline" text DEFAULT 'Your Style, Our Passion',
	"footerLinks" jsonb DEFAULT '[{"label":"Services","href":"/services"},{"label":"Our Team","href":"/barbers"},{"label":"Contact","href":"/contact"},{"label":"Privacy Policy","href":"/privacy"}]',
	"copyrightText" text DEFAULT 'Sharp Cuts. All rights reserved.',
	"metaTitle" text DEFAULT 'Sharp Cuts - Premium Barbershop',
	"metaDescription" text DEFAULT 'Professional barbershop services - haircuts, beard grooming, and more.'
);`)
		await db.execute(sql`CREATE TABLE "site_settings_i18n_versions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"parent_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"locale" text NOT NULL,
	"tagline" text DEFAULT 'Your Style, Our Passion',
	"navigation" jsonb DEFAULT '[{"label":"Home","href":"/"},{"label":"Services","href":"/services"},{"label":"Our Team","href":"/barbers"},{"label":"Contact","href":"/contact"}]',
	"ctaButtonText" text DEFAULT 'Book Now',
	"footerTagline" text DEFAULT 'Your Style, Our Passion',
	"footerLinks" jsonb DEFAULT '[{"label":"Services","href":"/services"},{"label":"Our Team","href":"/barbers"},{"label":"Contact","href":"/contact"},{"label":"Privacy Policy","href":"/privacy"}]',
	"copyrightText" text DEFAULT 'Sharp Cuts. All rights reserved.',
	"metaTitle" text DEFAULT 'Sharp Cuts - Premium Barbershop',
	"metaDescription" text DEFAULT 'Professional barbershop services - haircuts, beard grooming, and more.'
);`)
		await db.execute(sql`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_appointment_id_key";`)
		await db.execute(sql`ALTER TABLE "barbers" ADD COLUMN "slug" varchar(255) NOT NULL;`)
		await db.execute(sql`ALTER TABLE "barbers" ADD COLUMN "specialties" jsonb;`)
		await db.execute(sql`ALTER TABLE "reviews" ADD COLUMN "customer_name" varchar(255) NOT NULL;`)
		await db.execute(sql`ALTER TABLE "reviews" ADD COLUMN "customer_email" varchar(255);`)
		await db.execute(sql`ALTER TABLE "reviews" ADD COLUMN "is_approved" boolean DEFAULT false NOT NULL;`)
		await db.execute(sql`ALTER TABLE "reviews" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;`)
		await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN "logo" varchar(500);`)
		await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN "ctaButtonLink" text DEFAULT '/booking';`)
		await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN "country" text DEFAULT 'USA';`)
		await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN "map_embed_url" text;`)
		await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN "business_hours" jsonb DEFAULT '{"monday":{"isOpen":true,"start":"09:00","end":"18:00"},"tuesday":{"isOpen":true,"start":"09:00","end":"18:00"},"wednesday":{"isOpen":true,"start":"09:00","end":"18:00"},"thursday":{"isOpen":true,"start":"09:00","end":"20:00"},"friday":{"isOpen":true,"start":"09:00","end":"20:00"},"saturday":{"isOpen":true,"start":"10:00","end":"16:00"},"sunday":{"isOpen":false,"start":"","end":""}}';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ADD COLUMN "logo" varchar(500);`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ADD COLUMN "ctaButtonLink" text DEFAULT '/booking';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ADD COLUMN "country" text DEFAULT 'USA';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ADD COLUMN "map_embed_url" text;`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ADD COLUMN "business_hours" jsonb DEFAULT '{"monday":{"isOpen":true,"start":"09:00","end":"18:00"},"tuesday":{"isOpen":true,"start":"09:00","end":"18:00"},"wednesday":{"isOpen":true,"start":"09:00","end":"18:00"},"thursday":{"isOpen":true,"start":"09:00","end":"20:00"},"friday":{"isOpen":true,"start":"09:00","end":"20:00"},"saturday":{"isOpen":true,"start":"10:00","end":"16:00"},"sunday":{"isOpen":false,"start":"","end":""}}';`)
		await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "bio";`)
		await db.execute(sql`ALTER TABLE "reviews" DROP COLUMN "comment";`)
		await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN "tagline";`)
		await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN "metaDescription";`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" DROP COLUMN "tagline";`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" DROP COLUMN "metaDescription";`)
		await db.execute(sql`ALTER TABLE "reviews" ALTER COLUMN "appointment_id" DROP NOT NULL;`)
		await db.execute(sql`ALTER TABLE "reviews" ALTER COLUMN "customer_id" DROP NOT NULL;`)
		await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "shopName" SET DEFAULT 'Sharp Cuts';`)
		await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "contactEmail" SET DEFAULT 'hello@barbershop.com';`)
		await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "contactPhone" SET DEFAULT '+1 555 0100';`)
		await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "socialLinks" SET DEFAULT '[{"platform":"instagram","url":"https://instagram.com/sharpcuts"},{"platform":"facebook","url":"https://facebook.com/sharpcuts"}]';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ALTER COLUMN "shopName" SET DEFAULT 'Sharp Cuts';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ALTER COLUMN "contactEmail" SET DEFAULT 'hello@barbershop.com';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ALTER COLUMN "contactPhone" SET DEFAULT '+1 555 0100';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ALTER COLUMN "socialLinks" SET DEFAULT '[{"platform":"instagram","url":"https://instagram.com/sharpcuts"},{"platform":"facebook","url":"https://facebook.com/sharpcuts"}]';`)
		await db.execute(sql`ALTER TABLE "barbers" ADD CONSTRAINT "barbers_slug_key" UNIQUE("slug");`)
		await db.execute(sql`CREATE UNIQUE INDEX "barbers_i18n_parent_id_locale_index" ON "barbers_i18n" ("parent_id","locale");`)
		await db.execute(sql`CREATE UNIQUE INDEX "reviews_i18n_parent_id_locale_index" ON "reviews_i18n" ("parent_id","locale");`)
		await db.execute(sql`CREATE UNIQUE INDEX "site_settings_i18n_parent_id_locale_index" ON "site_settings_i18n" ("parent_id","locale");`)
		await db.execute(sql`CREATE UNIQUE INDEX "site_settings_i18n_versions_parent_id_version_number_locale_index" ON "site_settings_i18n_versions" ("parent_id","version_number","locale");`)
		await db.execute(sql`CREATE INDEX "site_settings_i18n_versions_parent_id_version_number_index" ON "site_settings_i18n_versions" ("parent_id","version_number");`)
		await db.execute(sql`ALTER TABLE "barbers_i18n" ADD CONSTRAINT "barbers_i18n_parent_id_barbers_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "barbers"("id") ON DELETE CASCADE;`)
		await db.execute(sql`ALTER TABLE "reviews_i18n" ADD CONSTRAINT "reviews_i18n_parent_id_reviews_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "reviews"("id") ON DELETE CASCADE;`)
		await db.execute(sql`ALTER TABLE "site_settings_i18n" ADD CONSTRAINT "site_settings_i18n_parent_id_site_settings_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "site_settings"("id") ON DELETE CASCADE;`)
	},
	async down({ db }) {
		await db.execute(sql`DROP TABLE "barbers_i18n";`)
		await db.execute(sql`DROP TABLE "reviews_i18n";`)
		await db.execute(sql`DROP TABLE "site_settings_i18n";`)
		await db.execute(sql`DROP TABLE "site_settings_i18n_versions";`)
		await db.execute(sql`ALTER TABLE "barbers" DROP CONSTRAINT IF EXISTS "barbers_slug_key";`)
		await db.execute(sql`ALTER TABLE "barbers" ADD COLUMN "bio" text;`)
		await db.execute(sql`ALTER TABLE "reviews" ADD COLUMN "comment" text;`)
		await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN "tagline" text DEFAULT 'Your Style, Our Passion';`)
		await db.execute(sql`ALTER TABLE "site_settings" ADD COLUMN "metaDescription" text DEFAULT 'Professional barbershop services - haircuts, beard grooming, and more.';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ADD COLUMN "tagline" text DEFAULT 'Your Style, Our Passion';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ADD COLUMN "metaDescription" text DEFAULT 'Professional barbershop services - haircuts, beard grooming, and more.';`)
		await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "slug";`)
		await db.execute(sql`ALTER TABLE "barbers" DROP COLUMN "specialties";`)
		await db.execute(sql`ALTER TABLE "reviews" DROP COLUMN "customer_name";`)
		await db.execute(sql`ALTER TABLE "reviews" DROP COLUMN "customer_email";`)
		await db.execute(sql`ALTER TABLE "reviews" DROP COLUMN "is_approved";`)
		await db.execute(sql`ALTER TABLE "reviews" DROP COLUMN "is_featured";`)
		await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN "logo";`)
		await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN "ctaButtonLink";`)
		await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN "country";`)
		await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN "map_embed_url";`)
		await db.execute(sql`ALTER TABLE "site_settings" DROP COLUMN "business_hours";`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" DROP COLUMN "logo";`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" DROP COLUMN "ctaButtonLink";`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" DROP COLUMN "country";`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" DROP COLUMN "map_embed_url";`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" DROP COLUMN "business_hours";`)
		await db.execute(sql`ALTER TABLE "reviews" ALTER COLUMN "customer_id" SET NOT NULL;`)
		await db.execute(sql`ALTER TABLE "reviews" ALTER COLUMN "appointment_id" SET NOT NULL;`)
		await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "shopName" SET DEFAULT 'The Barbershop';`)
		await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "contactEmail" SET DEFAULT 'contact@barbershop.com';`)
		await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "contactPhone" SET DEFAULT '+1 234 567 890';`)
		await db.execute(sql`ALTER TABLE "site_settings" ALTER COLUMN "socialLinks" SET DEFAULT '{}';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ALTER COLUMN "shopName" SET DEFAULT 'The Barbershop';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ALTER COLUMN "contactEmail" SET DEFAULT 'contact@barbershop.com';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ALTER COLUMN "contactPhone" SET DEFAULT '+1 234 567 890';`)
		await db.execute(sql`ALTER TABLE "site_settings_versions" ALTER COLUMN "socialLinks" SET DEFAULT '{}';`)
		await db.execute(sql`ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_key" UNIQUE("appointment_id");`)
	},
	snapshot,
}
