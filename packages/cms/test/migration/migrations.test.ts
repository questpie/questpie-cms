import type { Migration } from "#questpie/cms/server/migration/types";
import type { PGlite } from "@electric-sql/pglite";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { sql } from "drizzle-orm";
import { boolean, integer, text, varchar } from "drizzle-orm/pg-core";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createTestDb, testMigrationDir } from "../utils/test-db";
import { defineCollection, defineQCMS } from "#questpie/cms/server/index.js";
import { MockKVAdapter } from "../utils/mocks/kv.adapter";
import { MockLogger } from "../utils/mocks/logger.adapter";
import { MockMailAdapter } from "../utils/mocks/mailer.adapter";
import { MockQueueAdapter } from "../utils/mocks/queue.adapter";

describe("Migration System - Programmatic", () => {
	let qcms: any;
	let pgClient: PGlite;

	beforeAll(async () => {
		// Create in-memory PGlite instance
		pgClient = await createTestDb();

		// Define test collections
		const posts = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
			content: text("content"),
			published: boolean("published").default(false),
		});

		// Create CMS instance
		const builder = defineQCMS({ name: "test-cms" }).collections({ posts });

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});
	});

	afterAll(async () => {
		if (pgClient) {
			await pgClient.close();
		}
	});

	test("should run manual migrations up", async () => {
		// Define manual migration
		const createPostsTable: Migration = {
			id: "create_posts_table",
			async up({ db: migDb }) {
				await migDb.execute(
					sql.raw(`
CREATE TABLE posts (
id TEXT PRIMARY KEY,
title VARCHAR(255) NOT NULL,
content TEXT,
published BOOLEAN DEFAULT false
)
`),
				);
			},
			async down({ db: migDb }) {
				await migDb.execute(sql.raw(`DROP TABLE posts`));
			},
		};

		// Add migration to config
		qcms.config.migrations = {
			migrations: [createPostsTable],
		};

		// Run migration
		await qcms.migrations.up();

		// Verify table exists
		const tablesResult = await pgClient.query(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'posts'
`);

		expect(tablesResult.rows.length).toBe(1);

		// Verify migration was recorded
		const migrationsResult = await pgClient.query(
			"SELECT * FROM questpie_migrations WHERE id = 'create_posts_table'",
		);
		expect(migrationsResult.rows.length).toBe(1);
	});

	test("should show migration status", async () => {
		const status = await qcms.migrations.status();

		expect(status.executed.length).toBe(1);
		expect(status.executed[0]?.id).toBe("create_posts_table");
		expect(status.pending.length).toBe(0);
		expect(status.currentBatch).toBe(1);
	});

	test("should rollback last batch", async () => {
		await qcms.migrations.down();

		// Verify table was dropped
		const tablesResult = await pgClient.query(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'posts'
`);

		expect(tablesResult.rows.length).toBe(0);

		// Verify migration was removed from history
		const status = await qcms.migrations.status();
		expect(status.executed.length).toBe(0);
		expect(status.pending.length).toBe(1);
	});

	test("should run migrations fresh (reset + up)", async () => {
		await qcms.migrations.fresh();

		// Verify table exists again
		const tablesResult = await pgClient.query(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'posts'
`);

		expect(tablesResult.rows.length).toBe(1);

		const status = await qcms.migrations.status();
		expect(status.executed.length).toBe(1);
		expect(status.currentBatch).toBe(1);
	});

	test("should handle multiple migrations in batches", async () => {
		// Add second migration
		const createCommentsTable: Migration = {
			id: "create_comments_table",
			async up({ db: migDb }) {
				await migDb.execute(
					sql.raw(`
CREATE TABLE comments (
id TEXT PRIMARY KEY,
post_id TEXT NOT NULL,
author VARCHAR(255) NOT NULL,
content TEXT NOT NULL
)
`),
				);
			},
			async down({ db: migDb }) {
				await migDb.execute(sql.raw(`DROP TABLE comments`));
			},
		};

		qcms.config.migrations?.migrations?.push(createCommentsTable);

		// Run new migration
		await qcms.migrations.up();

		// Both tables should exist
		const tablesResult = await pgClient.query(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('posts', 'comments')
ORDER BY table_name
`);

		expect(tablesResult.rows.length).toBe(2);

		const status = await qcms.migrations.status();
		expect(status.executed.length).toBe(2);
		expect(status.currentBatch).toBe(2); // Second batch
	});

	test("should rollback specific batch", async () => {
		// Rollback only batch 2 (comments table)
		await qcms.migrations.down();

		// Posts should still exist, comments should be gone
		const tablesResult = await pgClient.query(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('posts', 'comments')
ORDER BY table_name
`);

		expect(tablesResult.rows.length).toBe(1);
		expect((tablesResult.rows[0] as any)?.table_name).toBe("posts");

		const status = await qcms.migrations.status();
		expect(status.executed.length).toBe(1);
		expect(status.currentBatch).toBe(1);
	});

	test("should reset all migrations", async () => {
		await qcms.migrations.reset();

		// No tables should exist
		const tablesResult = await pgClient.query(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('posts', 'comments')
`);

		expect(tablesResult.rows.length).toBe(0);

		const status = await qcms.migrations.status();
		expect(status.executed.length).toBe(0);
		expect(status.pending.length).toBe(2);
	});
});

