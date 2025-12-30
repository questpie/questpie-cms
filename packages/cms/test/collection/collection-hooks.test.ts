import { describe, it, beforeEach, afterEach, expect } from "bun:test";
import { text, varchar } from "drizzle-orm/pg-core";
import {
	closeTestDb,
	createTestDb,
	runTestDbMigrations,
} from "../utils/test-db";
import { createTestCms } from "../utils/test-cms";
import { createTestContext } from "../utils/test-context";
import { createMockServices } from "../utils/test-services";
import { defineCollection, getCMSFromContext } from "#questpie/cms/server/index.js";

describe("collection hooks", () => {
	let db: any;
	let client: any;
	let cms: ReturnType<typeof createTestCms> & { __hookCallOrder?: string[] };
	let services: any;

	describe("beforeCreate and afterCreate hooks", () => {
		beforeEach(async () => {
			services = createMockServices();
			const hookCallOrder: string[] = [];

			const articles = defineCollection("articles")
				.fields({
					title: text("title").notNull(),
					slug: varchar("slug", { length: 255 }),
					status: varchar("status", { length: 50 }),
				})
				.hooks({
					beforeCreate: async ({ data }) => {
						hookCallOrder.push("beforeCreate");
						// Auto-generate slug from title
						if (!data.slug && data.title) {
							data.slug = data.title
								.toLowerCase()
								.replace(/\s+/g, "-")
								.replace(/[^a-z0-9-]/g, "");
						}
						return data;
					},
					afterCreate: async ({ data }) => {
						hookCallOrder.push("afterCreate");
						const cms = getCMSFromContext<ReturnType<typeof createTestCms>>();
						// Publish job to queue
						await cms.queue?.publish("article:created", {
							articleId: data.id,
							title: data.title,
						});
					},
				})
				.build();

			const setup = await createTestDb();
			db = setup.db;
			client = setup.client;
			cms = createTestCms([articles], db, services);
			await runTestDbMigrations(cms);
			cms.__hookCallOrder = hookCallOrder;
		});

		afterEach(async () => {
			await closeTestDb(client);
		});

		it("executes beforeCreate to transform data", async () => {
			const ctx = createTestContext(services);

			const created = await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Hello World",
				},
				ctx,
			);

			expect(created.slug).toBe("hello-world");
		});

		it("executes afterCreate with access to services", async () => {
			const ctx = createTestContext(services);
			// Use cms.api.collections.articles directly

			const created = await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Test Article",
				},
				ctx,
			);

			expect(services.queue.__jobs).toHaveLength(1);
			expect(services.queue.__jobs[0].name).toBe("article:created");
			expect(services.queue.__jobs[0].payload.articleId).toBe(created.id);
		});

		it("executes hooks in correct order", async () => {
			const ctx = createTestContext(services);
			// Use cms.api.collections.articles directly

			await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Order Test",
				},
				ctx,
			);

			expect(cms.__hookCallOrder).toEqual(["beforeCreate", "afterCreate"]);
		});
	});

	describe("beforeUpdate and afterUpdate hooks", () => {
		beforeEach(async () => {
			services = createMockServices();
			const articles = defineCollection("articles")
				.fields({
					title: text("title").notNull(),
					status: varchar("status", { length: 50 }),
					viewCount: varchar("view_count"),
				})
				.hooks({
					beforeUpdate: async ({ data }) => {
						const cms = getCMSFromContext<ReturnType<typeof createTestCms>>();
						// Auto-publish when status changes to 'published'
						if (data.status === "published") {
							await cms.logger?.info("Article being published", {
								title: data.title,
							});
						}
						return data;
					},
					afterUpdate: async ({ data, original }) => {
						const cms = getCMSFromContext<ReturnType<typeof createTestCms>>();
						// Send email when published
						if (
							original.status !== "published" &&
							data.status === "published"
						) {
							await cms.email?.send({
								to: "admin@example.com",
								subject: "Article Published",
								text: `Article "${data.title}" has been published`,
							});
						}
					},
				})
				.build();

			const setup = await createTestDb();
			db = setup.db;
			client = setup.client;
			cms = createTestCms([articles], db, services);
			await runTestDbMigrations(cms);
		});

		afterEach(async () => {
			await closeTestDb(client);
		});

		it("executes beforeUpdate with data transformation", async () => {
			const ctx = createTestContext(services);
			// Use cms.api.collections.articles directly

			const created = await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Draft Article",
					status: "draft",
				},
				ctx,
			);

			await cms.api.collections.articles.updateById(
				{
					id: created.id,
					data: { status: "published" },
				},
				ctx,
			);

			expect(services.logger.__logs).toHaveLength(1);
			expect(services.logger.__logs[0].message).toBe("Article being published");
		});

		it("executes afterUpdate with access to original data", async () => {
			const ctx = createTestContext(services);
			// Use cms.api.collections.articles directly

			const created = await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Test Article",
					status: "draft",
				},
				ctx,
			);

			await cms.api.collections.articles.updateById(
				{
					id: created.id,
					data: { status: "published" },
				},
				ctx,
			);

			expect(services.email.__sent).toHaveLength(1);
			expect(services.email.__sent[0].subject).toBe("Article Published");
			expect(services.email.__sent[0].to).toBe("admin@example.com");
		});

		it("does not trigger email when status unchanged", async () => {
			const ctx = createTestContext(services);
			// Use cms.api.collections.articles directly

			const created = await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Published Article",
					status: "published",
				},
				ctx,
			);

			await cms.api.collections.articles.updateById(
				{
					id: created.id,
					data: { title: "Updated Title" },
				},
				ctx,
			);

			// Email should not be sent since status was already published
			expect(services.email.__sent).toHaveLength(0);
		});
	});

	describe("beforeDelete and afterDelete hooks", () => {
		beforeEach(async () => {
			services = createMockServices();
			const articles = defineCollection("articles")
				.fields({
					title: text("title").notNull(),
				})
				.hooks({
					beforeDelete: async ({ data }) => {
						const cms = getCMSFromContext<ReturnType<typeof createTestCms>>();
						// Log deletion attempt
						await cms.logger?.warn("Article deletion requested", {
							id: data.id,
						});
					},
					afterDelete: async ({ data }) => {
						const cms = getCMSFromContext<ReturnType<typeof createTestCms>>();
						// Clean up related data via queue job
						await cms.queue?.publish("article:cleanup", { articleId: data.id });
					},
				})
				.build();

			const setup = await createTestDb();
			db = setup.db;
			client = setup.client;
			cms = createTestCms([articles], db, services);
			await runTestDbMigrations(cms);
		});

		afterEach(async () => {
			await closeTestDb(client);
		});

		it("executes beforeDelete with logging", async () => {
			const ctx = createTestContext(services);
			// Use cms.api.collections.articles directly

			const created = await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "To Delete",
				},
				ctx,
			);

			await cms.api.collections.articles.deleteById({ id: created.id }, ctx);

			expect(services.logger.__logs).toHaveLength(1);
			expect(services.logger.__logs[0].level).toBe("warn");
			expect(services.logger.__logs[0].message).toBe(
				"Article deletion requested",
			);
		});

		it("executes afterDelete with cleanup job", async () => {
			const ctx = createTestContext(services);
			// Use cms.api.collections.articles directly

			const created = await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "To Delete",
				},
				ctx,
			);

			await cms.api.collections.articles.deleteById({ id: created.id }, ctx);

			expect(services.queue.__jobs).toHaveLength(1);
			expect(services.queue.__jobs[0].name).toBe("article:cleanup");
			expect(services.queue.__jobs[0].payload.articleId).toBe(created.id);
		});
	});

	describe("hook error handling", () => {
		beforeEach(async () => {
			const articles = defineCollection("articles")
				.fields({
					title: text("title").notNull(),
					status: varchar("status", { length: 50 }),
				})
				.hooks({
					beforeCreate: async ({ data }) => {
						if (data.title === "forbidden") {
							throw new Error("Forbidden title");
						}
						return data;
					},
				})
				.build();

			const setup = await createTestDb();
			db = setup.db;
			client = setup.client;
			cms = createTestCms([articles], db);
			await runTestDbMigrations(cms);
		});

		afterEach(async () => {
			await closeTestDb(client);
		});

		it("prevents creation when beforeCreate throws", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.articles directly

			await expect(
				cms.api.collections.articles.create(
					{
						id: crypto.randomUUID(),
						title: "forbidden",
					},
					ctx,
				),
			).rejects.toThrow("Forbidden title");

			// Verify nothing was created
			const all = await cms.api.collections.articles.find({}, ctx);
			expect(all.docs.length).toBe(0);
			expect(all.totalDocs).toBe(0);
		});
	});

	describe("multiple hooks with context sharing", () => {
		beforeEach(async () => {
			services = createMockServices();
			const enrichmentData: Map<string, any> = new Map();

			const articles = defineCollection("articles")
				.fields({
					title: text("title").notNull(),
				})
				.hooks({
					beforeCreate: async ({ data }) => {
						// First hook enriches data
						enrichmentData.set(data.id, {
							enriched: true,
							timestamp: Date.now(),
						});
						return data;
					},
					afterCreate: async ({ data }) => {
						const cms = getCMSFromContext<ReturnType<typeof createTestCms>>();
						// Second hook accesses enrichment
						const enrichment = enrichmentData.get(data.id);
						await cms.queue?.publish("article:enriched", {
							articleId: data.id,
							enrichment,
						});
					},
				})
				.build();

			const setup = await createTestDb();
			db = setup.db;
			client = setup.client;
			cms = createTestCms([articles], db, services);
			await runTestDbMigrations(cms);
		});

		afterEach(async () => {
			await closeTestDb(client);
		});

		it("shares data between hooks", async () => {
			const ctx = createTestContext(services);
			// Use cms.api.collections.articles directly

			await cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Enriched Article",
				},
				ctx,
			);

			expect(services.queue.__jobs).toHaveLength(1);
			expect(services.queue.__jobs[0].payload.enrichment).toBeDefined();
			expect(services.queue.__jobs[0].payload.enrichment.enriched).toBe(true);
		});
	});
});
