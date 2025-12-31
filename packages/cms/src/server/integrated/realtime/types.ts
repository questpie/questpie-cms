import type { RealtimeAdapter } from "./adapter";

export type RealtimeResourceType = "collection" | "global";

export type RealtimeOperation =
	| "create"
	| "update"
	| "delete"
	| "bulk_update"
	| "bulk_delete";

export type RealtimeChangeEvent = {
	seq: number;
	resourceType: RealtimeResourceType;
	resource: string;
	operation: RealtimeOperation;
	recordId?: string | null;
	locale?: string | null;
	payload?: Record<string, unknown>;
	createdAt: Date;
};

export type RealtimeNotice = Pick<
	RealtimeChangeEvent,
	"seq" | "resourceType" | "resource" | "operation"
>;

export interface RealtimeConfig {
	/**
	 * Optional transport adapter (pg_notify, redis streams, etc.).
	 */
	adapter?: RealtimeAdapter;

	/**
	 * Poll interval in ms if no adapter is configured.
	 * @default 2000
	 */
	pollIntervalMs?: number;

	/**
	 * Max events to read per drain.
	 * @default 500
	 */
	batchSize?: number;

	/**
	 * Retention window in days for cleanup jobs.
	 */
	retentionDays?: number;
}
