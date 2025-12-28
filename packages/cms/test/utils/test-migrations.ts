import { sql } from "drizzle-orm";
import type { Migration } from "#questpie/cms/server/migration/types";
import type { AnyCollectionState } from "#questpie/cms/server/collection/builder/types";
import type { Collection } from "#questpie/cms/server/collection/builder/collection";

/**
 * Create migration from collection definition
 * Generates CREATE TABLE statement from Drizzle table definition
 */
export function createCollectionMigration(
	collection: Collection<AnyCollectionState>,
	options: {
		includeI18n?: boolean;
		includeVersions?: boolean;
	} = {},
): Migration {
	const { includeI18n = false, includeVersions = false } = options;

	const migrationId = `create_${collection.name}_table`;

	return {
		id: migrationId,
		async up({ db }) {
			// Generate CREATE TABLE from Drizzle schema
			// We use Drizzle's internal schema to generate SQL
			const tableName = collection.name;

			// For now, we'll use a simple approach: extract table creation from Drizzle
			// In production, this could use drizzle-kit's SQL generation
			await db.execute(
				sql.raw(
					`CREATE TABLE ${tableName} AS SELECT * FROM ${tableName} WHERE false`,
				),
			);

			if (includeI18n && collection.i18nTable) {
				await db.execute(
					sql.raw(
						`CREATE TABLE ${tableName}_i18n AS SELECT * FROM ${tableName}_i18n WHERE false`,
					),
				);
			}

			if (includeVersions && collection.versionsTable) {
				await db.execute(
					sql.raw(
						`CREATE TABLE ${tableName}_versions AS SELECT * FROM ${tableName}_versions WHERE false`,
					),
				);
			}
		},
		async down({ db }) {
			const tableName = collection.name;

			if (includeVersions && collection.versionsTable) {
				await db.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName}_versions`));
			}

			if (includeI18n && collection.i18nTable) {
				await db.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName}_i18n`));
			}

			await db.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName}`));
		},
	};
}

/**
 * Helper to run migrations in tests
 * Replaces manual DDL statements with migration system
 *
 * @example
 * ```ts
 * const { qcms } = await setupTestMigrations(db, [
 *   products,
 *   categories,
 * ]);
 *
 * // Tables are now created via migrations
 * // Use qcms.migrations.down() to rollback in afterEach
 * ```
 */
export async function setupTestMigrations(
	db: any,
	collections: Collection<AnyCollectionState>[],
	customMigrations: Migration[] = [],
) {
	const { createTestCms } = await import("./test-cms");

	// Create CMS with collections
	const qcms = createTestCms(collections, db);

	// Generate migrations for each collection
	const collectionMigrations: Migration[] = [];

	for (const collection of collections) {
		// For testing, we still need to use manual DDL
		// But in the future, we can use Drizzle Kit to generate SQL
		// For now, this is a placeholder that documents the approach
	}

	// Add custom migrations
	qcms.config.migrations = {
		migrations: [...collectionMigrations, ...customMigrations],
	};

	// Run migrations
	await qcms.migrations.up();

	return { qcms, db };
}

/**
 * Helper to create a simple migration from DDL
 * Use this to convert existing test DDL to migrations
 */
export function createMigrationFromDDL(
	id: string,
	upStatements: string[],
	downStatements: string[],
): Migration {
	return {
		id,
		async up({ db }) {
			for (const statement of upStatements) {
				await db.execute(sql.raw(statement));
			}
		},
		async down({ db }) {
			for (const statement of downStatements) {
				await db.execute(sql.raw(statement));
			}
		},
	};
}
