import { asc, desc, gt } from "drizzle-orm";
import type {
	DbClientType,
	DrizzleClientFromQuestpieConfig,
} from "#questpie/server/config/types.js";
import type { RealtimeAdapter } from "./adapter.js";
import { questpieRealtimeLogTable } from "./collection.js";
import type {
	RealtimeChangeEvent,
	RealtimeConfig,
	RealtimeNotice,
	RealtimeOperation,
	RealtimeResourceType,
	RealtimeSubscriptionContext,
} from "./types.js";

export type RealtimeListener = (event: RealtimeChangeEvent) => void;

type AppendChangeInput = Omit<RealtimeChangeEvent, "seq" | "createdAt">;

type AppendChangeOptions = {
	db?: DrizzleClientFromQuestpieConfig<any>;
};

// Topic format: "resourceType:resource" or "resourceType:resource:field1:value1:field2:value2"
// Examples:
// - "collection:messages" (wildcard for all messages)
// - "collection:messages:chatId:chat-1" (specific chatId)
// - "collection:messages:chatId:chat-1:status:active" (compound filter)
type TopicKey = string;

type ListenerEntry = {
	listener: RealtimeListener;
	topics: import("./types").RealtimeTopics;
	// Track which resources this listener cares about (main + dependencies)
	watchedResources: {
		collections: Set<string>;
		globals: Set<string>;
	};
};

/**
 * Extract simple equality filters from WHERE clause
 * Only extracts { field: value } and { field: { eq: value } }
 * Ignores complex operators, relations, AND/OR/NOT
 */
function extractSimpleEquality(where: any): Record<string, any> {
	if (!where || typeof where !== "object") return {};

	const result: Record<string, any> = {};

	for (const [key, value] of Object.entries(where)) {
		// Skip logical operators and relations
		if (["AND", "OR", "NOT", "RAW"].includes(key)) continue;

		// Simple equality: { field: value }
		if (
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
		) {
			result[key] = value;
		}
		// Operator syntax: { field: { eq: value } }
		else if (value && typeof value === "object" && "eq" in value) {
			result[key] = value.eq;
		}
	}

	return result;
}

/**
 * Generate topic key from filters
 * Keys are sorted alphabetically for consistency
 * Format: "resourceType:resource:field1:value1:field2:value2"
 */
function generateTopic(
	resourceType: string,
	resource: string,
	filters: Record<string, any>,
): string {
	const base = `${resourceType}:${resource}`;
	if (Object.keys(filters).length === 0) return base;

	// Sort keys alphabetically for consistent topic generation
	const sortedKeys = Object.keys(filters).sort();
	const parts = sortedKeys.flatMap((key) => [key, String(filters[key])]);

	return `${base}:${parts.join(":")}`;
}

/**
 * Generate all hierarchical topic levels from filters
 * For { chatId: 'c1', status: 'active', userId: 'u1' } generates:
 * 1. "collection:messages:chatId:c1:status:active:userId:u1"
 * 2. "collection:messages:chatId:c1:status:active"
 * 3. "collection:messages:chatId:c1"
 * 4. "collection:messages" (wildcard for this collection)
 * 5. "collection:*" (wildcard for all collections)
 */
function _generateTopicHierarchy(
	resourceType: string,
	resource: string,
	filters: Record<string, any>,
): string[] {
	const base = `${resourceType}:${resource}`;
	const sortedKeys = Object.keys(filters).sort();

	if (sortedKeys.length === 0) return [base, `${resourceType}:*`];

	const topics: string[] = [];

	// Generate from most specific to least specific
	for (let i = sortedKeys.length; i > 0; i--) {
		const keys = sortedKeys.slice(0, i);
		const partial: Record<string, any> = {};
		for (const key of keys) {
			partial[key] = filters[key];
		}
		topics.push(generateTopic(resourceType, resource, partial));
	}

	// Add collection wildcard
	topics.push(base);

	// Add resourceType wildcard (e.g., "collection:*")
	topics.push(`${resourceType}:*`);

	return topics;
}

export class RealtimeService {
	private adapter?: RealtimeAdapter;
	// Hierarchical topic routing: Map<topic, Set<ListenerEntry>>
	private topicListeners = new Map<TopicKey, Set<ListenerEntry>>();
	private pollIntervalMs: number;
	private batchSize: number;
	private draining = false;
	private started = false;
	private lastSeq = 0;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private unsubscribeAdapter: (() => void) | null = null;
	private subscriptionContext?: RealtimeSubscriptionContext;

