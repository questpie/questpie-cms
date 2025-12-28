/**
 * Better Auth Integration Example
 *
 * This example shows how to use Better Auth with QCMS in two ways:
 * 1. Quick start with defaultQCMSAuth() helper
 * 2. Full control with custom betterAuth() instance
 */

import { SQL } from "bun";
import { QCMS, defaultQCMSAuth, defineCollection } from "@questpie/cms/server";
import { betterAuth } from "better-auth";
import { admin, twoFactor } from "better-auth/plugins";
import { varchar } from "drizzle-orm/pg-core";
import { defineJob, pgBossAdapter } from "@questpie/cms/server";
import z from "zod";
import { sql } from "drizzle-orm";

// Example database connection
const db = new SQL({
	url: process.env.DATABASE_URL || "postgres://localhost/qcms_test",
});

// Define some jobs (required by QCMS)
const jobs = [
	defineJob({
		name: "send-email",
		schema: z.object({
			to: z.string(),
			subject: z.string(),
		}),
		handler: async (payload) => {
			console.log("Sending email to", payload.to);
		},
	}),
];

// Example collection
const posts = defineCollection("posts")
	.fields({
		title: varchar("title", { length: 255 }).notNull(),
	})
	.title((t) => sql`${t.title}`);

// ============================================================================
// PATTERN 1: Quick Start with defaultQCMSAuth()
// ============================================================================
// Best for most use cases - provides sensible defaults with customization

const cmsQuickStart = new QCMS({
	app: {
		url: "http://localhost:3000",
	},

	db: {
		connection: {
			url: process.env.DATABASE_URL || "postgres://localhost/qcms_test",
		},
	},

	collections: [posts],

	// Quick start auth config
	auth: defaultQCMSAuth(db, {
		// Enable email/password authentication
		emailPassword: true,

		// Base URL for OAuth redirects
		baseURL: "http://localhost:3000",

		// Social providers (optional)
		socialProviders: {
			google: {
				clientId: process.env.GOOGLE_CLIENT_ID!,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			},
		},

		// Require email verification
		emailVerification: true,

		// Secret for signing tokens
		secret: process.env.BETTER_AUTH_SECRET,

		// Add custom plugins (optional)
		// plugins: [],
	}),

	storage: {
		// driver: fsDriver({ location: './uploads' })
	},

	queue: {
		jobs,
		adapter: pgBossAdapter({
			connectionString:
				process.env.DATABASE_URL || "postgres://localhost/qcms_test",
		}),
	},
});

// Access Better Auth API
const createUser = async () => {
	const user = await cmsQuickStart.auth.api.signUpEmail({
		email: "user@example.com",
		password: "secure_password",
		name: "Test User",
	});

	console.log("Created user:", user);
};

// Use auth handler in your routes
const _authHandler = cmsQuickStart.auth.handler;
// app.all('/api/auth/*', (req) => authHandler(req))

// ============================================================================
// PATTERN 2: Full Control with betterAuth() Instance
// ============================================================================
// For advanced use cases where you need complete control

const cmsFullControl = new QCMS({
	app: {
		url: "http://localhost:3000",
	},

	db: {
		connection: {
			url: process.env.DATABASE_URL || "postgres://localhost/qcms_test",
		},
	},

	collections: [posts],

	// Pass custom betterAuth instance
	auth: betterAuth({
		database: {
			client: db as any,
			type: "postgres",
		},

		baseURL: "http://localhost:3000",
		secret: process.env.BETTER_AUTH_SECRET,

		// Full control over plugins
		plugins: [
			admin(),
			twoFactor({
				issuer: "QCMS",
			}),
			// Add any other Better Auth plugins
		],

		// Email/password config
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,

			// Custom password validation
			async sendVerificationEmail(user, url) {
				// Custom email sending logic
				console.log("Send verification email to", user.email, url);
			},
		},

		// Social providers
		socialProviders: {
			github: {
				clientId: process.env.GITHUB_CLIENT_ID!,
				clientSecret: process.env.GITHUB_CLIENT_SECRET!,
			},
		},

		// Session config
		session: {
			expiresIn: 60 * 60 * 24 * 30, // 30 days
			updateAge: 60 * 60 * 24, // Update every day
		},

		// Advanced options
		advanced: {
			useSecureCookies: process.env.NODE_ENV === "production",
			crossSubDomainCookies: {
				enabled: true,
				domain: ".example.com",
			},
		},
	}),

	storage: {},
	email: {},

	queue: {
		jobs,
		adapter: pgBossAdapter({
			connectionString:
				process.env.DATABASE_URL || "postgres://localhost/qcms_test",
		}),
	},
});

// Full Better Auth API access
const loginUser = async () => {
	const session = await cmsFullControl.auth.api.signInEmail({
		email: "user@example.com",
		password: "secure_password",
	});

	console.log("Session:", session);
};

// ============================================================================
// Using Auth in QCMS Operations
// ============================================================================

const useAuthInOperations = async () => {
	// Get user from session
	const session = await cmsQuickStart.auth.api.getSession({
		headers: new Headers({
			cookie: "session_token=...",
		}),
	});

	// Create CMS context with user
	const context = await cmsQuickStart.createContext({
		user: session?.user,
		locale: "en",
		accessMode: "user", // or 'system' for backend operations
	});

	// Now all CRUD operations have user context for access control
	const userPosts = await cmsQuickStart.api.collections.posts.find({}, context);

	console.log("User posts:", userPosts);
};

// ============================================================================
// Export examples
// ============================================================================

export {
	cmsQuickStart,
	cmsFullControl,
	createUser,
	loginUser,
	useAuthInOperations,
};
