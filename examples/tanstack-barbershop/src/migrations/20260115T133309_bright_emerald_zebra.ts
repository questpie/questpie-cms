import type { Migration, OperationSnapshot } from "questpie";
import { sql } from "drizzle-orm";
import snapshotJson from "./snapshots/20260115T133309_bright_emerald_zebra.json";

const snapshot = snapshotJson as OperationSnapshot;

export const brightEmeraldZebra20260115T133309: Migration = {
  id: "brightEmeraldZebra20260115T133309",
  async up({ db }) {
    await db.execute(sql`CREATE TABLE "assets" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"width" integer,
	"height" integer,
	"alt" varchar(500),
	"caption" text,
	"key" varchar(255) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"visibility" varchar(20) DEFAULT 'public' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "user" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"emailVerified" boolean NOT NULL,
	"image" varchar(500),
	"role" varchar(50),
	"banned" boolean DEFAULT false,
	"banReason" varchar(255),
	"banExpires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "session" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"userId" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL UNIQUE,
	"expiresAt" timestamp NOT NULL,
	"ipAddress" varchar(45),
	"userAgent" varchar(500),
	"impersonatedBy" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "account" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
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
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"identifier" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "apikey" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255),
	"start" varchar(255),
	"prefix" varchar(255),
	"key" varchar(500) NOT NULL UNIQUE,
	"userId" varchar(255) NOT NULL,
	"refillInterval" integer,
	"refillAmount" integer,
	"lastRefillAt" timestamp,
	"enabled" boolean DEFAULT true,
	"rateLimitEnabled" boolean DEFAULT true,
	"rateLimitTimeWindow" integer,
	"rateLimitMax" integer,
	"requestCount" integer DEFAULT 0,
	"remaining" integer,
	"lastRequest" timestamp,
	"expiresAt" timestamp,
	"permissions" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "barbers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"phone" varchar(50),
	"bio" text,
	"avatar" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"working_hours" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "services" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(255) NOT NULL,
	"description" text,
	"duration" integer NOT NULL,
	"price" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "appointments" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"customer_id" varchar(255) NOT NULL,
	"barber_id" varchar(255) NOT NULL,
	"service_id" varchar(255) NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "reviews" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid(),
	"appointment_id" varchar(255) NOT NULL UNIQUE,
	"customer_id" varchar(255) NOT NULL,
	"barber_id" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(sql`CREATE TABLE "questpie_realtime_log" (
	"seq" bigserial PRIMARY KEY,
	"resource_type" text NOT NULL,
	"resource" text NOT NULL,
	"operation" text NOT NULL,
	"record_id" text,
	"locale" text,
	"payload" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);`);
    await db.execute(
      sql`CREATE INDEX "idx_realtime_log_seq" ON "questpie_realtime_log" ("seq");`,
    );
    await db.execute(
      sql`CREATE INDEX "idx_realtime_log_resource" ON "questpie_realtime_log" ("resource_type","resource");`,
    );
    await db.execute(
      sql`CREATE INDEX "idx_realtime_log_created_at" ON "questpie_realtime_log" ("created_at");`,
    );
  },
  async down({ db }) {
    await db.execute(sql`DROP TABLE "assets";`);
    await db.execute(sql`DROP TABLE "user";`);
    await db.execute(sql`DROP TABLE "session";`);
    await db.execute(sql`DROP TABLE "account";`);
    await db.execute(sql`DROP TABLE "verification";`);
    await db.execute(sql`DROP TABLE "apikey";`);
    await db.execute(sql`DROP TABLE "barbers";`);
    await db.execute(sql`DROP TABLE "services";`);
    await db.execute(sql`DROP TABLE "appointments";`);
    await db.execute(sql`DROP TABLE "reviews";`);
    await db.execute(sql`DROP TABLE "questpie_realtime_log";`);
  },
  snapshot,
};