	constructor(
		// TODO: this should be typed better
		private db: DrizzleClientFromQuestpieConfig<any>,
		config: RealtimeConfig = {},
		private pgConnectionString?: string,
	) {
		// Auto-configure adapter if connection string is provided
		if (config.adapter) {
			// User provided custom adapter
			this.adapter = config.adapter;
		}
		// PgNotifyAdapter will be lazily created on first subscribe (if needed)

		this.batchSize = config.batchSize ?? 500;
		this.pollIntervalMs = config.pollIntervalMs ?? (this.adapter ? 0 : 2000);
	}

	/**
	 * Set context for resolving dependencies from WITH config.
	 * Called by CMS to provide collection/global resolution functions.
	 */
	setSubscriptionContext(context: RealtimeSubscriptionContext): void {
		this.subscriptionContext = context;
	}

	async appendChange(
		input: AppendChangeInput,
		options: AppendChangeOptions = {},
	): Promise<RealtimeChangeEvent> {
		const db = options.db ?? this.db;
		const [row] = await db
			.insert(questpieRealtimeLogTable)
			.values({
				resourceType: input.resourceType,
				resource: input.resource,
				operation: input.operation,
				recordId: input.recordId ?? null,
				locale: input.locale ?? null,
				payload: input.payload ?? {},
			})
			.returning();

		return {
			seq: Number(row.seq),
			resourceType: row.resourceType as RealtimeResourceType,
			resource: row.resource,
			operation: row.operation as RealtimeOperation,
			recordId: row.recordId ?? null,
			locale: row.locale ?? null,
			payload: (row.payload ?? {}) as Record<string, unknown>,
			createdAt: row.createdAt,
		};
	}

	async notify(event: RealtimeChangeEvent): Promise<void> {
		if (!this.adapter) return;
		await this.adapter.notify(event);
	}

	subscribe(
		listener: RealtimeListener,
		topics?: import("./types").RealtimeTopics,
	): () => void {
		// Resolve dependencies from WITH config
		let watchedResources: { collections: Set<string>; globals: Set<string> };

		if (topics?.resourceType === "collection" && topics.with) {
			const collections =
				this.subscriptionContext?.resolveCollectionDependencies?.(
					topics.resource,
					topics.with,
				) ?? new Set([topics.resource]);
			watchedResources = { collections, globals: new Set() };
		} else if (topics?.resourceType === "global" && topics.with) {
			watchedResources = this.subscriptionContext?.resolveGlobalDependencies?.(
				topics.resource,
				topics.with,
			) ?? { collections: new Set(), globals: new Set([topics.resource]) };
		} else {
			// No WITH config - only watch main resource
			watchedResources =
				topics?.resourceType === "collection"
					? {
							collections: new Set([topics?.resource ?? "*"]),
							globals: new Set(),
						}
					: {
							collections: new Set(),
							globals: new Set([topics?.resource ?? "*"]),
						};
		}

		const entry: ListenerEntry = {
			listener,
			topics: topics ?? { resourceType: "collection", resource: "*" },
			watchedResources,
		};

		// Extract simple equality filters from WHERE clause
		const filters = topics?.where ? extractSimpleEquality(topics.where) : {};

		// Generate most specific topic for this subscription
		const topicKey = generateTopic(
			topics?.resourceType ?? "collection",
			topics?.resource ?? "*",
			filters,
		);

		// Register listener
		if (!this.topicListeners.has(topicKey)) {
			this.topicListeners.set(topicKey, new Set());
		}
		const listeners = this.topicListeners.get(topicKey);
		if (listeners) listeners.add(entry);

		void this.ensureStarted();

		return () => {
			// Remove from topic map
			this.topicListeners.get(topicKey)?.delete(entry);

			// Clean up empty topic sets
			if (this.topicListeners.get(topicKey)?.size === 0) {
				this.topicListeners.delete(topicKey);
			}

			// Stop service if no listeners remain
			if (this.topicListeners.size === 0) {
				void this.stop();
			}
		};
	}

	async getLatestSeq(): Promise<number> {
		const rows = await this.db
			.select({ seq: questpieRealtimeLogTable.seq })
			.from(questpieRealtimeLogTable)
			.orderBy(desc(questpieRealtimeLogTable.seq))
			.limit(1);
		return rows[0]?.seq ? Number(rows[0].seq) : 0;
	}

