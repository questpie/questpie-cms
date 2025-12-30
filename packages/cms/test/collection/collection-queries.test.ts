import { describe, it, beforeEach, afterEach, expect } from "bun:test";
import {
	text,
	varchar,
	integer,
	boolean,
	timestamp,
} from "drizzle-orm/pg-core";
import {
	closeTestDb,
	createTestDb,
	runTestDbMigrations,
} from "../utils/test-db";
import { createTestCms } from "../utils/test-cms";
import { createTestContext } from "../utils/test-context";
import { defineCollection } from "#questpie/cms/server/index.js";

describe("collection query operations", () => {
	let db: any;
	let client: any;
	let cms: any;
	let testPosts: any[];

	beforeEach(async () => {
		const posts = defineCollection("posts")
			.fields({
				title: text("title").notNull(),
				slug: varchar("slug", { length: 255 }).notNull(),
				status: varchar("status", { length: 50 }),
				viewCount: integer("view_count"),
				isFeatured: boolean("is_featured"),
				publishedAt: timestamp("published_at"),
			})
			.options({
				timestamps: true,
				softDelete: true,
			})
			.build();

		const setup = await createTestDb();
		db = setup.db;
		client = setup.client;
		cms = createTestCms([posts], db);
		await runTestDbMigrations(cms);

		// Seed test data
		const ctx = createTestContext();
		// Use cms.api.collections.posts directly

		testPosts = await Promise.all([
			cms.api.collections.posts.create(
				{
					id: crypto.randomUUID(),
					title: "First Post",
					slug: "first-post",
					status: "published",
					viewCount: 100,
					isFeatured: true,
					publishedAt: new Date("2024-01-01"),
				},
				ctx,
			),
			cms.api.collections.posts.create(
				{
					id: crypto.randomUUID(),
					title: "Second Post",
					slug: "second-post",
					status: "published",
					viewCount: 50,
					isFeatured: false,
					publishedAt: new Date("2024-01-02"),
				},
				ctx,
			),
			cms.api.collections.posts.create(
				{
					id: crypto.randomUUID(),
					title: "Draft Post",
					slug: "draft-post",
					status: "draft",
					viewCount: 0,
					isFeatured: false,
					publishedAt: null,
				},
				ctx,
			),
			cms.api.collections.posts.create(
				{
					id: crypto.randomUUID(),
					title: "Popular Post",
					slug: "popular-post",
					status: "published",
					viewCount: 500,
					isFeatured: true,
					publishedAt: new Date("2024-01-03"),
				},
				ctx,
			),
			cms.api.collections.posts.create(
				{
					id: crypto.randomUUID(),
					title: "Archived Post",
					slug: "archived-post",
					status: "archived",
					viewCount: 25,
					isFeatured: false,
					publishedAt: new Date("2023-12-15"),
				},
				ctx,
			),
		]);
	});

	afterEach(async () => {
		await closeTestDb(client);
	});

	describe("basic queries", () => {
		it("finds all posts", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find({}, ctx);
			expect(result.docs.length).toBe(5);
			expect(result.totalDocs).toBe(5);
			expect(result.limit).toBe(5); // Default (all)
			expect(result.totalPages).toBe(1);
		});

		it("finds post by ID", async () => {
			const _ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const post = await cms.api.collections.posts.findOne(
				{ where: { id: testPosts[0].id } },
				_ctx,
			);
			expect(post?.title).toBe("First Post");
		});

		it("returns null when post not found", async () => {
			const _ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const post = await cms.api.collections.posts.findOne(
				{ where: { id: crypto.randomUUID() } },
				_ctx,
			);
			expect(post).toBeNull();
		});
	});

	describe("filtering", () => {
		it("filters by string equality", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { status: "published" } },
				ctx,
			);
			expect(result.docs.length).toBe(3);
			expect(result.totalDocs).toBe(3);
			expect(result.docs.every((p: any) => p.status === "published")).toBe(
				true,
			);
		});

		it("filters by boolean value", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { isFeatured: true } },
				ctx,
			);
			expect(result.docs.length).toBe(2);
			expect(result.docs.every((p: any) => p.isFeatured === true)).toBe(true);
		});

		it("filters by number equality", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { viewCount: 100 } },
				ctx,
			);
			expect(result.docs.length).toBe(1);
			expect(result.docs[0].title).toBe("First Post");
		});

		it("filters by null value", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { publishedAt: null } },
				ctx,
			);
			expect(result.docs.length).toBe(1);
			expect(result.docs[0].status).toBe("draft");
		});

		it("combines multiple filters (AND)", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{
					where: {
						status: "published",
						isFeatured: true,
					},
				},
				ctx,
			);
			expect(result.docs.length).toBe(2);
			expect(
				result.docs.every((p: any) => p.status === "published" && p.isFeatured),
			).toBe(true);
		});
	});

	describe("pagination", () => {
		it("limits results", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find({ limit: 2 }, ctx);
			expect(result.docs.length).toBe(2);
			expect(result.limit).toBe(2);
			expect(result.totalDocs).toBe(5);
			expect(result.totalPages).toBe(3);
		});

		it("offsets results", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const page1 = await cms.api.collections.posts.find(
				{ limit: 2, offset: 0 },
				ctx,
			);
			const page2 = await cms.api.collections.posts.find(
				{ limit: 2, offset: 2 },
				ctx,
			);

			expect(page1.docs.length).toBe(2);
			expect(page2.docs.length).toBe(2);
			expect(page1.docs[0].id).not.toBe(page2.docs[0].id);

			expect(page1.page).toBe(1);
			expect(page2.page).toBe(2);
			expect(page1.hasNextPage).toBe(true);
			expect(page1.nextPage).toBe(2);
		});

		it("handles offset beyond dataset", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ limit: 10, offset: 100 },
				ctx,
			);
			expect(result.docs.length).toBe(0);
			expect(result.page).toBe(11); // offset 100, limit 10 -> page 11
		});

		it("paginates with filter", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{
					where: { status: "published" },
					limit: 2,
					offset: 0,
				},
				ctx,
			);

			expect(result.docs.length).toBe(2);
			expect(result.totalDocs).toBe(3);
			expect(result.totalPages).toBe(2);
			expect(result.docs.every((p: any) => p.status === "published")).toBe(
				true,
			);
		});
	});

	describe("sorting", () => {
		it("sorts by single field ascending", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ orderBy: { viewCount: "asc" } },
				ctx,
			);
			const posts = result.docs;

			expect(posts[0].viewCount).toBeLessThanOrEqual(posts[1].viewCount);
			expect(posts[1].viewCount).toBeLessThanOrEqual(posts[2].viewCount);
		});

		it("sorts by single field descending", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ orderBy: { viewCount: "desc" } },
				ctx,
			);
			const posts = result.docs;

			expect(posts[0].viewCount).toBeGreaterThanOrEqual(posts[1].viewCount);
			expect(posts[0].title).toBe("Popular Post"); // highest view count
		});

		it("sorts by date field", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{
					where: { publishedAt: { not: null } },
					orderBy: { publishedAt: "desc" },
				},
				ctx,
			);
			const posts = result.docs;

			expect(posts[0].title).toBe("Popular Post"); // 2024-01-03
			expect(posts[posts.length - 1].title).toBe("Archived Post"); // 2023-12-15
		});

		it("sorts by text field alphabetically", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ orderBy: { title: "asc" } },
				ctx,
			);
			const posts = result.docs;

			const titles = posts.map((p: any) => p.title);
			const sortedTitles = [...titles].sort();
			expect(titles).toEqual(sortedTitles);
		});

		it("combines sorting with filtering and pagination", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{
					where: { status: "published" },
					orderBy: { viewCount: "desc" },
					limit: 2,
				},
				ctx,
			);
			const posts = result.docs;

			expect(posts.length).toBe(2);
			expect(posts[0].title).toBe("Popular Post"); // 500 views
			expect(posts[1].title).toBe("First Post"); // 100 views
		});
	});

	describe("counting", () => {
		it("counts all records", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const count = await cms.api.collections.posts.count({}, ctx);
			expect(count).toBe(5);
		});

		it("counts with filter", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const count = await cms.api.collections.posts.count(
				{ where: { status: "published" } },
				ctx,
			);
			expect(count).toBe(3);
		});

		it("counts featured posts", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const count = await cms.api.collections.posts.count(
				{ where: { isFeatured: true } },
				ctx,
			);
			expect(count).toBe(2);
		});

		it("returns zero for no matches", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const count = await cms.api.collections.posts.count(
				{ where: { status: "nonexistent" } },
				ctx,
			);
			expect(count).toBe(0);
		});
	});

	describe("soft delete filtering", () => {
		it("excludes soft-deleted posts by default", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			// Soft delete a post
			await cms.api.collections.posts.deleteById({ id: testPosts[0].id }, ctx);

			const result = await cms.api.collections.posts.find({}, ctx);
			const posts = result.docs;
			expect(posts.length).toBe(4);
			expect(posts.find((p: any) => p.id === testPosts[0].id)).toBeUndefined();
		});

		it("counts exclude soft-deleted posts", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			// Soft delete a post
			await cms.api.collections.posts.deleteById({ id: testPosts[0].id }, ctx);

			const count = await cms.api.collections.posts.count({}, ctx);
			expect(count).toBe(4);
		});

		it("finds soft-deleted post by ID returns null", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			await cms.api.collections.posts.deleteById({ id: testPosts[0].id }, ctx);

			const post = await cms.api.collections.posts.findOne(
				{ where: { id: testPosts[0].id } },
				ctx,
			);
			expect(post).toBeNull();
		});

		it("includeDeleted returns soft-deleted posts", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			await cms.api.collections.posts.deleteById({ id: testPosts[0].id }, ctx);

			const result = await cms.api.collections.posts.find(
				{ includeDeleted: true },
				ctx,
			);
			const posts = result.docs;
			expect(posts.length).toBe(5);
			expect(posts.find((p: any) => p.id === testPosts[0].id)).toBeDefined();

			const count = await cms.api.collections.posts.count(
				{ includeDeleted: true },
				ctx,
			);
			expect(count).toBe(5);
		});

		it("restores soft-deleted post", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			await cms.api.collections.posts.deleteById({ id: testPosts[0].id }, ctx);

			const restored = await cms.api.collections.posts.restoreById(
				{ id: testPosts[0].id },
				ctx,
			);
			expect(restored.id).toBe(testPosts[0].id);

			const post = await cms.api.collections.posts.findOne(
				{ where: { id: testPosts[0].id } },
				ctx,
			);
			expect(post).not.toBeNull();
		});
	});

	describe("field selection", () => {
		it("selects specific fields only", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{
					select: { id: true, title: true },
				},
				ctx,
			);
			const posts = result.docs;

			expect(posts[0]).toHaveProperty("id");
			expect(posts[0]).toHaveProperty("title");
			expect(posts[0]).not.toHaveProperty("viewCount");
		});

		it("selects all fields with select: true shorthand", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ select: true },
				ctx,
			);
			const posts = result.docs;

			expect(posts[0]).toHaveProperty("id");
			expect(posts[0]).toHaveProperty("title");
			expect(posts[0]).toHaveProperty("viewCount");
			expect(posts[0]).toHaveProperty("status");
		});
	});

	describe("complex queries", () => {
		it("finds posts with multiple conditions, sorting, and pagination", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{
					where: {
						status: "published",
						viewCount: { gte: 50 },
					},
					orderBy: { publishedAt: "desc" },
					limit: 2,
					offset: 0,
				},
				ctx,
			);
			const posts = result.docs;

			expect(posts.length).toBe(2);
			expect(posts.every((p: any) => p.status === "published")).toBe(true);
			expect(posts.every((p: any) => p.viewCount >= 50)).toBe(true);
		});

		it("finds featured posts sorted by popularity", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{
					where: { isFeatured: true },
					orderBy: { viewCount: "desc" },
				},
				ctx,
			);
			const posts = result.docs;

			expect(posts.length).toBe(2);
			expect(posts[0].title).toBe("Popular Post");
			expect(posts[1].title).toBe("First Post");
		});

		it("handles empty result set gracefully", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{
					where: {
						status: "published",
						viewCount: 999999,
					},
				},
				ctx,
			);

			expect(result.docs).toEqual([]);
		});
	});

	describe("comparison operators", () => {
		it("filters with greater than", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { viewCount: { gt: 50 } } },
				ctx,
			);
			const posts = result.docs;

			expect(posts.length).toBe(2); // 100 and 500
			expect(posts.every((p: any) => p.viewCount > 50)).toBe(true);
		});

		it("filters with greater than or equal", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { viewCount: { gte: 50 } } },
				ctx,
			);
			const posts = result.docs;

			expect(posts.length).toBe(3); // 50, 100, 500
			expect(posts.every((p: any) => p.viewCount >= 50)).toBe(true);
		});

		it("filters with less than", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { viewCount: { lt: 50 } } },
				ctx,
			);
			const posts = result.docs;

			expect(posts.length).toBe(2); // 0 and 25
			expect(posts.every((p: any) => p.viewCount < 50)).toBe(true);
		});

		it("filters with less than or equal", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { viewCount: { lte: 50 } } },
				ctx,
			);
			const posts = result.docs;

			expect(posts.length).toBe(3); // 0, 25, 50
			expect(posts.every((p: any) => p.viewCount <= 50)).toBe(true);
		});

		it("filters with not equal", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			const result = await cms.api.collections.posts.find(
				{ where: { status: { not: "draft" } } },
				ctx,
			);
			const posts = result.docs;

			expect(posts.length).toBe(4);
			expect(posts.every((p: any) => p.status !== "draft")).toBe(true);
		});
	});

	describe("batch operations", () => {
		it("updates multiple records matching filter", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			await cms.api.collections.posts.update(
				{
					where: { status: "published" },
					data: { isFeatured: true },
				},
				ctx,
			);

			const result = await cms.api.collections.posts.find(
				{ where: { status: "published" } },
				ctx,
			);
			const posts = result.docs;
			expect(posts.every((p: any) => p.isFeatured === true)).toBe(true);
		});

		it("deletes multiple records matching filter", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.posts directly

			await cms.api.collections.posts.delete(
				{ where: { status: "draft" } },
				ctx,
			);

			const result = await cms.api.collections.posts.find({}, ctx);
			const remaining = result.docs;
			expect(remaining.every((p: any) => p.status !== "draft")).toBe(true);
		});
	});
});
