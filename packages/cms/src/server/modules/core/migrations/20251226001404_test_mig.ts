import type { Migration } from "@questpie/cms/server";
import { sql } from "drizzle-orm";

export const testMig20251226001404: Migration = {
	id: "testMig20251226001404",
	async up({ db }) {
		await db.execute(sql`CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"key" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt" varchar(500),
	"caption" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
		await db.execute(sql`CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"emailVerified" boolean NOT NULL,
	"image" varchar(500),
	"role" varchar(50),
	"banned" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
		await db.execute(sql`CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"userId" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL UNIQUE,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
		await db.execute(sql`CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"userId" varchar(255) NOT NULL,
	"accountId" varchar(255) NOT NULL,
	"providerId" varchar(255) NOT NULL,
	"accessToken" varchar(500),
	"refreshToken" varchar(500),
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" varchar(255),
	"idToken" varchar(500),
	"password" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
		await db.execute(sql`CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"identifier" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
		await db.execute(sql`CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"sku" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);`);
		await db.execute(sql`CREATE TABLE "products_i18n" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"parent_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text
);`);
		await db.execute(sql`CREATE TABLE "products_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"parent_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"operation" text NOT NULL,
	"data" jsonb NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);`);
		await db.execute(sql`CREATE TABLE "locked_products" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"sku" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);`);
		await db.execute(sql`CREATE TABLE "locked_products_i18n" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"parent_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL
);`);
		await db.execute(sql`CREATE TABLE "locked_products_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"parent_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"operation" text NOT NULL,
	"data" jsonb NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);`);
		await db.execute(
			sql`CREATE INDEX "products_deleted_at_index" ON "products" ("deleted_at");`,
		);
		await db.execute(
			sql`CREATE INDEX "products_i18n_parent_id_locale_index" ON "products_i18n" ("parent_id","locale");`,
		);
		await db.execute(
			sql`CREATE INDEX "products_versions_parent_id_version_index" ON "products_versions" ("parent_id","version");`,
		);
		await db.execute(
			sql`CREATE INDEX "products_versions_created_at_index" ON "products_versions" ("created_at");`,
		);
		await db.execute(
			sql`CREATE INDEX "locked_products_deleted_at_index" ON "locked_products" ("deleted_at");`,
		);
		await db.execute(
			sql`CREATE INDEX "locked_products_i18n_parent_id_locale_index" ON "locked_products_i18n" ("parent_id","locale");`,
		);
		await db.execute(
			sql`CREATE INDEX "locked_products_versions_parent_id_version_index" ON "locked_products_versions" ("parent_id","version");`,
		);
		await db.execute(
			sql`CREATE INDEX "locked_products_versions_created_at_index" ON "locked_products_versions" ("created_at");`,
		);
		await db.execute(
			sql`ALTER TABLE "products_i18n" ADD CONSTRAINT "products_i18n_parent_id_products_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "products"("id") ON DELETE CASCADE;`,
		);
		await db.execute(
			sql`ALTER TABLE "locked_products_i18n" ADD CONSTRAINT "locked_products_i18n_parent_id_locked_products_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "locked_products"("id") ON DELETE CASCADE;`,
		);
	},
	async down({ db }) {
		await db.execute(
			sql`ALTER TABLE "products_i18n" DROP CONSTRAINT IF EXISTS "products_i18n_parent_id_products_id_fkey";`,
		);
		await db.execute(
			sql`ALTER TABLE "locked_products_i18n" DROP CONSTRAINT IF EXISTS "locked_products_i18n_parent_id_locked_products_id_fkey";`,
		);
		await db.execute(sql`DROP TABLE "assets";`);
		await db.execute(sql`DROP TABLE "user";`);
		await db.execute(sql`DROP TABLE "session";`);
		await db.execute(sql`DROP TABLE "account";`);
		await db.execute(sql`DROP TABLE "verification";`);
		await db.execute(sql`DROP TABLE "products";`);
		await db.execute(sql`DROP TABLE "products_i18n";`);
		await db.execute(sql`DROP TABLE "products_versions";`);
		await db.execute(sql`DROP TABLE "locked_products";`);
		await db.execute(sql`DROP TABLE "locked_products_i18n";`);
		await db.execute(sql`DROP TABLE "locked_products_versions";`);
	},
};
