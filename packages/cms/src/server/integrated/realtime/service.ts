import { asc, desc, gt } from "drizzle-orm";
import type { RealtimeAdapter } from "./adapter";
import { questpieRealtimeLogTable } from "./collection";
import type { RealtimeChangeEvent, RealtimeConfig, RealtimeNotice } from "./types";

export type RealtimeListener = (event: RealtimeChangeEvent) => void;

type AppendChangeInput = Omit<RealtimeChangeEvent, "seq" | "createdAt">;

type AppendChangeOptions = {
	db?: any;
};

export class RealtimeService {
	private adapter?: RealtimeAdapter;
	private listeners = new Set<RealtimeListener>();
	private pollIntervalMs: number;
	private batchSize: number;
	private draining = false;
	private started = false;
	private lastSeq = 0;
	private pollTimer: ReturnType<typeof setInterval> | null = null;
	private unsubscribeAdapter: (() => void) | null = null;

	constructor(
		private db: any,
		private config: RealtimeConfig = {},
	) {
		this.adapter = config.adapter;
		this.batchSize = config.batchSize ?? 500;
		this.pollIntervalMs =
			config.pollIntervalMs ?? (this.adapter ? 0 : 2000);
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
			resourceType: row.resourceType,
			resource: row.resource,
			operation: row.operation,
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

	subscribe(listener: RealtimeListener): () => void {
		this.listeners.add(listener);
		void this.ensureStarted();

		return () => {
			this.listeners.delete(listener);
			if (this.listeners.size === 0) {
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
			resourceType: row.resourceType,
			resource: row.resource,
			operation: row.operation,
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
		for (const listener of this.listeners) {
			listener(event);
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
