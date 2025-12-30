import { describe, it, beforeEach, afterEach, expect } from "bun:test";
import { text, uuid, varchar } from "drizzle-orm/pg-core";
import {
	closeTestDb,
	createTestDb,
	runTestDbMigrations,
} from "../utils/test-db";
import { createTestCms } from "../utils/test-cms";
import { createTestContext } from "../utils/test-context";
import { defineCollection, defineGlobal } from "#questpie/cms/server/index.js";

const posts = defineCollection("posts")
	.fields({
		title: text("title").notNull(),
	})
	.options({
		versioning: true,
	})
	.build();

const siteConfig = defineGlobal("site_config")
	.fields({
		siteName: varchar("site_name", { length: 100 }).notNull(),
		featuredPostId: uuid("featured_post_id"),
	})
	.relations(({ table, one }) => ({
		featuredPost: one("posts", {
			fields: [table.featuredPostId],
			references: ["id"],
		}),
	}))
	.options({
		versioning: {
			enabled: true,
			maxVersions: 2,
		},
	})
	.build();

const localizedConfig = defineGlobal("localized_config")
	.fields({
		title: text("title"),
	})
	.localized(["title"] as const)
	.build();

const autoConfig = defineGlobal("auto_config")
	.fields({
		mode: varchar("mode", { length: 20 }).default("auto"),
	})
	.build();

const readOnlyConfig = defineGlobal("read_only_config")
	.fields({
		mode: varchar("mode", { length: 20 }).default("read"),
	})
	.access({
		read: true,
		update: false,
	})
	.build();

describe("global CRUD", () => {
	let db: any;
	let client: any;
	let cms: ReturnType<typeof createTestCms>;

	beforeEach(async () => {
		const setup = await createTestDb();
		db = setup.db;
		client = setup.client;
		cms = createTestCms([posts], db, undefined, {
			globals: [siteConfig, localizedConfig, autoConfig, readOnlyConfig],
		});
		await runTestDbMigrations(cms);
	});

	afterEach(async () => {
		await closeTestDb(client);
	});

	it("supports globals API, versioning, and relations", async () => {
		const ctx = createTestContext({ accessMode: "system" });

		const post = await cms.api.collections.posts.create(
			{
				id: crypto.randomUUID(),
				title: "Hello",
			},
			ctx,
		);

		await cms.api.globals.site_config.update(
			{
				siteName: "One",
				featuredPostId: post.id,
			},
			ctx,
		);
		await cms.api.globals.site_config.update(
			{
				siteName: "Two",
			},
			ctx,
		);
		await cms.api.globals.site_config.update(
			{
				siteName: "Three",
			},
			ctx,
		);

		const versions = await cms.api.globals.site_config.findVersions({}, ctx);
		expect(versions).toHaveLength(2);
		expect(versions[0].siteName).toBe("Two");

		const fetched = await cms.api.globals.site_config.get(
			{ with: { featuredPost: true } },
			ctx,
		);
		expect(fetched?.featuredPost?.title).toBe("Hello");

		await cms.api.globals.site_config.revertToVersion(
			{ version: versions[0].versionNumber },
			ctx,
		);

		const reverted = await cms.api.globals.site_config.get({}, ctx);
		expect(reverted?.siteName).toBe("Two");
	});

	it("reverts global versions by versionId", async () => {
		const ctx = createTestContext({ accessMode: "system" });

		await cms.api.globals.site_config.update(
			{
				siteName: "First",
			},
			ctx,
		);
		await cms.api.globals.site_config.update(
			{
				siteName: "Second",
			},
			ctx,
		);

		const versions = await cms.api.globals.site_config.findVersions({}, ctx);
		await cms.api.globals.site_config.revertToVersion(
			{ versionId: versions[0].versionId },
			ctx,
		);

		const reverted = await cms.api.globals.site_config.get({}, ctx);
		expect(reverted?.siteName).toBe("First");
	});

	it("supports localized globals with fallback", async () => {
		const ctxEn = createTestContext({
			accessMode: "system",
			locale: "en",
			defaultLocale: "en",
		});
		const ctxSk = createTestContext({
			accessMode: "system",
			locale: "sk",
			defaultLocale: "en",
		});
		const ctxFr = createTestContext({
			accessMode: "system",
			locale: "fr",
			defaultLocale: "en",
		});

		await cms.api.globals.localized_config.update(
			{
				title: "Hello",
			},
			ctxEn,
		);
		await cms.api.globals.localized_config.update(
			{
				title: "Ahoj",
			},
			ctxSk,
		);

		const sk = await cms.api.globals.localized_config.get({}, ctxSk);
		expect(sk?.title).toBe("Ahoj");

		const fr = await cms.api.globals.localized_config.get({}, ctxFr);
		expect(fr?.title).toBe("Hello");
	});

	it("auto-creates globals on get", async () => {
		const ctx = createTestContext({ accessMode: "system" });

		const created = await cms.api.globals.auto_config.get({}, ctx);
		expect(created?.mode).toBe("auto");
	});

	it("auto-creates globals without update access", async () => {
		const ctx = createTestContext({ accessMode: "user" });

		const created = await cms.api.globals.read_only_config.get({}, ctx);
		expect(created?.mode).toBe("read");
	});
});
