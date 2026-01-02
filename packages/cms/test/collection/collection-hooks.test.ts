import { describe, it, beforeEach, afterEach, expect } from "bun:test";
import { text, varchar } from "drizzle-orm/pg-core";
import { runTestDbMigrations } from "../utils/test-db";
import { buildMockCMS } from "../utils/mocks/mock-cms-builder";
import { createTestContext } from "../utils/test-context";
import { z } from "zod";
import {
	defineCollection,
	defineJob,
	defineQCMS,
	getCMSFromContext,
} from "#questpie/cms/server/index.js";

const articleCreatedJob = defineJob({
	name: "article:created",
	schema: z.object({
		articleId: z.string(),
		title: z.string(),
	}),
	handler: async () => {},
});

const articleCleanupJob = defineJob({
	name: "article:cleanup",
	schema: z.object({
		articleId: z.string(),
	}),
	handler: async () => {},
});

const articleEnrichedJob = defineJob({
	name: "article:enriched",
	schema: z.object({
		articleId: z.string(),
		enrichment: z.any(),
	}),
	handler: async () => {},
});

// Module definitions at top level for stable types
const createBeforeAfterModule = (hookCallOrder: string[]) =>
	defineQCMS({ name: "test-module" })
		.collections({
			articles: defineCollection("articles")
				.fields({
					title: text("title").notNull(),
					slug: varchar("slug", { length: 255 }),
					status: varchar("status", { length: 50 }),
				})
				.hooks({
					beforeCreate: async ({ data }) => {
						hookCallOrder.push("beforeCreate");
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
						const cms = getCMSFromContext<typeof testModuleBeforeAfter>();
						await cms.queue["article:created"].publish({
							articleId: data.id,
							title: data.title,
						});
					},
				})
				.build(),
		})
		.jobs({
			articleCreated: articleCreatedJob,
		});

const testModuleBeforeAfter = createBeforeAfterModule([]);

const testModuleUpdate = defineQCMS({ name: "test-module" }).collections({
	articles: defineCollection("articles")
		.fields({
			title: text("title").notNull(),
			status: varchar("status", { length: 50 }),
			viewCount: varchar("view_count"),
		})
		.hooks({
			beforeUpdate: async ({ data }) => {
				const cms = getCMSFromContext<typeof testModuleUpdate>();
				if (data.status === "published") {
					cms.logger.info("Article being published", {
						title: data.title,
					});
				}
				return data;
			},
			afterUpdate: async ({ data, original }) => {
				const cms = getCMSFromContext<typeof testModuleUpdate>();
				if (original.status !== "published" && data.status === "published") {
					cms.email?.send({
						to: "admin@example.com",
						subject: "Article Published",
						text: `Article "${data.title}" has been published`,
					});
				}
			},
		})
		.build(),
});

const testModuleDelete = defineQCMS({ name: "test-module" })
	.collections({
		articles: defineCollection("articles")
			.fields({
				title: text("title").notNull(),
			})
			.hooks({
				beforeDelete: async ({ data }) => {
					const cms = getCMSFromContext<typeof testModuleDelete>();
					await cms.logger?.warn("Article deletion requested", {
						id: data.id,
					});
				},
				afterDelete: async ({ data }) => {
					const cms = getCMSFromContext<typeof testModuleDelete>();
					await cms.queue["article:cleanup"].publish({
						articleId: data.id,
					});
				},
			})
			.build(),
	})
	.jobs({
		articleCleanup: articleCleanupJob,
	});

const testModuleError = defineQCMS({ name: "test-module" }).collections({
	articles: defineCollection("articles")
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
		.build(),
});

const createEnrichmentModule = (enrichmentData: Map<string, any>) =>
	defineQCMS({ name: "test-module" })
		.collections({
			articles: defineCollection("articles")
				.fields({
					title: text("title").notNull(),
				})
				.hooks({
					beforeCreate: async ({ data }) => {
						enrichmentData.set(data.id, {
							enriched: true,
							timestamp: Date.now(),
						});
						return data;
					},
					afterCreate: async ({ data }) => {
						const cms = getCMSFromContext<typeof testModuleEnrichment>();
						const enrichment = enrichmentData.get(data.id);
						await cms.queue["article:enriched"].publish({
							articleId: data.id,
							enrichment,
						});
					},
				})
				.build(),
		})
		.jobs({
			articleEnriched: articleEnrichedJob,
		});

const testModuleEnrichment = createEnrichmentModule(new Map());

