import { describe, it, beforeEach, afterEach, expect } from "bun:test";
import { text, uuid as uuidCol } from "drizzle-orm/pg-core";
import {
	defineCollection,
	defineGlobal,
	createCMSAdapterRoutes,
	questpieRealtimeLogTable,
	type RealtimeAdapter,
	type RealtimeChangeEvent,
} from "#questpie/cms/server";
import {
	closeTestDb,
	createTestDb,
	runTestDbMigrations,
} from "../utils/test-db";
import { createTestCms } from "../utils/test-cms";
import { createTestContext } from "../utils/test-context";

class MockRealtimeAdapter implements RealtimeAdapter {
	public notices: Array<{ seq: number; resource: string; operation: string }> = [];
	private listeners = new Set<(notice: any) => void>();

	async start(): Promise<void> {}
	async stop(): Promise<void> {}

	subscribe(handler: (notice: any) => void): () => void {
		this.listeners.add(handler);
		return () => {
			this.listeners.delete(handler);
		};
	}

	async notify(event: RealtimeChangeEvent): Promise<void> {
		const notice = {
			seq: event.seq,
			resource: event.resource,
			operation: event.operation,
		};
		this.notices.push(notice);
		for (const listener of this.listeners) {
			listener(notice);
		}
	}
}

type SSEEvent = {
	event: string;
	data: any;
};

const createSSEReader = (stream: ReadableStream<Uint8Array>) => {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	const readEvent = async (timeoutMs = 2000): Promise<SSEEvent> => {
		const deadline = Date.now() + timeoutMs;

		while (Date.now() < deadline) {
			const separatorIndex = buffer.indexOf("\n\n");
			if (separatorIndex !== -1) {
				const chunk = buffer.slice(0, separatorIndex);
				buffer = buffer.slice(separatorIndex + 2);

				let event = "message";
				let data = "";
				for (const line of chunk.split("\n")) {
					if (line.startsWith("event:")) {
						event = line.slice(6).trim();
					} else if (line.startsWith("data:")) {
						data += line.slice(5).trim();
					}
				}

				return {
					event,
					data: data ? JSON.parse(data) : null,
				};
			}

			const { value, done } = await reader.read();
			if (done) {
				throw new Error("SSE stream closed before event");
			}
			buffer += decoder.decode(value, { stream: true });
		}

		throw new Error("Timed out waiting for SSE event");
	};

	const readSnapshot = async (timeoutMs = 2000): Promise<SSEEvent> => {
		while (true) {
			const event = await readEvent(timeoutMs);
			if (event.event === "ping") {
				continue;
			}
			return event;
		}
	};

	return { readEvent, readSnapshot, close: () => reader.cancel() };
};

