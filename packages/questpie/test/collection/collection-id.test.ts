import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { integer, serial, text, uuid, varchar } from "drizzle-orm/pg-core";
import { collection, questpie } from "../../src/server/index.js";
import { buildMockApp } from "../utils/mocks/mock-app-builder";
import { createTestContext } from "../utils/test-context";
import { runTestDbMigrations } from "../utils/test-db";

describe("collection ID field flexibility", () => {
	describe("default ID (no user-defined id)", () => {
		const testModule = questpie({ name: "test-default-id" }).collections({
			posts: collection("posts").fields({
				title: text("title").notNull(),
			}),
		});

		let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModule>>>;

		beforeEach(async () => {
			setup = await buildMockApp(testModule);
			await runTestDbMigrations(setup.cms);
		});

		afterEach(async () => {
			await setup.cleanup();
		});

		it("generates text ID with gen_random_uuid() default", async () => {
			const ctx = createTestContext();

			// Create without providing ID - should auto-generate
			const created = await setup.cms.api.collections.posts.create(
				{ title: "Test Post" },
				ctx,
			);

			expect(created.id).toBeDefined();
			expect(typeof created.id).toBe("string");
			// UUID format check
			expect(created.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});

		it("allows providing custom ID", async () => {
			const ctx = createTestContext();
			const customId = crypto.randomUUID();

			const created = await setup.cms.api.collections.posts.create(
				{ id: customId, title: "Test Post" },
				ctx,
			);

			expect(created.id).toBe(customId);
		});
	});

	describe("user-defined text ID", () => {
		const testModule = questpie({ name: "test-text-id" }).collections({
			posts: collection("posts").fields({
				id: text("id").primaryKey().default(sql`gen_random_uuid()`),
				title: text("title").notNull(),
			}),
		});

		let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModule>>>;

		beforeEach(async () => {
			setup = await buildMockApp(testModule);
			await runTestDbMigrations(setup.cms);
		});

		afterEach(async () => {
			await setup.cleanup();
		});

		it("uses text ID column", async () => {
			const ctx = createTestContext();

			const created = await setup.cms.api.collections.posts.create(
				{ title: "Test Post" },
				ctx,
			);

			expect(created.id).toBeDefined();
			expect(typeof created.id).toBe("string");
		});

		it("allows custom string ID", async () => {
			const ctx = createTestContext();
			const customId = "my-custom-id-123";

			const created = await setup.cms.api.collections.posts.create(
				{ id: customId, title: "Test Post" },
				ctx,
			);

			expect(created.id).toBe(customId);
		});
	});

	describe("user-defined uuid ID", () => {
		const testModule = questpie({ name: "test-uuid-id" }).collections({
			posts: collection("posts").fields({
				id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
				title: text("title").notNull(),
			}),
		});

		let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModule>>>;

		beforeEach(async () => {
			setup = await buildMockApp(testModule);
			await runTestDbMigrations(setup.cms);
		});

		afterEach(async () => {
			await setup.cleanup();
		});

		it("uses uuid ID column", async () => {
			const ctx = createTestContext();

			const created = await setup.cms.api.collections.posts.create(
				{ title: "Test Post" },
				ctx,
			);

			expect(created.id).toBeDefined();
			expect(typeof created.id).toBe("string");
			expect(created.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
			);
		});
	});

	describe("user-defined varchar ID", () => {
		const testModule = questpie({ name: "test-varchar-id" }).collections({
			posts: collection("posts").fields({
				id: varchar("id", { length: 50 })
					.primaryKey()
					.default(sql`gen_random_uuid()`),
				title: text("title").notNull(),
			}),
		});

		let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModule>>>;

		beforeEach(async () => {
			setup = await buildMockApp(testModule);
			await runTestDbMigrations(setup.cms);
		});

		afterEach(async () => {
			await setup.cleanup();
		});

		it("uses varchar ID column", async () => {
			const ctx = createTestContext();

			const created = await setup.cms.api.collections.posts.create(
				{ title: "Test Post" },
				ctx,
			);

			expect(created.id).toBeDefined();
			expect(typeof created.id).toBe("string");
		});

		it("allows custom short ID (like nanoid)", async () => {
			const ctx = createTestContext();
			const customId = "abc123xyz789";

			const created = await setup.cms.api.collections.posts.create(
				{ id: customId, title: "Test Post" },
				ctx,
			);

			expect(created.id).toBe(customId);
		});
	});

	describe("user-defined integer ID", () => {
		const testModule = questpie({ name: "test-int-id" }).collections({
			posts: collection("posts").fields({
				id: integer("id").primaryKey(),
				title: text("title").notNull(),
			}),
		});

		let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModule>>>;

		beforeEach(async () => {
			setup = await buildMockApp(testModule);
			await runTestDbMigrations(setup.cms);
		});

		afterEach(async () => {
			await setup.cleanup();
		});

		it("uses integer ID column", async () => {
			const ctx = createTestContext();

			const created = await setup.cms.api.collections.posts.create(
				{ id: 1, title: "Test Post" } as any,
				ctx,
			);

			expect(created.id).toBe(1 as any);
			expect(typeof created.id).toBe("number");
		});

		it("allows sequential integer IDs", async () => {
			const ctx = createTestContext();

			const post1 = await setup.cms.api.collections.posts.create(
				{ id: 1, title: "Post 1" } as any,
				ctx,
			);
			const post2 = await setup.cms.api.collections.posts.create(
				{ id: 2, title: "Post 2" } as any,
				ctx,
			);

			expect(post1.id).toBe(1 as any);
			expect(post2.id).toBe(2 as any);
		});
	});

	describe("user-defined serial ID (auto-increment)", () => {
		const testModule = questpie({ name: "test-serial-id" }).collections({
			posts: collection("posts").fields({
				id: serial("id").primaryKey(),
				title: text("title").notNull(),
			}),
		});

		let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModule>>>;

		beforeEach(async () => {
			setup = await buildMockApp(testModule);
			await runTestDbMigrations(setup.cms);
		});

		afterEach(async () => {
			await setup.cleanup();
		});

		it("auto-generates sequential integer IDs", async () => {
			const ctx = createTestContext();

			const post1 = await setup.cms.api.collections.posts.create(
				{ title: "Post 1" },
				ctx,
			);
			const post2 = await setup.cms.api.collections.posts.create(
				{ title: "Post 2" },
				ctx,
			);

			expect(typeof post1.id).toBe("number");
			expect(typeof post2.id).toBe("number");
			expect(post2.id).toBeGreaterThan(post1.id);
		});
	});

	describe("i18n table parentId type inference", () => {
		const testModuleText = questpie({ name: "test-i18n-text" }).collections({
			posts: collection("posts")
				.fields({
					id: text("id").primaryKey().default(sql`gen_random_uuid()`),
					title: text("title").notNull(),
				})
				.localized(["title"] as const),
		});

		const testModuleInt = questpie({ name: "test-i18n-int" }).collections({
			posts: collection("posts")
				.fields({
					id: serial("id").primaryKey(),
					title: text("title").notNull(),
				})
				.localized(["title"] as const),
		});

		describe("with text ID", () => {
			let setup: Awaited<
				ReturnType<typeof buildMockApp<typeof testModuleText>>
			>;

			beforeEach(async () => {
				setup = await buildMockApp(testModuleText);
				await runTestDbMigrations(setup.cms);
			});

			afterEach(async () => {
				await setup.cleanup();
			});

			it("i18n table parentId matches text type", async () => {
				const ctx = createTestContext();

				const created = await setup.cms.api.collections.posts.create(
					{ title: "English Title" },
					ctx,
				);

				// Update with different locale
				await setup.cms.api.collections.posts.updateById(
					{ id: created.id, data: { title: "Slovenský Názov" } },
					createTestContext({ locale: "sk" }),
				);

				// Verify both locales work
				const en = await setup.cms.api.collections.posts.findOne(
					{ where: { id: created.id } },
					createTestContext({ locale: "en" }),
				);
				const sk = await setup.cms.api.collections.posts.findOne(
					{ where: { id: created.id } },
					createTestContext({ locale: "sk" }),
				);

				expect(en?.title).toBe("English Title");
				expect(sk?.title).toBe("Slovenský Názov");
			});
		});

		describe("with serial/integer ID", () => {
			let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModuleInt>>>;

			beforeEach(async () => {
				setup = await buildMockApp(testModuleInt);
				await runTestDbMigrations(setup.cms);
			});

			afterEach(async () => {
				await setup.cleanup();
			});

			it("i18n table parentId matches integer type", async () => {
				const ctx = createTestContext();

				const created = await setup.cms.api.collections.posts.create(
					{ title: "English Title" },
					ctx,
				);

				expect(typeof created.id).toBe("number");

				// Update with different locale
				await setup.cms.api.collections.posts.updateById(
					{ id: created.id, data: { title: "Slovenský Názov" } },
					createTestContext({ locale: "sk" }),
				);

				// Verify both locales work
				const en = await setup.cms.api.collections.posts.findOne(
					{ where: { id: created.id } },
					createTestContext({ locale: "en" }),
				);
				const sk = await setup.cms.api.collections.posts.findOne(
					{ where: { id: created.id } },
					createTestContext({ locale: "sk" }),
				);

				expect(en?.title).toBe("English Title");
				expect(sk?.title).toBe("Slovenský Názov");
			});
		});
	});

	describe("versions table ID type inference", () => {
		const testModuleText = questpie({
			name: "test-versions-text",
		}).collections({
			posts: collection("posts")
				.fields({
					id: text("id").primaryKey().default(sql`gen_random_uuid()`),
					title: text("title").notNull(),
				})
				.options({ versioning: true }),
		});

		const testModuleInt = questpie({ name: "test-versions-int" }).collections({
			posts: collection("posts")
				.fields({
					id: serial("id").primaryKey(),
					title: text("title").notNull(),
				})
				.options({ versioning: true }),
		});

		describe("with text ID", () => {
			let setup: Awaited<
				ReturnType<typeof buildMockApp<typeof testModuleText>>
			>;

			beforeEach(async () => {
				setup = await buildMockApp(testModuleText);
				await runTestDbMigrations(setup.cms);
			});

			afterEach(async () => {
				await setup.cleanup();
			});

			it("versions table uses matching ID type", async () => {
				const ctx = createTestContext();

				const created = await setup.cms.api.collections.posts.create(
					{ title: "Original" },
					ctx,
				);

				await setup.cms.api.collections.posts.updateById(
					{ id: created.id, data: { title: "Updated" } },
					ctx,
				);

				const versions = await setup.cms.api.collections.posts.findVersions(
					{ id: created.id },
					ctx,
				);

				expect(versions.length).toBe(2);
				expect(versions[0].id).toBe(created.id);
				expect(typeof versions[0].id).toBe("string");
			});
		});

		describe("with serial/integer ID", () => {
			let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModuleInt>>>;

			beforeEach(async () => {
				setup = await buildMockApp(testModuleInt);
				await runTestDbMigrations(setup.cms);
			});

			afterEach(async () => {
				await setup.cleanup();
			});

			it("versions table uses matching integer ID type", async () => {
				const ctx = createTestContext();

				const created = await setup.cms.api.collections.posts.create(
					{ title: "Original" },
					ctx,
				);

				expect(typeof created.id).toBe("number");

				await setup.cms.api.collections.posts.updateById(
					{ id: created.id, data: { title: "Updated" } },
					ctx,
				);

				const versions = await setup.cms.api.collections.posts.findVersions(
					{ id: created.id },
					ctx,
				);

				expect(versions.length).toBe(2);
				expect(versions[0].id).toBe(created.id);
				expect(typeof versions[0].id).toBe("number");
			});
		});
	});

	describe("combined i18n + versioning with custom ID", () => {
		const testModule = questpie({ name: "test-combined" }).collections({
			posts: collection("posts")
				.fields({
					id: serial("id").primaryKey(),
					sku: varchar("sku", { length: 50 }).notNull(),
					title: text("title").notNull(),
				})
				.localized(["title"] as const)
				.options({ versioning: true }),
		});

		let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModule>>>;

		beforeEach(async () => {
			setup = await buildMockApp(testModule);
			await runTestDbMigrations(setup.cms);
		});

		afterEach(async () => {
			await setup.cleanup();
		});

		it("works with integer ID, i18n, and versioning together", async () => {
			const ctx = createTestContext();

			// Create
			const created = await setup.cms.api.collections.posts.create(
				{ sku: "SKU-001", title: "English Title" },
				ctx,
			);

			expect(typeof created.id).toBe("number");

			// Add locale
			await setup.cms.api.collections.posts.updateById(
				{ id: created.id, data: { title: "Slovenský Názov" } },
				createTestContext({ locale: "sk" }),
			);

			// Update creates version
			await setup.cms.api.collections.posts.updateById(
				{ id: created.id, data: { sku: "SKU-002" } },
				ctx,
			);

			// Verify i18n works
			const en = await setup.cms.api.collections.posts.findOne(
				{ where: { id: created.id } },
				createTestContext({ locale: "en" }),
			);
			const sk = await setup.cms.api.collections.posts.findOne(
				{ where: { id: created.id } },
				createTestContext({ locale: "sk" }),
			);

			expect(en?.title).toBe("English Title");
			expect(sk?.title).toBe("Slovenský Názov");

			// Verify versions work
			const versions = await setup.cms.api.collections.posts.findVersions(
				{ id: created.id },
				ctx,
			);

			expect(versions.length).toBeGreaterThanOrEqual(2);
			expect(typeof versions[0].id).toBe("number");
		});
	});
});
