import { defineCollection } from "#questpie/cms/exports/server.js";
import { sql } from "drizzle-orm";
import { varchar, boolean, integer, text, timestamp } from "drizzle-orm/pg-core";

// User Collection
export const usersCollection = defineCollection("user")
	.options({ timestamps: true })
	.fields({
		name: varchar("name", { length: 255 }).notNull(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		emailVerified: boolean("emailVerified").notNull(),
		image: varchar("image", { length: 500 }),
		role: varchar("role", { length: 50 }), // Optional: Better Auth role handling
		banned: boolean("banned").default(false), // Optional: Better Auth ban handling
		banReason: varchar("banReason", { length: 255 }),
		banExpires: timestamp("banExpires", { mode: "date" }),
	})
	.title(({ table }) => sql`${table.name}`);

// Session Collection
export const sessionsCollection = defineCollection("session")
	.fields({
		userId: varchar("userId", { length: 255 }).notNull(),
		token: varchar("token", { length: 255 }).notNull().unique(),
		expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
		ipAddress: varchar("ipAddress", { length: 45 }),
		userAgent: varchar("userAgent", { length: 500 }),
		impersonatedBy: varchar("impersonatedBy", { length: 255 }),
	})
	.title(({ table }) => sql`${table.token}`);

// Account Collection (Social Logins)
export const accountsCollection = defineCollection("account")
	.fields({
		userId: varchar("userId", { length: 255 }).notNull(),
		accountId: varchar("accountId", { length: 255 }).notNull(),
		providerId: varchar("providerId", { length: 255 }).notNull(),
		accessToken: varchar("accessToken", { length: 500 }),
		refreshToken: varchar("refreshToken", { length: 500 }),
		accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { mode: "date" }),
		refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { mode: "date" }),
		scope: varchar("scope", { length: 255 }),
		idToken: varchar("idToken", { length: 500 }),
		password: varchar("password", { length: 255 }), // Optional: if using credential account here
	})
	.title(({ table }) => sql`${table.providerId}`);

// Verification Collection
export const verificationsCollection = defineCollection("verification")
	.fields({
		identifier: varchar("identifier", { length: 255 }).notNull(),
		value: varchar("value", { length: 255 }).notNull(),
		expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
	})
	.title(({ table }) => sql`${table.identifier}`);

// API Key Collection (Better Auth apiKey plugin)
export const apiKeysCollection = defineCollection("apikey")
	.options({ timestamps: true })
	.fields({
		name: varchar("name", { length: 255 }),
		start: varchar("start", { length: 255 }),
		prefix: varchar("prefix", { length: 255 }),
		key: varchar("key", { length: 500 }).notNull().unique(),
		userId: varchar("userId", { length: 255 }).notNull(),
		refillInterval: integer("refillInterval"),
		refillAmount: integer("refillAmount"),
		lastRefillAt: timestamp("lastRefillAt", { mode: "date" }),
		enabled: boolean("enabled").default(true),
		rateLimitEnabled: boolean("rateLimitEnabled").default(true),
		rateLimitTimeWindow: integer("rateLimitTimeWindow"),
		rateLimitMax: integer("rateLimitMax"),
		requestCount: integer("requestCount").default(0),
		remaining: integer("remaining"),
		lastRequest: timestamp("lastRequest", { mode: "date" }),
		expiresAt: timestamp("expiresAt", { mode: "date" }),
		permissions: text("permissions"),
		metadata: text("metadata"),
	})
	.title(({ table }) => sql`${table.key}`);
