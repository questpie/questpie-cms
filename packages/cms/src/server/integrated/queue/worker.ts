import { and, eq, lt, ne } from "drizzle-orm";
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

type JobRunsContext = {
	db: any;
	table: any;
};

const resolveJobRunsContext = (cms?: unknown): JobRunsContext | null => {
	if (!cms) return null;

	const withCollections = cms as {
		db?: any;
		getCollectionConfig?: (name: string) => { table?: any };
	};

	if (!withCollections.db || !withCollections.getCollectionConfig) return null;

	try {
		const collection = withCollections.getCollectionConfig("job_run");
		if (!collection?.table) return null;
		return { db: withCollections.db, table: collection.table };
	} catch {
		return null;
	}
};

const buildScheduleOptions = (jobDef: JobDefinition<any, any>) => {
	const { cron, startAfter, ...options } = jobDef.options ?? {};
	return options;
};

const safeUpdateJobRun = async (
	context: JobRunsContext,
	runId: string,
	values: Record<string, any>,
) => {
	try {
		await context.db
			.update(context.table)
			.set(values)
			.where(eq(context.table.id, runId));
	} catch (error) {
		console.warn("[QUESTPIE Jobs] Failed to update job_run", error);
	}
};

const findJobRunByQueueId = async (
	context: JobRunsContext,
	queueJobId: string,
) => {
	try {
		const [run] = await context.db
			.select({ id: context.table.id })
			.from(context.table)
			.where(eq(context.table.queueJobId, queueJobId))
			.limit(1);
		return run ?? null;
	} catch (error) {
		console.warn("[QUESTPIE Jobs] Failed to load job_run", error);
		return null;
	}
};

const createJobRun = async (
	context: JobRunsContext,
	values: Record<string, any>,
) => {
	try {
		const [run] = await context.db
			.insert(context.table)
			.values(values)
			.returning({ id: context.table.id });
		return run ?? null;
	} catch (error) {
		console.warn("[QUESTPIE Jobs] Failed to create job_run", error);
		return null;
	}
};

const recoverStalledRuns = async (
	context: JobRunsContext,
	workerId: string,
) => {
	const stalledThreshold = new Date(Date.now() - 10 * 60 * 1000);

	try {
		await context.db
			.update(context.table)
			.set({
				status: "failed",
				finishedAt: new Date(),
				error: "Worker crashed or timed out (stalled job recovery)",
			})
			.where(
				and(
					eq(context.table.status, "running"),
					lt(context.table.startedAt, stalledThreshold),
					ne(context.table.workerId, workerId),
				),
			);
	} catch (error) {
		console.warn("[QUESTPIE Jobs] Failed to recover stalled job_run rows", error);
	}
};

const setupGracefulShutdown = (
	context: JobRunsContext,
	workerId: string,
) => {
	let shuttingDown = false;

	const handleShutdown = async (signal: string) => {
		if (shuttingDown) return;
		shuttingDown = true;

		console.log(
			`[QUESTPIE Jobs] Graceful shutdown (${signal}) for worker ${workerId}...`,
		);

		try {
			await context.db
				.update(context.table)
				.set({
					status: "failed",
					finishedAt: new Date(),
					error: `Worker shutdown (job interrupted on ${workerId})`,
				})
				.where(
					and(
						eq(context.table.status, "running"),
						eq(context.table.workerId, workerId),
					),
				);
		} catch (error) {
			console.warn("[QUESTPIE Jobs] Failed to mark job_run on shutdown", error);
		}

		process.exit(0);
	};

	process.on("SIGTERM", () => {
		void handleShutdown("SIGTERM");
	});

	process.on("SIGINT", () => {
		void handleShutdown("SIGINT");
	});
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
	const jobRunsContext = resolveJobRunsContext(cms);
	const workerId = crypto.randomUUID();

	if (jobRunsContext) {
		await recoverStalledRuns(jobRunsContext, workerId);
		setupGracefulShutdown(jobRunsContext, workerId);
	}

	// Register workers for each job
	for (const jobDef of Object.values(jobs)) {
		const workOptions =
			options?.teamSize || options?.batchSize
				? {
						teamSize: options?.teamSize,
						batchSize: options?.batchSize,
					}
				: undefined;

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

		await adapter.work(
			jobDef.name,
			async (job: any) => {
				// Create a fresh context for each job
				const context = await createContext();
				let runId: string | null = null;

				try {
					if (jobRunsContext) {
						const existingRun = await findJobRunByQueueId(
							jobRunsContext,
							job.id,
						);
						const run =
							existingRun ??
							(await createJobRun(jobRunsContext, {
								jobName: jobDef.name,
								status: "queued",
								queuedAt: new Date(),
								payload: job.data,
								queueJobId: job.id,
							}));
						runId = run?.id ?? null;

						if (runId) {
							await safeUpdateJobRun(jobRunsContext, runId, {
								status: "running",
								startedAt: new Date(),
								workerId,
							});
						}
					}

					// Validate payload (in case it was queued externally or schema changed)
					const validated = jobDef.schema.parse(job.data);

					const runHandler = () => jobDef.handler(validated, context);
					if (cms) {
						await runWithCMSContext(cms, context, runHandler);
					} else {
						await runHandler();
					}

					if (jobRunsContext && runId) {
						await safeUpdateJobRun(jobRunsContext, runId, {
							status: "success",
							finishedAt: new Date(),
						});
					}
				} catch (error) {
					if (jobRunsContext && runId) {
						await safeUpdateJobRun(jobRunsContext, runId, {
							status: "failed",
							finishedAt: new Date(),
							error: error instanceof Error ? error.message : String(error),
						});
					}
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
