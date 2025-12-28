import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { admin, apiKey, bearer } from "better-auth/plugins";
import type { SQL } from "bun";

/**
 * Configuration options for defaultQCMSAuth
 */
export type QCMSAuthConfig = {
	/**
	 * Enable email/password authentication
	 * @default true
	 */
	emailPassword?: boolean;

	/**
	 * Social providers configuration
	 * Provide client ID and secret for each provider you want to enable
	 */
	socialProviders?: {
		google?: {
			clientId: string;
			clientSecret: string;
		};
		github?: {
			clientId: string;
			clientSecret: string;
		};
		discord?: {
			clientId: string;
			clientSecret: string;
		};
	};

	/**
	 * Additional Better Auth plugins
	 * These will be added after default plugins (admin, apiKey, bearer)
	 */
	plugins?: BetterAuthOptions["plugins"];

	/**
	 * Require email verification for email/password signup
	 * @default true
	 */
	emailVerification?: boolean;

	/**
	 * Base URL for the auth service
	 * Used for OAuth redirects and email links
	 */
	baseURL?: string;

	/**
	 * Secret key for signing tokens
	 * Falls back to BETTER_AUTH_SECRET env variable
	 */
	secret?: string;
};

/**
 * Create default QCMS Better Auth configuration with batteries included
 *
 * This helper provides a quick-start auth setup with sensible defaults:
 * - Email/password authentication (with optional verification)
 * - Admin, API key, and Bearer token plugins
 * - Optional social providers (Google, GitHub, Discord)
 *
 * @example
 * ```ts
 * // Quick start with defaults
 * const cms = createCMS({
 *   database: db,
 *   auth: defaultQCMSAuth(db.client, {
 *     emailPassword: true,
 *     baseURL: 'http://localhost:3000'
 *   })
 * })
 * ```
 *
 * @example
 * ```ts
 * // With social providers
 * const cms = createCMS({
 *   database: db,
 *   auth: defaultQCMSAuth(db.client, {
 *     emailPassword: true,
 *     socialProviders: {
 *       google: {
 *         clientId: process.env.GOOGLE_CLIENT_ID!,
 *         clientSecret: process.env.GOOGLE_CLIENT_SECRET!
 *       }
 *     }
 *   })
 * })
 * ```
 *
 * @example
 * ```ts
 * // With custom plugins
 * import { twoFactor } from 'better-auth/plugins'
 *
 * const cms = createCMS({
 *   database: db,
 *   auth: defaultQCMSAuth(db.client, {
 *     plugins: [twoFactor()]
 *   })
 * })
 * ```
 */
export function defaultQCMSAuth(
	database: SQL,
	config: QCMSAuthConfig = {},
): BetterAuthOptions {
	const {
		emailPassword = true,
		socialProviders,
		plugins = [],
		emailVerification = true,
		baseURL,
		secret,
	} = config;

	return {
		database: {
			// Better Auth expects a database client
			// For Bun SQL, we pass it directly
			client: database as any,
			type: "postgres",
		} as any,

		// Base URL for OAuth redirects and email links
		baseURL: baseURL || process.env.BETTER_AUTH_URL,

		// Secret for signing tokens
		secret: secret || process.env.BETTER_AUTH_SECRET,

		// Trust proxy headers (important for production)
		advanced: {
			useSecureCookies: process.env.NODE_ENV === "production",
		},

		// Default plugins
		plugins: [
			admin(), // Admin API for user management
			apiKey(), // API key authentication
			bearer(), // Bearer token support
			...plugins, // User's custom plugins
		],

		// Email/password authentication
		emailAndPassword: emailPassword
			? {
					enabled: true,
					requireEmailVerification: emailVerification,
				}
			: undefined,

		// Social providers
		socialProviders: socialProviders
			? {
					google: socialProviders.google,
					github: socialProviders.github,
					discord: socialProviders.discord,
				}
			: undefined,
	};
}
