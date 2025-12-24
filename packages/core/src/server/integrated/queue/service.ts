import type { JobDefinition, QueueClient, PublishOptions } from "./types";
import type { QueueAdapter } from "./adapter";

/**
 * Create a typesafe queue client from job definitions
 *
 * @internal Used by QCMS to create the queue instance
 */
export function createQueueClient<TJobs extends JobDefinition<any, any>[]>(
	jobs: TJobs,
	adapter: QueueAdapter,
): QueueClient<TJobs> {
	// Track if started
	let started = false;

	// Auto-start helper
	const ensureStarted = async () => {
		if (!started) {
			await adapter.start();
			started = true;
		}
	};

	// Error handling
	adapter.on("error", (error: Error) => {
		console.error("[QUESTPIE Queue] Adapter error:", error);
	});

	// Build the typesafe client
	const client: any = {
		_adapter: adapter,
		_start: async () => {
			await ensureStarted();
		},
		_stop: async () => {
			if (started) {
				await adapter.stop();
				started = false;
			}
		},
	};

	// Create typesafe methods for each job (convert array to object by name)
	for (const jobDef of jobs) {
		client[jobDef.name] = {
			/**
			 * Publish a job
			 */
			publish: async (payload: any, publishOptions?: PublishOptions) => {
				await ensureStarted();

				// Validate payload with schema
				const validated = jobDef.schema.parse(payload);

				// Merge job options with publish options
				const options = {
					...jobDef.options,
					...publishOptions,
				};

				return adapter.publish(jobDef.name, validated, options);
			},

			/**
			 * Schedule a recurring job
			 */
			schedule: async (
				payload: any,
				cron: string,
				publishOptions?: Omit<PublishOptions, "startAfter">,
			) => {
				await ensureStarted();

				// Validate payload with schema
				const validated = jobDef.schema.parse(payload);

				// Merge job options with publish options
				const options = {
					...jobDef.options,
					...publishOptions,
				};

				await adapter.schedule(jobDef.name, cron, validated, options);
			},

			/**
			 * Unschedule a recurring job
			 */
			unschedule: async () => {
				await ensureStarted();
				await adapter.unschedule(jobDef.name);
			},
		};
	}

	return client as QueueClient<TJobs>;
}