describe("realtime", () => {
	let db: any;
	let client: any;

	beforeEach(async () => {
		const created = await createTestDb();
		db = created.db;
		client = created.client;
	});

	afterEach(async () => {
		await closeTestDb(client);
	});

	it("logs realtime changes for create/update/delete", async () => {
		const adapter = new MockRealtimeAdapter();
		const posts = defineCollection("posts")
			.fields({
				title: text("title").notNull(),
				slug: text("slug").notNull(),
			})
			.localized(["title"])
			.build();

		const cms = createTestCms([posts], db, undefined, {
			realtime: { adapter },
			locale: {
				locales: [{ code: "en" }, { code: "sk" }],
				defaultLocale: "en",
			},
		});

		await runTestDbMigrations(cms);

		const ctxEn = createTestContext({ locale: "en", defaultLocale: "en" });
		const ctxSk = createTestContext({ locale: "sk", defaultLocale: "en" });

		const created = await cms.api.collections.posts.create(
			{ title: "Hello", slug: "hello" },
			ctxEn,
		);
		await cms.api.collections.posts.updateById(
			{ id: created.id, data: { title: "Ahoj" } },
			ctxSk,
		);
		await cms.api.collections.posts.deleteById(
			{ id: created.id },
			ctxEn,
		);

		const logs = await db
			.select()
			.from(questpieRealtimeLogTable)
			.orderBy(questpieRealtimeLogTable.seq);

		expect(logs.length).toBe(3);
		expect(logs[0].operation).toBe("create");
		expect(logs[1].operation).toBe("update");
		expect(logs[1].locale).toBe("sk");
		expect(logs[2].operation).toBe("delete");

		expect(adapter.notices.length).toBe(3);
		expect(adapter.notices.map((n) => n.operation)).toEqual([
			"create",
			"update",
			"delete",
		]);
	});

	it("logs bulk update/delete operations", async () => {
		const adapter = new MockRealtimeAdapter();
		const posts = defineCollection("posts")
			.fields({
				title: text("title").notNull(),
				slug: text("slug").notNull(),
			})
			.build();

		const cms = createTestCms([posts], db, undefined, {
			realtime: { adapter },
		});
		await runTestDbMigrations(cms);
		const ctx = createTestContext();

		const first = await cms.api.collections.posts.create(
			{ title: "One", slug: "one" },
			ctx,
		);
		const second = await cms.api.collections.posts.create(
			{ title: "Two", slug: "two" },
			ctx,
		);

		await cms.api.collections.posts.update(
			{ where: { id: { in: [first.id, second.id] } }, data: { slug: "new" } },
			ctx,
		);
		await cms.api.collections.posts.delete(
			{ where: { id: { in: [first.id, second.id] } } },
			ctx,
		);

		const logs = await db
			.select()
			.from(questpieRealtimeLogTable)
			.orderBy(questpieRealtimeLogTable.seq);

		const bulkOps = logs.map((row: any) => row.operation);
		expect(bulkOps).toContain("bulk_update");
		expect(bulkOps).toContain("bulk_delete");
	});

	it("re-sends snapshots when related records change with with=...", async () => {
		const adapter = new MockRealtimeAdapter();
		const authors = defineCollection("authors")
			.fields({
				name: text("name").notNull(),
			})
			.build();

		const posts = defineCollection("posts")
			.fields({
				title: text("title").notNull(),
				authorId: uuidCol("author_id")
					.notNull()
					.references(() => authors.table.id),
			})
			.relations(({ one }) => ({
				author: one("authors", {
					fields: ["authorId"] as any,
					references: ["id"] as any,
				}),
			}))
			.build();

		const cms = createTestCms([authors, posts], db, undefined, {
			realtime: { adapter },
		});
		await runTestDbMigrations(cms);

		const routes = createCMSAdapterRoutes(cms, { accessMode: "user" });
		const controller = new AbortController();
		const request = new Request(
			"http://localhost/cms/realtime/posts?with[author]=true",
			{ method: "GET", signal: controller.signal },
		);
		const response = await routes.realtime.subscribe(
			request,
			{ collection: "posts" },
			undefined,
		);

		expect(response.ok).toBe(true);
		const reader = createSSEReader(response.body!);
		const initial = await reader.readSnapshot();
		expect(initial.event).toBe("snapshot");
		expect(initial.data.data.docs.length).toBe(0);

		const ctx = createTestContext();
		const author = await cms.api.collections.authors.create(
			{ name: "Ada" },
			ctx,
		);
		await cms.api.collections.posts.create(
			{ title: "Hello", authorId: author.id },
			ctx,
		);

		let snapshot = await reader.readSnapshot();
		while (snapshot.data.data.docs.length === 0) {
			snapshot = await reader.readSnapshot();
		}

		expect(snapshot.data.data.docs.length).toBe(1);
		expect(snapshot.data.data.docs[0].author.name).toBe("Ada");

		await cms.api.collections.authors.updateById(
			{ id: author.id, data: { name: "Ada Lovelace" } },
			ctx,
		);

		let updatedSnapshot = await reader.readSnapshot();
		while (
			updatedSnapshot.data.data.docs[0]?.author?.name !== "Ada Lovelace"
		) {
			updatedSnapshot = await reader.readSnapshot();
		}

		expect(updatedSnapshot.data.data.docs[0].author.name).toBe(
			"Ada Lovelace",
		);

		controller.abort();
		reader.close();
	});

	it("re-sends snapshots when global changes", async () => {
		const adapter = new MockRealtimeAdapter();
		const settings = defineGlobal("settings")
			.fields({
				title: text("title"),
			})
			.build();

		const cms = createTestCms([], db, undefined, {
			globals: [settings],
			realtime: { adapter },
		});
		await runTestDbMigrations(cms);

		const routes = createCMSAdapterRoutes(cms, { accessMode: "user" });
		const controller = new AbortController();
		const request = new Request(
			"http://localhost/cms/realtime/globals/settings",
			{ method: "GET", signal: controller.signal },
		);
		const response = await routes.realtime.subscribeGlobal(
			request,
			{ global: "settings" },
			undefined,
		);

		expect(response.ok).toBe(true);
		const reader = createSSEReader(response.body!);
		const initial = await reader.readSnapshot();
		expect(initial.event).toBe("snapshot");
		expect(initial.data.data).not.toBeNull();

		const ctx = createTestContext();
		await cms.api.globals.settings.update({ title: "New Title" }, ctx);

		let updatedSnapshot = await reader.readSnapshot();
		while (updatedSnapshot.data.data?.title !== "New Title") {
			updatedSnapshot = await reader.readSnapshot();
		}

		expect(updatedSnapshot.data.data.title).toBe("New Title");

		controller.abort();
		reader.close();
	});
});