	private async readSince(seq: number): Promise<RealtimeChangeEvent[]> {
		const rows = await this.db
			.select()
			.from(questpieRealtimeLogTable)
			.where(gt(questpieRealtimeLogTable.seq, seq))
			.orderBy(asc(questpieRealtimeLogTable.seq))
			.limit(this.batchSize);

		return rows.map((row: any) => ({
			seq: Number(row.seq),
			resourceType: row.resourceType as RealtimeResourceType,
			resource: row.resource,
			operation: row.operation as RealtimeOperation,
			recordId: row.recordId ?? null,
			locale: row.locale ?? null,
			payload: (row.payload ?? {}) as Record<string, unknown>,
			createdAt: row.createdAt,
		}));
	}

	private async ensureStarted(): Promise<void> {
		if (this.started) return;
		this.started = true;
		this.lastSeq = await this.getLatestSeq();

		// Lazy-load pg-notify adapter if Postgres connection string is available
		if (!this.adapter && this.pgConnectionString) {
			const { PgNotifyAdapter } = await import("./adapters/pg-notify");
			this.adapter = new PgNotifyAdapter({
				connectionString: this.pgConnectionString,
				channel: "questpie_realtime",
			});
		}

		if (this.adapter) {
			await this.adapter.start();
			this.unsubscribeAdapter = this.adapter.subscribe(() => {
				void this.drain();
			});
			void this.drain();
			return;
		}

		if (this.pollIntervalMs > 0) {
			this.pollTimer = setInterval(() => {
				void this.drain();
			}, this.pollIntervalMs);
			void this.drain();
		}
	}

	private async stop(): Promise<void> {
		if (!this.started) return;
		this.started = false;

		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}

		if (this.unsubscribeAdapter) {
			this.unsubscribeAdapter();
			this.unsubscribeAdapter = null;
		}

		if (this.adapter) {
			await this.adapter.stop();
		}
	}

	private async drain(): Promise<void> {
		if (this.draining) return;
		this.draining = true;

		try {
			while (true) {
				const events = await this.readSince(this.lastSeq);
				if (events.length === 0) break;

				this.lastSeq = events[events.length - 1].seq;
				for (const event of events) {
					this.emit(event);
				}

				if (events.length < this.batchSize) break;
			}
		} finally {
			this.draining = false;
		}
	}

	private emit(event: RealtimeChangeEvent): void {
		// Extract simple equality filters from event payload for matching
		const eventFilters = event.payload
			? extractSimpleEquality(event.payload)
			: {};

		// Collect unique listeners to notify
		const notifiedListeners = new Set<ListenerEntry>();

		// Check ALL listeners for matches
		for (const entries of this.topicListeners.values()) {
			for (const entry of entries) {
				if (notifiedListeners.has(entry)) continue;

				const subResourceType = entry.topics.resourceType;
				const subResource = entry.topics.resource;

				// Case 1: Direct match - subscriber is for THIS resource type/resource
				if (
					subResourceType === event.resourceType &&
					(subResource === event.resource || subResource === "*")
				) {
					// Check if subscriber's WHERE filters match the event payload
					// Subscriber's filters must be a SUBSET of event's filters
					const subFilters = entry.topics.where
						? extractSimpleEquality(entry.topics.where)
						: {};

					const allFiltersMatch = Object.entries(subFilters).every(
						([key, value]) => eventFilters[key] === value,
					);

					if (allFiltersMatch) {
						notifiedListeners.add(entry);
					}
					continue;
				}

				// Case 2: Dependency match - subscriber is for a DIFFERENT resource
				// but watches this resource due to WITH config
				const matchesWatchedCollection =
					event.resourceType === "collection" &&
					(entry.watchedResources.collections.has(event.resource) ||
						entry.watchedResources.collections.has("*"));
				const matchesWatchedGlobal =
					event.resourceType === "global" &&
					(entry.watchedResources.globals.has(event.resource) ||
						entry.watchedResources.globals.has("*"));

				if (matchesWatchedCollection || matchesWatchedGlobal) {
					notifiedListeners.add(entry);
				}
			}
		}

		// Notify all collected listeners
		for (const entry of notifiedListeners) {
			entry.listener(event);
		}
	}

	static noticeFromEvent(event: RealtimeChangeEvent): RealtimeNotice {
		return {
			seq: event.seq,
			resourceType: event.resourceType,
			resource: event.resource,
			operation: event.operation,
		};
	}
}
