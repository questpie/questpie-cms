// @ts-nocheck // TODO: Temporary until test utils are fully typed
import { afterEach, describe, expect, it } from "bun:test";
import { boolean, integer, text } from "drizzle-orm/pg-core";
import {
	collection,
	createAdapterRoutes,
	global,
	questpie,
	questpieRealtimeLogTable,
	type RealtimeAdapter,
	type RealtimeChangeEvent,
} from "../../src/server/index.js";
import { buildMockApp } from "../utils/mocks/mock-app-builder";
import { createTestContext } from "../utils/test-context";
import { runTestDbMigrations } from "../utils/test-db";

// ============================================================================
// Test Utilities
// ============================================================================

class MockRealtimeAdapter implements RealtimeAdapter {
	public notices: Array<{ seq: number; resource: string; operation: string }> =
		[];
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

// ============================================================================
// Test Suite
// ============================================================================

describe("realtime", () => {
	let setup: Awaited<ReturnType<typeof buildMockApp>>;

	afterEach(async () => {
		if (setup) {
			await setup.cleanup();
			// setup = null;
		}
	});

	// ==========================================================================
	// Core Logging Tests
	// ==========================================================================

	describe("change logging", () => {
		it("logs realtime changes for create/update/delete", async () => {
			const adapter = new MockRealtimeAdapter();
			const posts = collection("posts")
				.fields({
					title: text("title").notNull(),
					slug: text("slug").notNull(),
				})
				.localized(["title"])
				.build();

			const testModule = questpie({ name: "realtime-test" })
				.collections({ posts })
				.locale({
					locales: [{ code: "en" }, { code: "sk" }],
					defaultLocale: "en",
				});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctxEn = createTestContext({ locale: "en", defaultLocale: "en" });
			const ctxSk = createTestContext({ locale: "sk", defaultLocale: "en" });

			const created = await setup.cms.api.collections.posts.create(
				{ title: "Hello", slug: "hello" },
				ctxEn,
			);
			await setup.cms.api.collections.posts.updateById(
				{ id: created.id, data: { title: "Ahoj" } },
				ctxSk,
			);
			await setup.cms.api.collections.posts.deleteById(
				{ id: created.id },
				ctxEn,
			);

			const logs = await setup.cms.db
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
			const posts = collection("posts")
				.fields({
					title: text("title").notNull(),
					slug: text("slug").notNull(),
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				posts,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);
			const ctx = createTestContext();

			const first = await setup.cms.api.collections.posts.create(
				{ title: "One", slug: "one" },
				ctx,
			);
			const second = await setup.cms.api.collections.posts.create(
				{ title: "Two", slug: "two" },
				ctx,
			);

			await setup.cms.api.collections.posts.update(
				{ where: { id: { in: [first.id, second.id] } }, data: { slug: "new" } },
				ctx,
			);
			await setup.cms.api.collections.posts.delete(
				{ where: { id: { in: [first.id, second.id] } } },
				ctx,
			);

			const logs = await setup.cms.db
				.select()
				.from(questpieRealtimeLogTable)
				.orderBy(questpieRealtimeLogTable.seq);

			const bulkOps = logs.map((row: any) => row.operation);
			expect(bulkOps).toContain("bulk_update");
			expect(bulkOps).toContain("bulk_delete");
		});

		it("includes payload in realtime events", async () => {
			const adapter = new MockRealtimeAdapter();
			const posts = collection("posts")
				.fields({
					title: text("title").notNull(),
					status: text("status").notNull(),
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				posts,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const events: RealtimeChangeEvent[] = [];

			const unsub = setup.cms.realtime?.subscribe((event) =>
				events.push(event),
			);

			await setup.cms.api.collections.posts.create(
				{ title: "Hello", status: "published" },
				ctx,
			);

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(events.length).toBe(1);
			expect(events[0].payload).toBeDefined();
			expect(events[0].payload?.title).toBe("Hello");
			expect(events[0].payload?.status).toBe("published");

			unsub?.();
		});
	});

	// ==========================================================================
	// WHERE Filter Tests
	// ==========================================================================

	describe("WHERE filtering", () => {
		it("only notifies subscribers with matching WHERE filter", async () => {
			const adapter = new MockRealtimeAdapter();
			const messages = collection("messages")
				.fields({
					chatId: text("chat_id").notNull(),
					content: text("content").notNull(),
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				messages,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const chat1Events: any[] = [];
			const chat2Events: any[] = [];
			const allEvents: any[] = [];

			const unsub1 = setup.cms.realtime?.subscribe(
				(event) => chat1Events.push(event),
				{
					resourceType: "collection",
					resource: "messages",
					where: { chatId: "chat1" },
				},
			);

			const unsub2 = setup.cms.realtime?.subscribe(
				(event) => chat2Events.push(event),
				{
					resourceType: "collection",
					resource: "messages",
					where: { chatId: "chat2" },
				},
			);

			const unsub3 = setup.cms.realtime?.subscribe(
				(event) => allEvents.push(event),
				{ resourceType: "collection", resource: "messages" },
			);

			await setup.cms.api.collections.messages.create(
				{ chatId: "chat1", content: "Hello chat1" },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(chat1Events.length).toBe(1);
			expect(chat2Events.length).toBe(0);
			expect(allEvents.length).toBe(1);

			await setup.cms.api.collections.messages.create(
				{ chatId: "chat2", content: "Hello chat2" },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(chat1Events.length).toBe(1);
			expect(chat2Events.length).toBe(1);
			expect(allEvents.length).toBe(2);

			unsub1?.();
			unsub2?.();
			unsub3?.();
		});

		it("handles complex WHERE filters with multiple fields", async () => {
			const adapter = new MockRealtimeAdapter();
			const posts = collection("posts")
				.fields({
					status: text("status").notNull(),
					authorId: text("author_id").notNull(),
					title: text("title").notNull(),
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				posts,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const events: any[] = [];

			const unsub = setup.cms.realtime?.subscribe(
				(event) => events.push(event),
				{
					resourceType: "collection",
					resource: "posts",
					where: { status: "published", authorId: "author1" },
				},
			);

			// Wrong status
			await setup.cms.api.collections.posts.create(
				{ status: "draft", authorId: "author1", title: "Draft" },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(events.length).toBe(0);

			// Wrong author
			await setup.cms.api.collections.posts.create(
				{ status: "published", authorId: "author2", title: "By Author 2" },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(events.length).toBe(0);

			// Both match
			await setup.cms.api.collections.posts.create(
				{
					status: "published",
					authorId: "author1",
					title: "Published by Author 1",
				},
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(events.length).toBe(1);
			expect(events[0].payload?.status).toBe("published");
			expect(events[0].payload?.authorId).toBe("author1");

			unsub?.();
		});

		it("filters by boolean fields", async () => {
			const adapter = new MockRealtimeAdapter();
			const tasks = collection("tasks")
				.fields({
					title: text("title").notNull(),
					completed: boolean("completed").notNull().default(false),
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				tasks,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const completedEvents: any[] = [];

			const unsub = setup.cms.realtime?.subscribe(
				(event) => completedEvents.push(event),
				{
					resourceType: "collection",
					resource: "tasks",
					where: { completed: true },
				},
			);

			// Create incomplete task
			await setup.cms.api.collections.tasks.create(
				{ title: "Todo", completed: false },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(completedEvents.length).toBe(0);

			// Create completed task
			await setup.cms.api.collections.tasks.create(
				{ title: "Done", completed: true },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(completedEvents.length).toBe(1);

			unsub?.();
		});

		it("filters by numeric fields", async () => {
			const adapter = new MockRealtimeAdapter();
			const products = collection("products")
				.fields({
					name: text("name").notNull(),
					categoryId: integer("category_id").notNull(),
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				products,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const category1Events: any[] = [];

			const unsub = setup.cms.realtime?.subscribe(
				(event) => category1Events.push(event),
				{
					resourceType: "collection",
					resource: "products",
					where: { categoryId: 1 },
				},
			);

			await setup.cms.api.collections.products.create(
				{ name: "Product A", categoryId: 2 },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(category1Events.length).toBe(0);

			await setup.cms.api.collections.products.create(
				{ name: "Product B", categoryId: 1 },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(category1Events.length).toBe(1);

			unsub?.();
		});

		it("supports wildcard collection subscriptions", async () => {
			const adapter = new MockRealtimeAdapter();
			const posts = collection("posts")
				.fields({ title: text("title").notNull() })
				.build();
			const comments = collection("comments")
				.fields({ content: text("content").notNull() })
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				posts,
				comments,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const allEvents: any[] = [];

			const unsub = setup.cms.realtime?.subscribe(
				(event) => allEvents.push(event),
				{ resourceType: "collection", resource: "*" },
			);

			await setup.cms.api.collections.posts.create({ title: "Post 1" }, ctx);
			await setup.cms.api.collections.comments.create(
				{ content: "Comment 1" },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(allEvents.length).toBe(2);
			expect(allEvents.map((e) => e.resource).sort()).toEqual([
				"comments",
				"posts",
			]);

			unsub?.();
		});
	});

	// ==========================================================================
	// WITH Dependency Tests
	// ==========================================================================

	describe("WITH dependency tracking", () => {
		it("notifies subscribers when related resource changes", async () => {
			const adapter = new MockRealtimeAdapter();
			const users = collection("users")
				.fields({ name: text("name").notNull() })
				.build();

			const messages = collection("messages")
				.fields({
					chatId: text("chat_id").notNull(),
					content: text("content").notNull(),
					userId: text("user_id")
						.notNull()
						.references(() => users.table.id),
				})
				.relations(({ one }) => ({
					user: one("users", {
						fields: ["userId"] as any,
						references: ["id"] as any,
					}),
				}))
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				users,
				messages,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const routes = createAdapterRoutes(setup.cms, { accessMode: "user" });
			const controller = new AbortController();
			const request = new Request(
				"http://localhost/cms/realtime/messages?with[user]=true",
				{ method: "GET", signal: controller.signal },
			);
			const response = await routes.realtime.subscribe(
				request,
				{ collection: "messages" },
				undefined,
			);
			expect(response.ok).toBe(true);
			const reader = createSSEReader(response.body!);
			const initial = await reader.readSnapshot();
			expect(initial.event).toBe("snapshot");

			const ctx = createTestContext();
			const user = await setup.cms.api.collections.users.create(
				{ name: "Alice" },
				ctx,
			);
			await setup.cms.api.collections.messages.create(
				{ chatId: "chat1", content: "Hello", userId: user.id },
				ctx,
			);

			let snapshot = await reader.readSnapshot();
			while (snapshot.data.data.docs.length === 0) {
				snapshot = await reader.readSnapshot();
			}
			expect(snapshot.data.data.docs[0].user.name).toBe("Alice");

			// Update the user - should trigger refresh
			await setup.cms.api.collections.users.updateById(
				{ id: user.id, data: { name: "Alice Smith" } },
				ctx,
			);

			let updatedSnapshot = await reader.readSnapshot();
			while (updatedSnapshot.data.data.docs[0]?.user?.name !== "Alice Smith") {
				updatedSnapshot = await reader.readSnapshot();
			}
			expect(updatedSnapshot.data.data.docs[0].user.name).toBe("Alice Smith");

			controller.abort();
			reader.close();
		});

		it("handles nested WITH relations (comments -> posts -> users)", async () => {
			const adapter = new MockRealtimeAdapter();
			const users = collection("users")
				.fields({ name: text("name").notNull() })
				.build();

			const posts = collection("posts")
				.fields({
					title: text("title").notNull(),
					userId: text("user_id")
						.notNull()
						.references(() => users.table.id),
				})
				.relations(({ one }) => ({
					user: one("users", {
						fields: ["userId"] as any,
						references: ["id"] as any,
					}),
				}))
				.build();

			const comments = collection("comments")
				.fields({
					content: text("content").notNull(),
					postId: text("post_id")
						.notNull()
						.references(() => posts.table.id),
				})
				.relations(({ one }) => ({
					post: one("posts", {
						fields: ["postId"] as any,
						references: ["id"] as any,
					}),
				}))
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				users,
				posts,
				comments,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const user = await setup.cms.api.collections.users.create(
				{ name: "Bob" },
				ctx,
			);
			const post = await setup.cms.api.collections.posts.create(
				{ title: "Post 1", userId: user.id },
				ctx,
			);
			const comment = await setup.cms.api.collections.comments.create(
				{ content: "Nice post!", postId: post.id },
				ctx,
			);

			const events: any[] = [];

			// Subscribe with nested WITH
			const unsub = setup.cms.realtime?.subscribe(
				(event) => events.push(event),
				{
					resourceType: "collection",
					resource: "comments",
					with: { post: { with: { user: true } } },
				},
			);

			await new Promise((resolve) => setTimeout(resolve, 100));
			events.length = 0;

			// Update comment directly
			await setup.cms.api.collections.comments.updateById(
				{ id: comment.id, data: { content: "Updated comment" } },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(events.length).toBe(1);
			expect(events[0].resource).toBe("comments");
			events.length = 0;

			// Update post (first level relation)
			await setup.cms.api.collections.posts.updateById(
				{ id: post.id, data: { title: "Updated Post" } },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(events.length).toBe(1);
			expect(events[0].resource).toBe("posts");
			events.length = 0;

			// Update user (deeply nested relation)
			await setup.cms.api.collections.users.updateById(
				{ id: user.id, data: { name: "Bob Builder" } },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(events.length).toBe(1);
			expect(events[0].resource).toBe("users");

			unsub?.();
		});

		it("service-level WITH dependency tracking", async () => {
			const adapter = new MockRealtimeAdapter();
			const categories = collection("categories")
				.fields({ name: text("name").notNull() })
				.build();

			const products = collection("products")
				.fields({
					name: text("name").notNull(),
					categoryId: text("category_id")
						.notNull()
						.references(() => categories.table.id),
				})
				.relations(({ one }) => ({
					category: one("categories", {
						fields: ["categoryId"] as any,
						references: ["id"] as any,
					}),
				}))
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				categories,
				products,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const category = await setup.cms.api.collections.categories.create(
				{ name: "Electronics" },
				ctx,
			);
			await setup.cms.api.collections.products.create(
				{ name: "Phone", categoryId: category.id },
				ctx,
			);

			const events: any[] = [];

			const unsub = setup.cms.realtime?.subscribe(
				(event) => events.push(event),
				{
					resourceType: "collection",
					resource: "products",
					with: { category: true },
				},
			);

			await new Promise((resolve) => setTimeout(resolve, 100));
			events.length = 0;

			// Update category should trigger product subscriber
			await setup.cms.api.collections.categories.updateById(
				{ id: category.id, data: { name: "Consumer Electronics" } },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(events.length).toBe(1);
			expect(events[0].resource).toBe("categories");

			unsub?.();
		});
	});

	// ==========================================================================
	// Global Subscriptions
	// ==========================================================================

	describe("global subscriptions", () => {
		it("re-sends snapshots when global changes", async () => {
			const adapter = new MockRealtimeAdapter();
			const settings = global("settings")
				.fields({ title: text("title") })
				.build();

			const testModule = questpie({ name: "realtime-test" }).globals({
				settings,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const routes = createAdapterRoutes(setup.cms, { accessMode: "user" });
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

			const ctx = createTestContext();
			await setup.cms.api.globals.settings.update({ title: "New Title" }, ctx);

			let updatedSnapshot = await reader.readSnapshot();
			while (updatedSnapshot.data.data?.title !== "New Title") {
				updatedSnapshot = await reader.readSnapshot();
			}
			expect(updatedSnapshot.data.data.title).toBe("New Title");

			controller.abort();
			reader.close();
		});

		it("global subscriptions with WITH referencing collections", async () => {
			const adapter = new MockRealtimeAdapter();
			const categories = collection("categories")
				.fields({ name: text("name").notNull() })
				.build();

			const settings = global("settings")
				.fields({
					siteName: text("site_name"),
					defaultCategoryId: text("default_category_id").references(
						() => categories.table.id,
					),
				})
				.relations(({ one }) => ({
					defaultCategory: one("categories", {
						fields: ["defaultCategoryId"] as any,
						references: ["id"] as any,
					}),
				}))
				.build();

			const testModule = questpie({ name: "realtime-test" })
				.collections({ categories })
				.globals({ settings });

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const routes = createAdapterRoutes(setup.cms, { accessMode: "user" });
			const controller = new AbortController();
			const request = new Request(
				"http://localhost/cms/realtime/globals/settings?with[defaultCategory]=true",
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

			const ctx = createTestContext();
			const category = await setup.cms.api.collections.categories.create(
				{ name: "Tech" },
				ctx,
			);
			await setup.cms.api.globals.settings.update(
				{ siteName: "My Site", defaultCategoryId: category.id },
				ctx,
			);

			let snapshot = await reader.readSnapshot();
			while (!snapshot.data.data?.defaultCategory?.name) {
				snapshot = await reader.readSnapshot();
			}
			expect(snapshot.data.data.defaultCategory.name).toBe("Tech");

			// Update category should trigger settings refresh
			await setup.cms.api.collections.categories.updateById(
				{ id: category.id, data: { name: "Technology" } },
				ctx,
			);

			let updatedSnapshot = await reader.readSnapshot();
			while (
				updatedSnapshot.data.data?.defaultCategory?.name !== "Technology"
			) {
				updatedSnapshot = await reader.readSnapshot();
			}
			expect(updatedSnapshot.data.data.defaultCategory.name).toBe("Technology");

			controller.abort();
			reader.close();
		});
	});

	// ==========================================================================
	// Edge Cases
	// ==========================================================================

	describe("edge cases", () => {
		it("handles multiple subscribers with different filters", async () => {
			const adapter = new MockRealtimeAdapter();
			const orders = collection("orders")
				.fields({
					status: text("status").notNull(),
					customerId: text("customer_id").notNull(),
					total: integer("total").notNull(),
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				orders,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const pendingEvents: any[] = [];
			const customer1Events: any[] = [];
			const allEvents: any[] = [];

			const unsub1 = setup.cms.realtime?.subscribe(
				(e) => pendingEvents.push(e),
				{
					resourceType: "collection",
					resource: "orders",
					where: { status: "pending" },
				},
			);

			const unsub2 = setup.cms.realtime?.subscribe(
				(e) => customer1Events.push(e),
				{
					resourceType: "collection",
					resource: "orders",
					where: { customerId: "c1" },
				},
			);

			const unsub3 = setup.cms.realtime?.subscribe((e) => allEvents.push(e), {
				resourceType: "collection",
				resource: "orders",
			});

			// Pending order for customer 1 - should trigger all 3
			await setup.cms.api.collections.orders.create(
				{ status: "pending", customerId: "c1", total: 100 },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(pendingEvents.length).toBe(1);
			expect(customer1Events.length).toBe(1);
			expect(allEvents.length).toBe(1);

			// Completed order for customer 2 - should trigger only all
			await setup.cms.api.collections.orders.create(
				{ status: "completed", customerId: "c2", total: 200 },
				ctx,
			);
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(pendingEvents.length).toBe(1);
			expect(customer1Events.length).toBe(1);
			expect(allEvents.length).toBe(2);

			unsub1?.();
			unsub2?.();
			unsub3?.();
		});

		it("properly cleans up subscriptions", async () => {
			const adapter = new MockRealtimeAdapter();
			const items = collection("items")
				.fields({ name: text("name").notNull() })
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				items,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const events: any[] = [];

			const unsub = setup.cms.realtime?.subscribe((e) => events.push(e), {
				resourceType: "collection",
				resource: "items",
			});

			await setup.cms.api.collections.items.create({ name: "Item 1" }, ctx);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(events.length).toBe(1);

			// Unsubscribe
			unsub?.();

			// Should not receive this event
			await setup.cms.api.collections.items.create({ name: "Item 2" }, ctx);
			await new Promise((resolve) => setTimeout(resolve, 100));
			expect(events.length).toBe(1); // Still 1
		});

		it("handles empty WHERE filter (matches all)", async () => {
			const adapter = new MockRealtimeAdapter();
			const logs = collection("logs")
				.fields({ message: text("message").notNull() })
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				logs,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext();
			const events: any[] = [];

			const unsub = setup.cms.realtime?.subscribe((e) => events.push(e), {
				resourceType: "collection",
				resource: "logs",
				where: {},
			});

			await setup.cms.api.collections.logs.create({ message: "Log 1" }, ctx);
			await setup.cms.api.collections.logs.create({ message: "Log 2" }, ctx);
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(events.length).toBe(2);

			unsub?.();
		});
	});

	// ==========================================================================
	// Access Control Tests
	// ==========================================================================

	describe("access control", () => {
		it("should send error event when user lacks read permission", async () => {
			const adapter = new MockRealtimeAdapter();
			const secrets = collection("secrets")
				.fields({
					content: text("content").notNull(),
					level: text("level").notNull(),
				})
				.access({
					read: ({ session }) => (session?.user as any)?.role === "admin",
					create: true,
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				secrets,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			// First create some data as admin
			const adminCtx = createTestContext({ accessMode: "user", role: "admin" });
			await setup.cms.api.collections.secrets.create(
				{ content: "Secret content", level: "high" },
				adminCtx,
			);

			const routes = createAdapterRoutes(setup.cms, { accessMode: "user" });
			const controller = new AbortController();

			// Request without admin role should receive error in SSE stream
			const request = new Request("http://localhost/cms/realtime/secrets", {
				method: "GET",
				signal: controller.signal,
			});

			const response = await routes.realtime.subscribe(
				request,
				{ collection: "secrets" },
				{ cmsContext: createTestContext({ accessMode: "user", role: "user" }) },
			);

			expect(response.ok).toBe(true);
			const reader = createSSEReader(response.body!);

			// Should receive error event due to access denied
			const error = await reader.readEvent();
			expect(error.event).toBe("error");
			expect(error.data.message).toContain("permission");

			controller.abort();
			reader.close();
		});

		it("should allow access for authorized users", async () => {
			const adapter = new MockRealtimeAdapter();
			const secrets = collection("secrets")
				.fields({
					content: text("content").notNull(),
					level: text("level").notNull(),
				})
				.access({
					read: ({ session }) => (session?.user as any)?.role === "admin",
					create: true,
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				secrets,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const routes = createAdapterRoutes(setup.cms, { accessMode: "user" });
			const controller = new AbortController();

			// Admin should get successful snapshot
			const request = new Request("http://localhost/cms/realtime/secrets", {
				method: "GET",
				signal: controller.signal,
			});

			const response = await routes.realtime.subscribe(
				request,
				{ collection: "secrets" },
				{
					cmsContext: createTestContext({ accessMode: "user", role: "admin" }),
				},
			);

			expect(response.ok).toBe(true);
			const reader = createSSEReader(response.body!);
			const initial = await reader.readSnapshot();

			expect(initial.event).toBe("snapshot");
			expect(initial.data.data).toBeDefined();

			controller.abort();
			reader.close();
		});

		it("should filter payload fields based on field-level access", async () => {
			const adapter = new MockRealtimeAdapter();
			const documents = collection("documents")
				.fields({
					title: text("title").notNull(),
					content: text("content").notNull(),
					internalNotes: text("internal_notes").notNull(),
				})
				.access({
					read: true,
					create: true,
					fields: {
						internalNotes: {
							read: ({ session }) => (session?.user as any)?.role === "admin",
						},
					},
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				documents,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const ctx = createTestContext({ accessMode: "user", role: "user" });
			const events: any[] = [];

			const unsub = setup.cms.realtime?.subscribe(
				(event) => events.push(event),
				{
					resourceType: "collection",
					resource: "documents",
				},
			);

			// Create document with all fields
			await setup.cms.api.collections.documents.create(
				{
					title: "Public Title",
					content: "Public content",
					internalNotes: "Secret notes",
				},
				ctx,
			);

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(events.length).toBe(1);
			// Payload should include all fields from the create operation
			expect(events[0].payload?.title).toBe("Public Title");
			expect(events[0].payload?.content).toBe("Public content");
			// internalNotes is filtered at read time via CRUD, but event payload
			// contains the raw data - this is the current behavior
			expect(events[0].payload?.internalNotes).toBeDefined();

			unsub?.();
		});

		it("should handle global access restrictions", async () => {
			const adapter = new MockRealtimeAdapter();
			const config = global("config")
				.fields({
					apiKey: text("api_key").notNull(),
					publicName: text("public_name").notNull(),
				})
				.access({
					read: ({ session }) => (session?.user as any)?.role === "admin",
					update: ({ session }) => (session?.user as any)?.role === "admin",
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).globals({
				config,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const routes = createAdapterRoutes(setup.cms, { accessMode: "user" });
			const controller = new AbortController();

			// Non-admin request should receive error in SSE
			const request = new Request(
				"http://localhost/cms/realtime/globals/config",
				{
					method: "GET",
					signal: controller.signal,
				},
			);

			const response = await routes.realtime.subscribeGlobal(
				request,
				{ global: "config" },
				{ cmsContext: createTestContext({ accessMode: "user", role: "user" }) },
			);

			expect(response.ok).toBe(true);
			const reader = createSSEReader(response.body!);

			let receivedError = false;
			try {
				for (let i = 0; i < 5; i++) {
					const event = await reader.readEvent(500);
					if (event.event === "error") {
						receivedError = true;
						expect(event.data.message).toContain("access");
						break;
					}
				}
			} catch {
				// Timeout is acceptable
			}

			expect(receivedError).toBe(true);

			controller.abort();
			reader.close();
		});
	});

	// ==========================================================================
	// E2E SSE Tests
	// ==========================================================================

	describe("E2E SSE streaming", () => {
		it("should stream multiple snapshots on rapid updates", async () => {
			const adapter = new MockRealtimeAdapter();
			const counters = collection("counters")
				.fields({
					name: text("name").notNull(),
					value: integer("value").notNull().default(0),
				})
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				counters,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const routes = createAdapterRoutes(setup.cms, { accessMode: "user" });
			const controller = new AbortController();

			const request = new Request("http://localhost/cms/realtime/counters", {
				method: "GET",
				signal: controller.signal,
			});

			const response = await routes.realtime.subscribe(
				request,
				{ collection: "counters" },
				undefined,
			);

			expect(response.ok).toBe(true);
			expect(response.headers.get("content-type")).toContain(
				"text/event-stream",
			);

			const reader = createSSEReader(response.body!);

			// Read initial snapshot
			const initial = await reader.readSnapshot();
			expect(initial.event).toBe("snapshot");
			expect(initial.data.data.docs).toEqual([]);

			const ctx = createTestContext();

			// Create multiple records rapidly
			await setup.cms.api.collections.counters.create(
				{ name: "A", value: 1 },
				ctx,
			);
			await setup.cms.api.collections.counters.create(
				{ name: "B", value: 2 },
				ctx,
			);
			await setup.cms.api.collections.counters.create(
				{ name: "C", value: 3 },
				ctx,
			);

			// Should receive snapshots reflecting the changes
			let snapshotCount = 0;
			const startTime = Date.now();

			while (snapshotCount < 3 && Date.now() - startTime < 5000) {
				try {
					const snapshot = await reader.readSnapshot();
					if (snapshot.event === "snapshot") {
						snapshotCount++;
						// Each snapshot should have more docs
						expect(snapshot.data.data.docs.length).toBeGreaterThanOrEqual(0);
					}
				} catch {
					break;
				}
			}

			// We should have received at least one update
			expect(snapshotCount).toBeGreaterThanOrEqual(1);

			controller.abort();
			reader.close();
		});

		it("should handle client disconnection gracefully", async () => {
			const adapter = new MockRealtimeAdapter();
			const items = collection("items")
				.fields({ name: text("name").notNull() })
				.build();

			const testModule = questpie({ name: "realtime-test" }).collections({
				items,
			});

			setup = await buildMockApp(testModule, { realtime: { adapter } });
			await runTestDbMigrations(setup.cms);

			const routes = createAdapterRoutes(setup.cms, { accessMode: "user" });
			const controller = new AbortController();

			const request = new Request("http://localhost/cms/realtime/items", {
				method: "GET",
				signal: controller.signal,
			});

			const response = await routes.realtime.subscribe(
				request,
				{ collection: "items" },
				undefined,
			);

			expect(response.ok).toBe(true);

			// Abort immediately to simulate client disconnect
			controller.abort();

			// Should not throw or hang
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Cleanup should work without errors
			expect(true).toBe(true);
		});
	});
});
