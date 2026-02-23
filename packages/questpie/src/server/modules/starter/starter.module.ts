import { z } from "zod";
import { assetsCollection } from "#questpie/server/collection/defaults/assets.js";
import {
	accountsCollection,
	apiKeysCollection,
	sessionsCollection,
	usersCollection,
	verificationsCollection,
} from "#questpie/server/collection/defaults/auth.js";
import { module } from "#questpie/server/config/create-app.js";
import { coreAuthOptions } from "#questpie/server/integrated/auth/index.js";
import { job } from "#questpie/server/integrated/queue/job.js";
import { coreBackendMessages } from "./messages.js";

/**
 * Starter module — opt-in "batteries included" module for common app setups.
 *
 * Includes:
 * - Auth collections (users, sessions, accounts, verifications, apikeys)
 * - Assets collection with file upload support (.upload() enabled)
 * - Default access control: requires authenticated session for all CRUD operations
 * - Scheduled realtime outbox cleanup job (when queue worker is running)
 * - Core auth options (Better Auth configuration)
 * - Core backend messages (error messages, validation messages, etc.)
 *
 * **Access Control:**
 * The starter module sets `defaultAccess` to require an authenticated session
 * for all operations (read, create, update, delete). This means collections and
 * globals without explicit `.access()` rules will deny unauthenticated requests.
 *
 * To make a specific collection publicly readable, override on the collection:
 * ```ts
 * const posts = collection("posts")
 *   .access({ read: true })  // Public reads, other ops inherit defaultAccess
 *   .fields(({ f }) => ({ ... }));
 * ```
 *
 * @example
 * ```ts
 * // questpie.config.ts
 * import { config } from "questpie";
 * import { admin } from "@questpie/admin/server";
 *
 * export default config({
 *   modules: [admin()],  // admin() includes starter() automatically
 *   app: { url: process.env.APP_URL! },
 *   db: { url: process.env.DATABASE_URL! },
 * });
 * ```
 *
 * @example
 * ```ts
 * // Using starter() directly (without admin)
 * import { config, starter } from "questpie";
 *
 * export default config({
 *   modules: [starter()],
 *   app: { url: process.env.APP_URL! },
 *   db: { url: process.env.DATABASE_URL! },
 * });
 * ```
 *
 * @see RFC §13.2 (Starter Module)
 */
export function starter() {
	return module({
		name: "questpie-starter" as const,
		collections: {
			user: usersCollection,
			assets: assetsCollection,
			session: sessionsCollection,
			account: accountsCollection,
			verification: verificationsCollection,
			apikey: apiKeysCollection,
		},
		jobs: {
			realtimeCleanup: job({
				name: "questpie.realtime.cleanup",
				schema: z.object({}),
				options: {
					cron: "0 * * * *",
				},
				handler: async ({ app }) => {
					await app.realtime.cleanupOutbox(true);
				},
			}),
		},
		auth: coreAuthOptions,
		messages: coreBackendMessages,
		defaultAccess: {
			read: ({ session }: any) => !!session,
			create: ({ session }: any) => !!session,
			update: ({ session }: any) => !!session,
			delete: ({ session }: any) => !!session,
		},
	});
}
