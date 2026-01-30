// Re-export everything from server
export * from "#questpie/server/index.js";

// Import individual functions to create the q namespace
import { questpie } from "#questpie/server/config/builder.js";
import { collection } from "#questpie/server/collection/builder/collection-builder.js";
import { global } from "#questpie/server/global/builder/global-builder.js";
import { job } from "#questpie/server/integrated/queue/job.js";
import { fn } from "#questpie/server/functions/define-function.js";
import { email } from "#questpie/server/integrated/mailer/template.js";
import { auth } from "#questpie/server/integrated/auth/config.js";
import { config } from "#questpie/cli/config.js";
import { starterModule } from "#questpie/server/modules/starter/index.js";

/**
 * QUESTPIE - The main namespace for building your application
 *
 * @example
 * ```ts
 * import { q } from "questpie"
 *
 * // Define collections
 * const posts = q.collection("posts").fields({
 *   title: varchar("title", { length: 255 }),
 *   content: text("content"),
 * })
 *
 * // Define globals
 * const settings = q.global("settings").fields({
 *   siteName: varchar("site_name", { length: 255 }),
 * })
 *
 * // Define jobs
 * const sendEmail = q.job({
 *   name: "send-email",
 *   schema: z.object({ to: z.string().email() }),
 *   handler: async (payload, ctx) => { ... }
 * })
 *
 * // Build the app with starter module (auth + file uploads)
 * export const app = q({ name: "my-app" })
 *   .use(q.starter)
 *   .collections({ posts })
 *   .globals({ settings })
 *   .jobs({ sendEmail })
 *   .build({
 *     app: { url: "http://localhost:3000" },
 *     db: { url: DATABASE_URL },
 *     storage: { driver: s3Driver(...) },
 *   })
 * ```
 */
const q = Object.assign(questpie, {
  /**
   * Starter module - opt-in "batteries included" module
   * Includes auth collections and assets with file upload support
   * @example q({ name: "app" }).use(q.starter).build({...})
   */
  starter: starterModule,

  /**
   * Define a collection (table with CRUD operations)
   * @example q.collection("posts").fields({ title: varchar("title") })
   */
  collection,

  /**
   * Define a global (singleton settings)
   * @example q.global("settings").fields({ siteName: varchar("site_name") })
   */
  global,

  /**
   * Define a background job
   * @example q.job({ name: "send-email", schema: z.object({...}), handler: async (p, ctx) => {...} })
   */
  job,

  /**
   * Define an RPC function
   * @example q.fn({ schema: z.object({...}), handler: async ({ input, context }) => {...} })
   */
  fn,

  /**
   * Define an email template
   * @example q.email({ name: "welcome", schema: z.object({...}), render: (ctx) => <div>...</div> })
   */
  email,

  /**
   * Define auth options (Better Auth configuration)
   * @example q.auth({ emailAndPassword: { enabled: true } })
   */
  auth,

  /**
   * Define CLI configuration (questpie.config.ts)
   * @example export default q.config({ questpie: app, migrations: { directory: "./migrations" } })
   */
  config,
});

export { q };
