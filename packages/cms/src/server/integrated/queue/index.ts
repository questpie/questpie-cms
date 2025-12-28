/**
 * QUESTPIE Queue - Typesafe job queue powered by pg-boss
 *
 * This module provides a batteries-included, typesafe job queue system using pg-boss
 * and your existing Postgres database. No Redis or additional infrastructure required!
 *
 * ## Features
 *
 * - **Typesafe Jobs**: Define jobs with Zod schemas for compile-time type safety
 * - **Auto-validation**: Payloads are validated automatically using Zod schemas
 * - **Worker Support**: Easy worker setup with `cms.listenToJobs()`
 * - **Workflows**: Chain multiple jobs together with the workflow builder
 * - **Scheduling**: Support for delayed jobs and cron scheduling
 * - **Retries**: Built-in retry logic with exponential backoff
 * - **Context Access**: Full access to CMS context (db, auth, storage, email, etc.)
 *
 * ## Quick Start
 *
 * ### 1. Define Jobs
 *
 * ```ts
 * import { defineJob } from '@questpie/cms/server';
 * import { z } from 'zod';
 *
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
 *     console.log(`Email sent to ${payload.to}`);
 *   },
 *   options: {
 *     retryLimit: 3,
 *     retryDelay: 60, // seconds
 *     retryBackoff: true,
 *   },
 * });
 *
 * const processImageJob = defineJob({
 *   name: 'process-image',
 *   schema: z.object({
 *     imageUrl: z.string().url(),
 *     sizes: z.array(z.number()),
 *   }),
 *   handler: async (payload, context) => {
 *     const disk = context.storage.disk();
 *
 *     for (const size of payload.sizes) {
 *       const resized = await resizeImage(payload.imageUrl, size);
 *       await disk.put(`resized/${size}/${filename}`, resized);
 *     }
 *   },
 * });
 * ```
 *
 * ### 2. Configure CMS
 *
 * ```ts
 * import { QCMS, pgBossAdapter } from '@questpie/cms/server';
 * import { sendEmailJob, processImageJob } from './jobs';
 *
 * const cms = new QCMS({
 *   db: {
 *     connection: { /* ... *\/ }
 *   },
 *   queue: {
 *     jobs: [sendEmailJob, processImageJob], // Array of jobs
 *     adapter: pgBossAdapter({
 *       connectionString: process.env.DATABASE_URL,
 *       schema: 'pgboss',
 *     })
 *   },
 *   // ... other config
 * });
 * ```
 *
 * ### 3. Publish Jobs
 *
 * ```ts
 * // In your application code (hooks, API routes, etc.)
 * // Jobs are accessible by name on the queue client
 * await context.queue['send-email'].publish({
 *   to: 'user@example.com',
 *   subject: 'Welcome!',
 *   body: '<h1>Welcome to QUESTPIE!</h1>',
 * });
 *
 * // Delayed job
 * await context.queue['process-image'].publish(
 *   { imageUrl: 'https://...', sizes: [100, 200, 400] },
 *   { startAfter: 60 } // Start after 60 seconds
 * );
 *
 * // Scheduled recurring job
 * await context.queue['send-email'].schedule(
 *   { to: 'admin@example.com', subject: 'Daily Report', body: '...' },
 *   '0 9 * * *' // Every day at 9am
 * );
 * ```
 *
 * ### 4. Start Workers
 *
 * Create a separate worker file (e.g., `worker.ts`):
 *
 * ```ts
 * import { QCMS, pgBossAdapter } from '@questpie/cms/server';
 * import { sendEmailJob, processImageJob } from './jobs';
 *
 * const cms = new QCMS({
 *   // Same config as your main app
 *   queue: {
 *     jobs: [sendEmailJob, processImageJob],
 *     adapter: pgBossAdapter({ /* ... *\/ })
 *   }
 * });
 *
 * // Start listening to all jobs
 * await cms.listenToJobs();
 *
 * // Or listen to specific jobs only
 * await cms.listenToJobs(['send-email'], { teamSize: 20 });
 * ```
 *
 * ## Workflows
 *
 * Chain multiple steps together:
 *
 * ```ts
 * import { workflow } from '@questpie/cms/server';
 *
 * const processOrderWorkflow = workflow('process-order')
 *   .step('validate', async (order, ctx) => {
 *     const valid = await validateOrder(order);
 *     return { ...order, validated: valid };
 *   })
 *   .step('charge', async (order, ctx) => {
 *     const payment = await chargeCustomer(order);
 *     return { ...order, payment };
 *   })
 *   .step('fulfill', async (order, ctx) => {
 *     await sendToWarehouse(order);
 *     return { ...order, fulfilled: true };
 *   })
 *   .build(orderSchema);
 *
 * // Use in CMS config
 * const cms = new QCMS({
 *   queue: {
 *     jobs: [processOrderWorkflow],
 *     adapter: pgBossAdapter({ /* ... *\/ })
 *   }
 * });
 * ```
 *
 * ## Advanced Features
 *
 * ### Singleton Jobs
 *
 * Ensure only one job with a given key exists:
 *
 * ```ts
 * await context.queue['process-image'].publish(
 *   { imageUrl: url, sizes: [100, 200] },
 *   { singletonKey: url } // Only one job per URL
 * );
 * ```
 *
 * ### Priority Jobs
 *
 * ```ts
 * await context.queue['send-email'].publish(
 *   { to: 'urgent@example.com', subject: 'Alert!', body: '...' },
 *   { priority: 10 } // Higher = more important
 * );
 * ```
 *
 * ### Parallel Execution
 *
 * ```ts
 * // Use Promise.all for parallel execution
 * const results = await Promise.all([
 *   context.queue['process-image'].publish({ imageUrl: url1, sizes: [100] }),
 *   context.queue['process-image'].publish({ imageUrl: url2, sizes: [100] }),
 *   context.queue['process-image'].publish({ imageUrl: url3, sizes: [100] }),
 * ]);
 * ```
 */

// Core exports
export * from "./types";
export * from "./job";
export * from "./service";
export * from "./worker";
export * from "./workflow";
export * from "./adapter";
export * from "./adapters/pg-boss";
