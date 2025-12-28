import type { z } from "zod";
import type { RequestContext } from "#questpie/cms/server/config/context";
import type { QueueAdapter } from "./adapter";

/**
 * Job definition with typesafe payload and result
 */
export interface JobDefinition<TPayload = any, TResult = void> {
	/**
	 * Unique name for this job
	 */
	name: string;

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
	T extends JobDefinition<infer P, any> ? P : never;

/**
 * Infer result type from job definition
 */
export type InferJobResult<T> =
	T extends JobDefinition<any, infer R> ? R : never;

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
 * Extract job names from job definitions array
 */
export type JobNames<TJobs extends JobDefinition<any, any>[]> =
	TJobs[number]["name"];

/**
 * Map job definitions array to object by name
 */
export type JobMap<TJobs extends JobDefinition<any, any>[]> = {
	[K in TJobs[number] as K["name"]]: K;
};

/**
 * Get specific job by name from jobs array
 */
export type GetJob<
	TJobs extends JobDefinition<any, any>[],
	Name extends JobNames<TJobs>,
> = JobMap<TJobs>[Name];

/**
 * Queue configuration
 */
export interface QueueConfig<
	TJobs extends JobDefinition<any, any>[] = JobDefinition<any, any>[],
> {
	/**
	 * Job definitions array
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
export type QueueClient<TJobs extends JobDefinition<any, any>[]> = {
	[K in TJobs[number]["name"]]: {
		/**
		 * Publish a job to the queue
		 */
		publish: (
			payload: InferJobPayload<GetJob<TJobs, K>>,
			options?: PublishOptions,
		) => Promise<string | null>;

		/**
		 * Schedule a recurring job with cron
		 */
		schedule: (
			payload: InferJobPayload<GetJob<TJobs, K>>,
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
