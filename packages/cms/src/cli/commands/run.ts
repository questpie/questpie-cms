import { existsSync } from "node:fs";
import { join } from "node:path";
import { MigrationRunner } from "../../server/migration/runner";
import type { Migration } from "../../server/migration/types";

export type RunMigrationAction =
	| "up"
	| "down"
	| "status"
	| "reset"
	| "fresh";

export type RunMigrationOptions = {
	action: RunMigrationAction;
	configPath: string;
	targetMigration?: string;
	batch?: number;
	dryRun?: boolean;
};

/**
 * Run migrations (up, down, status, reset, fresh)
 *
 * This command:
 * 1. Loads the CMS config
 * 2. Loads all migration files from migrations/
 * 3. Executes the requested action using MigrationRunner
 */
export async function runMigrationCommand(
	options: RunMigrationOptions,
): Promise<void> {
	// Resolve config path
	const resolvedConfigPath = join(process.cwd(), options.configPath);

	if (!existsSync(resolvedConfigPath)) {
		throw new Error(`Config file not found: ${resolvedConfigPath}`);
	}

	// Import the CMS config
	const configModule = await import(resolvedConfigPath);
	const config = configModule.default || configModule;

	// Check if config has a CMS instance getter or needs instantiation
	let qcms: any;
	if (typeof config === "function") {
		qcms = await config();
	} else if (config.qcms) {
		qcms = config.qcms;
	} else {
		throw new Error(
			"Config must export a QCMS instance or a function that returns one",
		);
	}

	// Get migration directory from config or use default
	const migrationDir =
		qcms.config.migrations?.directory || join(process.cwd(), "migrations");

	// Check if migrations directory exists
	if (!existsSync(migrationDir)) {
		throw new Error(
			`Migrations directory not found: ${migrationDir}\nRun 'bun qcms migrate:generate' to create your first migration.`,
		);
	}

	// Load migrations from migrations/index.ts
	const migrationsIndexPath = join(migrationDir, "index.ts");

	if (!existsSync(migrationsIndexPath)) {
		throw new Error(
			`Migrations index not found: ${migrationsIndexPath}\nRun 'bun qcms migrate:generate' to create your first migration.`,
		);
	}

	const migrationsModule = await import(migrationsIndexPath);
	const migrations: Migration[] = migrationsModule.migrations || [];

	if (migrations.length === 0) {
		console.log("ℹ️  No migrations found");
		return;
	}

	// Merge with manually defined migrations from config
	const configMigrations = qcms.config.migrations?.migrations || [];
	const allMigrations = [...migrations, ...configMigrations];

	console.log(`📦 Found ${allMigrations.length} migrations\n`);

	if (options.dryRun) {
		console.log("🔍 DRY RUN - Would execute the following migration operation:");
		console.log(`Action: ${options.action}`);
		if (options.targetMigration)
			console.log(`Target migration: ${options.targetMigration}`);
		if (options.batch) console.log(`Target batch: ${options.batch}`);
		console.log("");
		return;
	}

	// Create migration runner
	const runner = new MigrationRunner(qcms.db.drizzle as any);

	// Execute the requested action
	switch (options.action) {
		case "up":
			await runner.runMigrationsUp(allMigrations, {
				targetMigration: options.targetMigration,
			});
			break;

		case "down":
			if (options.batch !== undefined) {
				await runner.rollbackBatch(allMigrations, options.batch);
			} else if (options.targetMigration) {
				await runner.rollbackToMigration(
					allMigrations,
					options.targetMigration,
				);
			} else {
				await runner.rollbackLastBatch(allMigrations);
			}
			break;

		case "reset":
			await runner.reset(allMigrations);
			break;

		case "fresh":
			await runner.fresh(allMigrations);
			break;

		case "status":
			await runner.status(allMigrations);
			break;

		default:
			throw new Error(`Unknown action: ${options.action}`);
	}
}
