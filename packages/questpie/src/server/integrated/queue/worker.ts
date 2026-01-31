import type { RequestContext } from "#questpie/server/config/context.js";
import type { JobDefinition, QueueClient } from "./types.js";

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

const buildScheduleOptions = (jobDef: JobDefinition<any, any>) => {
	const { cron, startAfter, ...options } = jobDef.options ?? {};
	return options;
};

/**
 * Start listening to all registered jobs
 *
 * This should be called in worker instances to start processing jobs.
 * The handlers defined in job definitions will be executed when jobs are received.
 *
 * @example
 * ```ts
 * // In your worker entry point (e.g., worker.ts)
 * const cms = new Questpie({
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
	const jobList = Object.values(jobs);

	// Register workers for each job
	for (const jobDef of jobList) {
		const workOptions =
			options?.teamSize || options?.batchSize
				? {
						teamSize: options?.teamSize,
						batchSize: options?.batchSize,
					}
				: undefined;

		// Auto-schedule cron jobs defined in job options
		if (jobDef.options?.cron) {
			let schedulePayload: unknown;
			try {
				schedulePayload = jobDef.schema.parse({});
			} catch (error) {
				throw new Error(
					`QUESTPIE: Job "${jobDef.name}" has cron schedule but schema does not accept an empty payload.`,
					{ cause: error },
				);
			}
			await adapter.schedule(
				jobDef.name,
				jobDef.options.cron,
				schedulePayload,
				buildScheduleOptions(jobDef),
			);
			console.log(
				`[QUESTPIE Jobs] Scheduled ${jobDef.name}: ${jobDef.options.cron}`,
			);
		}

		// Register the worker handler
		await adapter.work(
			jobDef.name,
			async (job: any) => {
				// Create a fresh context for each job
				const context = await createContext();

				try {
					if (job.data == null) {
						throw new Error(
							`QUESTPIE: Job "${jobDef.name}" received an empty payload. This usually means a job was queued without data or outside of Questpie.`,
						);
					}

					// Validate payload (in case it was queued externally or schema changed)
					const validated = jobDef.schema.parse(job.data);

					// Execute handler
					await jobDef.handler({
						payload: validated,
						app: cms as any,
						session: context.session,
						locale: context.locale,
						db: context.db ?? (cms as any)?.db,
					});
				} catch (error) {
					console.error(
						`[QUESTPIE Queue] Job ${jobDef.name} (${job.id}) failed:`,
						error,
					);
					throw error; // Re-throw to trigger retry logic in adapter
				}
			},
			workOptions,
		);

		console.log(`[QUESTPIE Queue] Worker registered for job: ${jobDef.name}`);
	}

	const jobNames = jobList.map((jobDef) => jobDef.name).join(", ");
	console.log(
		`[QUESTPIE Queue] Worker started, listening to ${Object.keys(jobs).length} job(s): ${jobNames}`,
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
