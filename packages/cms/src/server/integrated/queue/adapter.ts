import type { JobDefinition, PublishOptions } from "./types";

/**
 * Common interface for Queue Adapters (e.g. PgBoss, BullMQ)
 */
export interface QueueAdapter {
	/**
	 * Start the queue adapter (connect to DB/Redis, etc.)
	 */
	start(): Promise<void>;

	/**
	 * Stop the queue adapter (close connections)
	 */
	stop(): Promise<void>;

	/**
	 * Publish a job to the queue
	 */
	publish(
		jobName: string,
		payload: any,
		options?: PublishOptions,
	): Promise<string | null>;

	/**
	 * Schedule a recurring job with cron
	 */
	schedule(
		jobName: string,
		cron: string,
		payload: any,
		options?: Omit<PublishOptions, "startAfter">,
	): Promise<void>;

	/**
	 * Cancel scheduled jobs for a specific job name
	 */
	unschedule(jobName: string): Promise<void>;

	/**
	 * Register a worker to process jobs
	 */
	work(
		jobName: string,
		handler: (job: { id: string; data: any }) => Promise<void>,
		options?: { teamSize?: number; batchSize?: number },
	): Promise<void>;

	/**
	 * Listen for queue events
	 */
	on(event: "error", handler: (error: Error) => void): void;
}
