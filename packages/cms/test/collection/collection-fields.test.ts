import { describe, it, beforeEach, afterEach, expect } from "bun:test";
import {
	varchar,
	text,
	jsonb,
	boolean,
	integer,
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

describe("collection field types", () => {
	let db: any;
	let client: any;
	let cms: any;

	beforeEach(async () => {
		const content = defineCollection("content")
			.fields({
				title: varchar("title", { length: 255 }).notNull(),
				description: text("description"),
				richContent: jsonb("rich_content"),
				isPublished: boolean("is_published").default(false),
				viewCount: integer("view_count").default(0),
				publishedAt: timestamp("published_at", { mode: "date" }),
			})
			.options({
				timestamps: true,
			})
			.build();

		const setup = await createTestDb();
		db = setup.db;
		client = setup.client;
		cms = createTestCms([content], db);
		await runTestDbMigrations(cms);
	});

	afterEach(async () => {
		await closeTestDb(client);
	});

	describe("text field (varchar 255)", () => {
		it("stores and retrieves short text", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Short Title",
				},
				ctx,
			);

			expect(created.title).toBe("Short Title");

			const found = await cms.api.collections.content.findFirst(
				{ where: { id: created.id } },
				ctx,
			);
			expect(found?.title).toBe("Short Title");
		});

		it("enforces not null constraint", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			await expect(
				cms.api.collections.content.create(
					{
						id: crypto.randomUUID(),
						// title missing
					},
					ctx,
				),
			).rejects.toThrow();
		});

		it("handles empty string", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "",
				},
				ctx,
			);

			expect(created.title).toBe("");
		});
	});

	describe("textarea field (text)", () => {
		it("stores and retrieves long text", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const longText = "A".repeat(1000);

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					description: longText,
				},
				ctx,
			);

			expect(created.description).toBe(longText);
		});

		it("handles null values", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					description: null,
				},
				ctx,
			);

			expect(created.description).toBeNull();
		});

		it("handles multiline text", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const multiline = "Line 1\nLine 2\nLine 3";

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					description: multiline,
				},
				ctx,
			);

			expect(created.description).toBe(multiline);
		});
	});

	describe("richText field (JSON)", () => {
		it("stores and retrieves rich text JSON", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const richContent = {
				type: "doc",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: "Hello World" }],
					},
				],
			};

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					richContent,
				},
				ctx,
			);

			expect(created.richContent).toEqual(richContent);
		});

		it("handles null rich text", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					richContent: null,
				},
				ctx,
			);

			expect(created.richContent).toBeNull();
		});

		it("preserves complex nested structures", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const complex = {
				blocks: [
					{ type: "heading", level: 1, text: "Title" },
					{ type: "paragraph", text: "Content" },
					{
						type: "list",
						items: ["Item 1", "Item 2"],
					},
				],
				metadata: { version: 1 },
			};

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					richContent: complex,
				},
				ctx,
			);

			expect(created.richContent).toEqual(complex);
		});
	});

	describe("checkbox field (boolean)", () => {
		it("stores and retrieves boolean true", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					isPublished: true,
				},
				ctx,
			);

			expect(created.isPublished).toBe(true);
		});

		it("stores and retrieves boolean false", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					isPublished: false,
				},
				ctx,
			);

			expect(created.isPublished).toBe(false);
		});

		it("uses default value when not provided", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
				},
				ctx,
			);

			expect(created.isPublished).toBe(false);
		});
	});

	describe("number field (integer)", () => {
		it("stores and retrieves integers", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					viewCount: 42,
				},
				ctx,
			);

			expect(created.viewCount).toBe(42);
		});

		it("handles zero", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					viewCount: 0,
				},
				ctx,
			);

			expect(created.viewCount).toBe(0);
		});

		it("handles negative numbers", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					viewCount: -5,
				},
				ctx,
			);

			expect(created.viewCount).toBe(-5);
		});

		it("uses default value", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
				},
				ctx,
			);

			expect(created.viewCount).toBe(0);
		});
	});

	describe("timestamp field", () => {
		it("stores and retrieves dates", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const now = new Date();

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					publishedAt: now,
				},
				ctx,
			);

			expect(created.publishedAt).toBeInstanceOf(Date);
			expect(created.publishedAt.getTime()).toBeCloseTo(now.getTime(), -3);
		});

		it("handles null timestamps", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					publishedAt: null,
				},
				ctx,
			);

			expect(created.publishedAt).toBeNull();
		});

		it("handles ISO string dates", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const isoDate = "2024-01-01T12:00:00Z";

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					publishedAt: new Date(isoDate),
				},
				ctx,
			);

			expect(created.publishedAt).toBeInstanceOf(Date);
		});
	});

	describe("field updates", () => {
		it("updates single field", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Original Title",
					viewCount: 0,
				},
				ctx,
			);

			await cms.api.collections.content.update(
				{
					id: created.id,
					data: { viewCount: 100 },
				},
				ctx,
			);

			const updated = await cms.api.collections.content.findFirst(
				{ where: { id: created.id } },
				ctx,
			);
			expect(updated?.viewCount).toBe(100);
			expect(updated?.title).toBe("Original Title"); // unchanged
		});

		it("updates multiple fields", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Original",
					isPublished: false,
					viewCount: 0,
				},
				ctx,
			);

			await cms.api.collections.content.update(
				{
					id: created.id,
					data: {
						title: "Updated",
						isPublished: true,
						viewCount: 50,
					},
				},
				ctx,
			);

			const updated = await cms.api.collections.content.findFirst(
				{ where: { id: created.id } },
				ctx,
			);
			expect(updated?.title).toBe("Updated");
			expect(updated?.isPublished).toBe(true);
			expect(updated?.viewCount).toBe(50);
		});

		it("clears optional field with null", async () => {
			const ctx = createTestContext();
			// Use cms.api.collections.content directly

			const created = await cms.api.collections.content.create(
				{
					id: crypto.randomUUID(),
					title: "Test",
					description: "Initial description",
				},
				ctx,
			);

			await cms.api.collections.content.update(
				{
					id: created.id,
					data: { description: null },
				},
				ctx,
			);

			const updated = await cms.api.collections.content.findFirst(
				{ where: { id: created.id } },
				ctx,
			);
			expect(updated?.description).toBeNull();
		});
	});
});