describe("collection hooks", () => {
	describe("beforeCreate and afterCreate hooks", () => {
		const hookCallOrder: string[] = [];
		let setup: Awaited<
			ReturnType<typeof buildMockCMS<typeof testModuleBeforeAfter>>
		>;

		afterEach(async () => {
			if (setup) await setup.cleanup();
		});

		beforeEach(async () => {
			hookCallOrder.length = 0;
			const testModule = createBeforeAfterModule(hookCallOrder);

			setup = await buildMockCMS(testModule);
			await runTestDbMigrations(setup.cms);
		});

		it("executes beforeCreate to transform data", async () => {
			const ctx = createTestContext();
			const created = await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Hello World",
				},
				ctx,
			);
			expect(created.slug).toBe("hello-world");
		});

		it("executes afterCreate with access to services", async () => {
			const ctx = createTestContext();
			const created = await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Test Article",
				},
				ctx,
			);
			expect(setup.cms.mocks.queue.getJobs()).toHaveLength(1);
			expect(setup.cms.mocks.queue.getJobs()[0].name).toBe("article:created");
			expect(setup.cms.mocks.queue.getJobs()[0].payload.articleId).toBe(
				created.id,
			);
		});

		it("executes hooks in correct order", async () => {
			const ctx = createTestContext();
			await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Order Test",
				},
				ctx,
			);
			expect(hookCallOrder).toEqual(["beforeCreate", "afterCreate"]);
		});
	});

	describe("beforeUpdate and afterUpdate hooks", () => {
		let setup: Awaited<
			ReturnType<typeof buildMockCMS<typeof testModuleUpdate>>
		>;

		afterEach(async () => {
			if (setup) await setup.cleanup();
		});

		beforeEach(async () => {
			setup = await buildMockCMS(testModuleUpdate);
			await runTestDbMigrations(setup.cms);
		});

		it("executes beforeUpdate with data transformation", async () => {
			const ctx = createTestContext();
			const created = await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Draft Article",
					status: "draft",
				},
				ctx,
			);

			await setup.cms.api.collections.articles.updateById(
				{
					id: created.id,
					data: { status: "published" },
				},
				ctx,
			);

			expect(setup.cms.mocks.logger.getLogs()).toHaveLength(1);
			expect(setup.cms.mocks.logger.getLogs()[0].message).toBe(
				"Article being published",
			);
		});

		it("executes afterUpdate with access to original data", async () => {
			const ctx = createTestContext();
			const created = await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Test Article",
					status: "draft",
				},
				ctx,
			);

			await setup.cms.api.collections.articles.updateById(
				{
					id: created.id,
					data: { status: "published" },
				},
				ctx,
			);

			expect(setup.cms.mocks.mailer.getSentCount()).toBe(1);
			const sent = setup.cms.mocks.mailer.getSentMails();
			const lastIndex = sent.length - 1;
			const sentMail = sent[lastIndex];
			expect(sentMail?.subject).toBe("Article Published");
			expect(sentMail?.to).toBe("admin@example.com");
		});

		it("does not trigger email when status unchanged", async () => {
			const ctx = createTestContext();
			const created = await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Published Article",
					status: "published",
				},
				ctx,
			);

			await setup.cms.api.collections.articles.updateById(
				{
					id: created.id,
					data: { title: "Updated Title" },
				},
				ctx,
			);

			expect(setup.cms.mocks.mailer.getSentCount()).toBe(0);
		});
	});

	describe("beforeDelete and afterDelete hooks", () => {
		let setup: Awaited<
			ReturnType<typeof buildMockCMS<typeof testModuleDelete>>
		>;

		afterEach(async () => {
			if (setup) await setup.cleanup();
		});

		beforeEach(async () => {
			setup = await buildMockCMS(testModuleDelete);
			await runTestDbMigrations(setup.cms);
		});

		it("executes beforeDelete with logging", async () => {
			const ctx = createTestContext();
			const created = await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "To Delete",
				},
				ctx,
			);

			await setup.cms.api.collections.articles.deleteById(
				{ id: created.id },
				ctx,
			);

			expect(setup.cms.mocks.logger.getLogs()).toHaveLength(1);
			expect(setup.cms.mocks.logger.getLogs()[0].level).toBe("warn");
			expect(setup.cms.mocks.logger.getLogs()[0].message).toBe(
				"Article deletion requested",
			);
		});

		it("executes afterDelete with cleanup job", async () => {
			const ctx = createTestContext();
			const created = await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "To Delete",
				},
				ctx,
			);

			await setup.cms.api.collections.articles.deleteById(
				{ id: created.id },
				ctx,
			);

			expect(setup.cms.mocks.queue.getJobs()).toHaveLength(1);
			expect(setup.cms.mocks.queue.getJobs()[0].name).toBe("article:cleanup");
			expect(setup.cms.mocks.queue.getJobs()[0].payload.articleId).toBe(
				created.id,
			);
		});
	});

	describe("hook error handling", () => {
		let setup: Awaited<ReturnType<typeof buildMockCMS<typeof testModuleError>>>;

		afterEach(async () => {
			if (setup) await setup.cleanup();
		});

		beforeEach(async () => {
			setup = await buildMockCMS(testModuleError);
			await runTestDbMigrations(setup.cms);
		});

		it("prevents creation when beforeCreate throws", async () => {
			const ctx = createTestContext();
			await expect(
				setup.cms.api.collections.articles.create(
					{
						id: crypto.randomUUID(),
						title: "forbidden",
					},
					ctx,
				),
			).rejects.toThrow("Forbidden title");

			const all = await setup.cms.api.collections.articles.find({}, ctx);
			expect(all.docs.length).toBe(0);
			expect(all.totalDocs).toBe(0);
		});
	});

	describe("multiple hooks with context sharing", () => {
		const enrichmentData: Map<string, any> = new Map();
		let setup: Awaited<
			ReturnType<typeof buildMockCMS<typeof testModuleEnrichment>>
		>;

		afterEach(async () => {
			if (setup) await setup.cleanup();
		});

		beforeEach(async () => {
			enrichmentData.clear();
			const testModule = createEnrichmentModule(enrichmentData);

			setup = await buildMockCMS(testModule);
			await runTestDbMigrations(setup.cms);
		});

		it("shares data between hooks", async () => {
			const ctx = createTestContext();
			await setup.cms.api.collections.articles.create(
				{
					id: crypto.randomUUID(),
					title: "Enriched Article",
				},
				ctx,
			);

			expect(setup.cms.mocks.queue.getJobs()).toHaveLength(1);
			expect(
				setup.cms.mocks.queue.getJobs()[0].payload.enrichment,
			).toBeDefined();
			expect(
				setup.cms.mocks.queue.getJobs()[0].payload.enrichment.enriched,
			).toBe(true);
		});
	});
});
