import type { QueueAdapter } from "./adapter.js";
import type { JobDefinition, PublishOptions, QueueClient } from "./types.js";

/**
 * Create a typesafe queue client from job definitions
 *
 * @internal Used by Questpie to create the queue instance
 */
export function createQueueClient<
	TJobs extends Record<string, JobDefinition<any, any>>,
>(jobs: TJobs, adapter: QueueAdapter): QueueClient<TJobs> {
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

	// Create typesafe methods for each job (iterate over object entries)
	// Use the object key (jobName) for client access to match QueueClient type definition
	// but use jobDef.name for actual adapter operations (the internal queue name)
	for (const [jobName, jobDef] of Object.entries(jobs)) {
		client[jobName] = {
			/**
			 * Publish a job to the queue
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
