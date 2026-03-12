import { admin, apiKey, bearer } from "better-auth/plugins";

// Re-export from merge.ts for backwards compatibility
export { auth, type MergeAuthOptions, mergeAuthOptions } from "./merge.js";

import { auth } from "./merge.js";

/**
 * Core auth options with Better Auth plugins
 */
export const coreAuthOptions = auth({
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,
	advanced: {
		useSecureCookies: process.env.NODE_ENV === "production",
	},
	plugins: [admin(), apiKey(), bearer()],
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
});
