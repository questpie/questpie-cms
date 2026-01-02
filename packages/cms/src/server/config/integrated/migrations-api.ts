import {
	type GenerateMigrationOptions,
	type GenerateMigrationResult,
	DrizzleMigrationGenerator,
	type RunMigrationsOptions,
	MigrationRunner,
	type MigrationStatus,
	type QCMS,
	type CMSConfig,
} from "#questpie/cms/exports/server.js";
import { toCamelCase } from "drizzle-orm/casing";

/**
 * Programmatic migration API
 *
 * Provides access to migration operations for use in tests and scripts
 *
 * @example
 * ```ts
 * // Generate a new migration
 * await cms.migrations.generate({ name: "add_users_table" })
 *
 * // Run all pending migrations
 * await cms.migrations.up()
 *
 * // Rollback last batch
 * await cms.migrations.down()
 *
 * // Get status
 * const status = await cms.migrations.status()
 * ```
 */
export class QCMSMigrationsAPI<TConfig extends CMSConfig = CMSConfig> {
	private readonly runner: MigrationRunner;

	constructor(private readonly cms: QCMS<TConfig>) {
		this.runner = new MigrationRunner(this.cms.db);
	}

	/**
	 * Generate a new migration
	 */
	async generate(
		options: GenerateMigrationOptions = {},
	): Promise<GenerateMigrationResult> {
		const generator = new DrizzleMigrationGenerator();
		const migrationDir =
			this.cms.config.migrations?.directory || "./migrations";

		// Generate timestamp and name (YYYYMMDDHHmmss format - 14 digits)
		const timestamp = new Date()
			.toISOString()
			.replace(/[-:T]/g, "")
			.replace(/\..+/, "")
			.slice(0, 14);

		const randomName = options.name || this.generateRandomMigrationName();
		const fileBaseName = `${timestamp}_${randomName}`;
		const camelCaseName = toCamelCase(randomName);
		const migrationVariableName = `${camelCaseName}${timestamp}`;

		return generator.generateMigration({
			migrationName: migrationVariableName,
			fileBaseName,
			schema: this.cms.getSchema(),
			migrationDir,
		});
	}

	/**
	 * Run pending migrations
	 */
	async up(options: RunMigrationsOptions = {}): Promise<void> {
		const migrations = this.cms.config.migrations?.migrations || [];
		await this.runner.runMigrationsUp(migrations, options);
	}

	/**
	 * Rollback last batch of migrations
	 */
	async down(): Promise<void> {
		const migrations = this.cms.config.migrations?.migrations || [];
		await this.runner.rollbackLastBatch(migrations);
	}

	/**
	 * Rollback to a specific migration
	 */
	async downTo(migrationId: string): Promise<void> {
		const migrations = this.cms.config.migrations?.migrations || [];
		await this.runner.rollbackToMigration(migrations, migrationId);
	}

	/**
	 * Reset all migrations (rollback everything)
	 */
	async reset(): Promise<void> {
		const migrations = this.cms.config.migrations?.migrations || [];
		await this.runner.reset(migrations);
	}

	/**
	 * Fresh migrations (reset + run all)
	 */
	async fresh(): Promise<void> {
		const migrations = this.cms.config.migrations?.migrations || [];
		await this.runner.fresh(migrations);
	}

	/**
	 * Get migration status
	 */
	async status(): Promise<MigrationStatus> {
		const migrations = this.cms.config.migrations?.migrations || [];
		return this.runner.status(migrations);
	}

	private generateRandomMigrationName(): string {
		const adjectives = [
			"happy",
			"bright",
			"swift",
			"bold",
			"calm",
			"eager",
			"fancy",
			"gentle",
			"jolly",
			"kind",
			"lucky",
			"merry",
			"nice",
			"proud",
			"quick",
		];
		const colors = [
			"red",
			"blue",
			"green",
			"yellow",
			"purple",
			"orange",
			"pink",
			"crimson",
			"azure",
			"emerald",
			"amber",
			"violet",
			"indigo",
			"scarlet",
			"teal",
		];
		const animals = [
			"zebra",
			"panda",
			"tiger",
			"eagle",
			"dolphin",
			"falcon",
			"phoenix",
			"dragon",
			"griffin",
			"unicorn",
			"lion",
			"wolf",
			"otter",
			"koala",
			"lemur",
		];

		const randomItem = (arr: string[]) =>
			arr[Math.floor(Math.random() * arr.length)]!;

		return `${randomItem(adjectives)}_${randomItem(colors)}_${randomItem(animals)}`;
	}
}
