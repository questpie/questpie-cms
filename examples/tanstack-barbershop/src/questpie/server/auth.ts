/**
 * Barbershop Auth Configuration
 *
 * Better Auth settings for the barbershop app.
 * Discovered automatically by codegen from auth.ts file convention.
 */
import type { AuthConfig } from "questpie";

export default {
	emailAndPassword: { enabled: true, requireEmailVerification: false },
	baseURL: process.env.APP_URL || "http://localhost:3000",
	basePath: "/api/auth",
	secret: process.env.BETTER_AUTH_SECRET || "demo-secret-change-in-production",
} satisfies AuthConfig;