describe("Migration System - Generation", () => {
	let qcms: any;
	let pgClient: PGlite;

	beforeAll(async () => {
		// Create in-memory PGlite instance with UUID v7 extension
		pgClient = await createTestDb();
	});

	beforeEach(() => {
		// Clean up test migration directory before each test
		if (existsSync(testMigrationDir)) {
			rmSync(testMigrationDir, { recursive: true });
		}
		mkdirSync(testMigrationDir, { recursive: true });
	});

	afterAll(async () => {
		if (pgClient) {
			await pgClient.close();
		}
		// Final cleanup
		if (existsSync(testMigrationDir)) {
			rmSync(testMigrationDir, { recursive: true });
		}
	});

	test("should generate migration from collection schema", async () => {
		// Define a simple collection
		const posts = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
			content: text("content"),
			published: boolean("published").default(false),
		});

		// Create CMS instance
		const builder = defineQCMS({ name: "test-cms" }).collections({ posts });

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		// Generate migration
		const result = await qcms.migrations.generate({
			name: "create_posts_table",
		});

		// Verify result
		expect(result.skipped).toBe(false);
		expect(result.fileName).toMatch(/^\d{14}_create_posts_table$/);

		// Verify migration file was created
		const migrationFile = join(testMigrationDir, `${result.fileName}.ts`);
		expect(existsSync(migrationFile)).toBe(true);

		// Verify snapshot file was created
		const snapshotFile = join(
			testMigrationDir,
			"snapshots",
			`${result.fileName}.json`,
		);
		expect(existsSync(snapshotFile)).toBe(true);

		// Verify index.ts was created
		const indexFile = join(testMigrationDir, "index.ts");
		expect(existsSync(indexFile)).toBe(true);

		// Read and verify migration file content
		const migrationContent = Bun.file(migrationFile);
		const content = await migrationContent.text();

		expect(content).toContain("import type { Migration }");
		expect(content).toContain("import { sql } from");
		expect(content).toContain("export const");
		expect(content).toContain("async up({ db })");
		expect(content).toContain("async down({ db })");
		expect(content).toContain("CREATE TABLE");
	});

	test("should skip generation if no schema changes", async () => {
		const posts = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
		});

		const builder = defineQCMS({ name: "test-cms" }).collections({ posts });

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		// Generate first migration
		const result1 = await qcms.migrations.generate({
			name: "initial",
		});
		expect(result1.skipped).toBe(false);

		// Try to generate again without changes
		const result2 = await qcms.migrations.generate({
			name: "no_changes",
		});
		expect(result2.skipped).toBe(true);

		// Verify only one migration file exists
		const files = readdirSync(testMigrationDir).filter(
			(f) => f.endsWith(".ts") && f !== "index.ts",
		);
		expect(files.length).toBe(1);
	});

	test("should generate new migration after schema changes", async () => {
		const posts = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
		});

		let builder = defineQCMS({ name: "test-cms" }).collections({ posts });

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		// Generate first migration
		const result1 = await qcms.migrations.generate({
			name: "initial",
		});
		expect(result1.skipped).toBe(false);

		// Modify schema - add new field
		const postsV2 = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
			content: text("content"), // New field
		});

		// Update CMS schema
		builder = defineQCMS({ name: "test-cms" }).collections({
			posts: postsV2,
		}) as any;

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		// Generate second migration
		const result2 = await qcms.migrations.generate({
			name: "add_content_field",
		});
		expect(result2.skipped).toBe(false);

		// Verify two migration files exist
		const files = readdirSync(testMigrationDir).filter(
			(f) => f.endsWith(".ts") && f !== "index.ts",
		);
		expect(files.length).toBe(2);

		// Verify two snapshot files exist
		const snapshots = readdirSync(join(testMigrationDir, "snapshots"));
		expect(snapshots.length).toBe(2);
	});

	test("should generate migration with multiple collections", async () => {
		const posts = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
		});

		const comments = defineCollection("comments").fields({
			postId: varchar("post_id", { length: 255 }).notNull(),
			author: varchar("author", { length: 255 }).notNull(),
		});

		const builder = defineQCMS({ name: "test-cms" }).collections({
			posts,
			comments,
		});

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		const result = await qcms.migrations.generate({
			name: "create_posts_and_comments",
		});

		expect(result.skipped).toBe(false);

		// Read migration content
		const migrationFile = join(testMigrationDir, `${result.fileName}.ts`);
		const content = await Bun.file(migrationFile).text();

		// Should contain both tables
		expect(content).toContain("posts");
		expect(content).toContain("comments");
	});

	test("should handle generated migrations in index.ts", async () => {
		const posts = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
		});

		let builder = defineQCMS({ name: "test-cms" }).collections({ posts });

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		// Generate first migration
		await qcms.migrations.generate({ name: "first" });

		// Modify schema for second migration
		const postsV2 = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
			description: text("description"), // New field
		});

		builder = defineQCMS({ name: "test-cms" }).collections({
			posts: postsV2,
		}) as any;

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		await qcms.migrations.generate({ name: "second" });

		// Read index.ts
		const indexFile = join(testMigrationDir, "index.ts");
		const indexContent = await Bun.file(indexFile).text();

		// Should import both migrations
		expect(indexContent).toContain("import type { Migration }");
		expect(indexContent).toContain("first");
		expect(indexContent).toContain("second");
		expect(indexContent).toContain("export const migrations: Migration[]");
	});

	test("should be able to run generated migrations", async () => {
		const posts = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
			views: integer("views").default(0),
		});

		const builder = defineQCMS({ name: "test-cms" }).collections({ posts });

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		// Generate migration
		const result = await qcms.migrations.generate({
			name: "create_posts",
		});

		expect(result.skipped).toBe(false);

		// Import generated migrations
		const migrationsIndex = await import(
			`${join(testMigrationDir, "index.ts")}?t=${Date.now()}`
		);
		qcms.config.migrations!.migrations = [...migrationsIndex.migrations];

		// Run migrations
		await qcms.migrations.up();

		// Verify table exists
		const tablesResult = await pgClient.query(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'posts'
`);

		expect(tablesResult.rows.length).toBeGreaterThan(0);

		const status = await qcms.migrations.status();
		expect(status.executed.length).toBe(1); // create_posts
		expect(status.currentBatch).toBe(1);
	});

	test("should handle migration rollback after generation", async () => {
		const posts = defineCollection("posts").fields({
			title: varchar("title", { length: 255 }).notNull(),
		});

		const builder = defineQCMS({ name: "test-cms" }).collections({ posts });

		qcms = builder.build({
			app: { url: "http://localhost:3000" },
			db: { pglite: pgClient },
			migrations: {
				directory: testMigrationDir,
			},
			email: { adapter: new MockMailAdapter() },
			queue: { adapter: new MockQueueAdapter() },
			kv: { adapter: new MockKVAdapter() },
			logger: { adapter: new MockLogger() },
		});

		// Generate and run migration
		await qcms.migrations.generate({ name: "create_posts" });

		const migrationsIndex = await import(
			`${join(testMigrationDir, "index.ts")}?t=${Date.now()}`
		);
		qcms.config.migrations!.migrations = [...migrationsIndex.migrations];

		await qcms.migrations.up();

		// Rollback
		await qcms.migrations.down();

		// Verify table was dropped
		const tablesResult = await pgClient.query(`
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'posts'
`);

		expect(tablesResult.rows.length).toBe(0);

		const status = await qcms.migrations.status();
		expect(status.executed.length).toBe(0);
	});
});
