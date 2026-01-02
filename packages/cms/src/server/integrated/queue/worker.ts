import type { JobDefinition, QueueClient } from "./types";
import {
	runWithCMSContext,
	type RequestContext,
} from "#questpie/cms/server/config/context";

/**
 * Worker options for job processing
 */
export interface WorkerOptions {
	/**
	 * Number of concurrent jobs to process
	 */
	teamSize?: number;

	/**
	 * Batch size for fetching jobs
	 */
	batchSize?: number;

	/**
	 * Include metadata in job handler context
	 */
	includeMetadata?: boolean;
}

/**
 * Start listening to all registered jobs
 *
 * This should be called in worker instances to start processing jobs.
 * The handlers defined in job definitions will be executed when jobs are received.
 *
 * @example
 * ```ts
 * // In your worker entry point (e.g., worker.ts)
 * const cms = new QCMS({
 *   // ... config
 *   queue: {
 *     jobs: [sendEmailJob, processImageJob]
 *   }
 * });
 *
 * // Start listening to all jobs
 * await cms.listenToJobs();
 *
 * // Or with options
 * await cms.listenToJobs({
 *   teamSize: 10,
 *   batchSize: 5,
 * });
 * ```
 */
export async function startJobWorker<
	TJobs extends Record<string, JobDefinition<any, any>>,
>(
	queueClient: QueueClient<TJobs>,
	jobs: TJobs,
	createContext: () => Promise<RequestContext>,
	options?: WorkerOptions,
	cms?: unknown,
): Promise<void> {
	// Ensure queue is started
	await queueClient._start();

	const adapter = queueClient._adapter;

	// Register workers for each job
	for (const [jobName, jobDef] of Object.entries(jobs)) {
		const workOptions = options?.teamSize
			? { teamSize: options.teamSize }
			: undefined;

		await adapter.work(
			jobDef.name,
			async (job: any) => {
				// Create a fresh context for each job
				const context = await createContext();

				try {
					// Validate payload (in case it was queued externally or schema changed)
					const validated = jobDef.schema.parse(job.data);

					const runHandler = () => jobDef.handler(validated, context);
					if (cms) {
						await runWithCMSContext(cms, context, runHandler);
					} else {
						await runHandler();
					}
				} catch (error) {
					console.error(
						`[QUESTPIE Queue] Job ${jobDef.name} (${job.id}) failed:`,
						error,
					);
					throw error; // Re-throw to trigger retry logic
				}
			},
			workOptions,
		);

		console.log(`[QUESTPIE Queue] Worker registered for job: ${jobDef.name}`);
	}

	console.log(
		`[QUESTPIE Queue] Worker started, listening to ${Object.keys(jobs).length} job(s)`,
	);
}

/**
 * Start listening to specific jobs only
 *
 * @example
 * ```ts
 * // Only listen to email jobs in this worker
 * await cms.listenToJobs(['sendEmail', 'sendBulkEmail']);
 * ```
 */
export async function startJobWorkerForJobs<
	TJobs extends Record<string, JobDefinition<any, any>>,
>(
	queueClient: QueueClient<TJobs>,
	jobs: TJobs,
	createContext: () => Promise<RequestContext>,
	options?: WorkerOptions,
	cms?: unknown,
): Promise<void> {
	await startJobWorker(queueClient, jobs, createContext, options, cms);
}
