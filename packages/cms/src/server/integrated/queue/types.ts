import type { z } from "zod";
import type { RequestContext } from "#questpie/cms/server/config/context";
import type { QueueAdapter } from "./adapter";

// Re-export QueueAdapter for external use
export type { QueueAdapter } from "./adapter";

/**
 * Job definition with typesafe payload and result
 */
export interface JobDefinition<
	TPayload = any,
	TResult = void,
	TName extends string = string,
> {
	/**
	 * Unique name for this job
	 */
	name: TName;

	/**
	 * Zod schema for payload validation
	 */
	schema: z.ZodSchema<TPayload>;

	/**
	 * Job handler function
	 */
	handler: (payload: TPayload, context: RequestContext) => Promise<TResult>;

	/**
	 * Optional job options (adapter agnostic where possible)
	 */
	options?: {
		/**
		 * Priority (higher = more important)
		 */
		priority?: number;

		/**
		 * Number of retry attempts
		 */
		retryLimit?: number;

		/**
		 * Delay between retries in seconds
		 */
		retryDelay?: number;

		/**
		 * Use exponential backoff for retries
		 */
		retryBackoff?: boolean;

		/**
		 * Job expiration in seconds
		 */
		expireInSeconds?: number;

		/**
		 * Start job after this delay (seconds)
		 */
		startAfter?: number | string | Date;

		/**
		 * Cron expression for recurring jobs
		 */
		cron?: string;
	};
}

/**
 * Infer payload type from job definition
 */
export type InferJobPayload<T> =
	T extends JobDefinition<infer P, any, any> ? P : never;

/**
 * Infer result type from job definition
 */
export type InferJobResult<T> =
	T extends JobDefinition<any, infer R, any> ? R : never;

/**
 * Publish options for jobs
 */
export interface PublishOptions {
	/**
	 * Priority (higher = more important)
	 */
	priority?: number;

	/**
	 * Start job after this delay (seconds)
	 */
	startAfter?: number | string | Date;

	/**
	 * Singleton key - only one job with this key can be queued
	 */
	singletonKey?: string;

	/**
	 * Number of retry attempts (overrides job default)
	 */
	retryLimit?: number;

	/**
	 * Delay between retries in seconds (overrides job default)
	 */
	retryDelay?: number;

	/**
	 * Use exponential backoff for retries (overrides job default)
	 */
	retryBackoff?: boolean;

	/**
	 * Job expiration in seconds (overrides job default)
	 */
	expireInSeconds?: number;
}

/**
 * Extract job names from job definitions map
 */
export type JobNames<TJobs extends Record<string, JobDefinition<any, any>>> =
	keyof TJobs;

/**
 * Get specific job by name from jobs map
 */
export type GetJob<
	TJobs extends Record<string, JobDefinition<any, any>>,
	Name extends JobNames<TJobs>,
> = TJobs[Name];

/**
 * Queue configuration
 */
export interface QueueConfig<
	TJobs extends Record<string, JobDefinition<any, any>> = Record<
		string,
		JobDefinition<any, any>
	>,
> {
	/**
	 * Job definitions map
	 */
	jobs: TJobs;

	/**
	 * Queue Adapter instance
	 */
	adapter: QueueAdapter;
}

/**
 * Typesafe queue client for publishing jobs
 */
export type QueueClient<
	TJobs extends Record<string, JobDefinition<any, any>>,
> = {
	[K in keyof TJobs]: {
		/**
		 * Publish a job to the queue
		 */
		publish: (
			payload: InferJobPayload<TJobs[K]>,
			options?: PublishOptions,
		) => Promise<string | null>;

		/**
		 * Schedule a recurring job with cron
		 */
		schedule: (
			payload: InferJobPayload<TJobs[K]>,
			cron: string,
			options?: Omit<PublishOptions, "startAfter">,
		) => Promise<void>;

		/**
		 * Cancel scheduled jobs
		 */
		unschedule: () => Promise<void>;
	};
} & {
	/**
	 * Access to underlying Queue Adapter
	 */
	_adapter: QueueAdapter;

	/**
	 * Start the queue (called automatically)
	 */
	_start: () => Promise<void>;

	/**
	 * Stop the queue
	 */
	_stop: () => Promise<void>;
};
