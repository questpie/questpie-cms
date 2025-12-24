import { collection } from "../builder/collection-builder";
import { fields } from "../fields";
import { sql } from "drizzle-orm";

// User Collection
export const usersCollection = collection("user")
	.options({ timestamps: true })
	.fields({
		name: fields.text("name").notNull(),
		email: fields.text("email").notNull().unique(),
		emailVerified: fields.checkbox("emailVerified").notNull(),
		image: fields.text("image"),
		role: fields.text("role"), // Optional: Better Auth role handling
		banned: fields.checkbox("banned"), // Optional: Better Auth ban handling
	})
	.title((t) => sql`${t.name}`);

// Session Collection
export const sessionsCollection = collection("session")
	.fields({
		userId: fields.text("userId").notNull(),
		token: fields.text("token").notNull().unique(),
		expiresAt: fields.timestamp("expiresAt").notNull(),
		ipAddress: fields.text("ipAddress"),
		userAgent: fields.text("userAgent"),
	})
	.title((t) => sql`${t.token}`);

// Account Collection (Social Logins)
export const accountsCollection = collection("account")
	.fields({
		userId: fields.text("userId").notNull(),
		accountId: fields.text("accountId").notNull(),
		providerId: fields.text("providerId").notNull(),
		accessToken: fields.text("accessToken"),
		refreshToken: fields.text("refreshToken"),
		accessTokenExpiresAt: fields.timestamp("accessTokenExpiresAt"),
		refreshTokenExpiresAt: fields.timestamp("refreshTokenExpiresAt"),
		scope: fields.text("scope"),
		idToken: fields.text("idToken"),
		password: fields.text("password"), // Optional: if using credential account here
	})
	.title((t) => sql`${t.providerId}`);

// Verification Collection
export const verificationsCollection = collection("verification")
	.fields({
		identifier: fields.text("identifier").notNull(),
		value: fields.text("value").notNull(),
		expiresAt: fields.timestamp("expiresAt").notNull(),
	})
	.title((t) => sql`${t.identifier}`);
