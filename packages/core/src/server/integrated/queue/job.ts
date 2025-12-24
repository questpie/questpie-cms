import type { JobDefinition } from "./types";

/**
 * Define a typesafe job
 *
 * @example
 * ```ts
 * const sendEmailJob = defineJob({
 *   name: 'send-email',
 *   schema: z.object({
 *     to: z.string().email(),
 *     subject: z.string(),
 *     body: z.string(),
 *   }),
 *   handler: async (payload, context) => {
 *     await context.email.send({
 *       to: payload.to,
 *       subject: payload.subject,
 *       html: payload.body,
 *     });
 *   },
 *   options: {
 *     retryLimit: 3,
 *     retryDelay: 60,
 *     retryBackoff: true,
 *   },
 * });
 * ```
 */
export function defineJob<TPayload, TResult = void>(
	definition: JobDefinition<TPayload, TResult>,
): JobDefinition<TPayload, TResult> {
	return definition;
}
