import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	DrizzleMigrationGenerator,
	type GenerateMigrationOptions,
} from "../../server/migration/generator";

/**
 * Generate a new migration
 *
 * This command:
 * 1. Loads the CMS config
 * 2. Gets the current schema via qcms.getSchema()
 * 3. Compares with previous snapshots
 * 4. Generates migration file + operation snapshot
 */
export async function generateMigrationCommand(
	configPath: string,
	options: GenerateMigrationOptions = {},
): Promise<void> {
	console.log("📝 Generating migration...\n");

	// Resolve config path
	const resolvedConfigPath = join(process.cwd(), configPath);

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

	// Get schema from CMS
	const schema = qcms.getSchema();
	console.log(`📊 Loaded schema with ${Object.keys(schema).length} definitions`);

	// Get migration directory from config or use default
	const migrationDir =
		qcms.config.migrations?.directory || join(process.cwd(), "migrations");

	// Create migration directory if needed
	if (!existsSync(migrationDir)) {
		mkdirSync(migrationDir, { recursive: true });
	}

	// Generate timestamp and name
	const timestamp = new Date()
		.toISOString()
		.replace(/[-:]/g, "")
		.replace(/\..+/, "")
		.slice(0, 15); // YYYYMMDDTHHmmss

	// Generate random name if not provided
	const randomName =
		options.name || generateRandomName();

	// New format: timestamp_random_name
	const fileBaseName = `${timestamp}_${randomName}`;

	// Convert to camelCase with timestamp at end for variable name
	const camelCaseName = toCamelCase(randomName);
	const migrationVariableName = `${camelCaseName}${timestamp}`;

	console.log(`📝 Migration name: ${fileBaseName}`);
	console.log(`🔤 Variable name: ${migrationVariableName}\n`);

	if (options.dryRun) {
		console.log("🔍 DRY RUN - Would generate migration with the following details:");
		console.log(`File name: ${fileBaseName}.ts`);
		console.log(`Variable name: ${migrationVariableName}`);
		console.log(`Directory: ${migrationDir}\n`);
		return;
	}

	// Generate migration using DrizzleMigrationGenerator
	const generator = new DrizzleMigrationGenerator();

	const result = await generator.generateMigration({
		migrationName: migrationVariableName,
		fileBaseName,
		schema,
		migrationDir,
	});

	if (result.skipped) {
		console.log("⏭️  No schema changes detected, skipping migration generation");
		return;
	}

	// Update migrations index file
	await updateMigrationsIndex(migrationDir, fileBaseName, migrationVariableName);

	console.log("\n✅ Migration generated successfully!");
	console.log(`\nNext steps:`);
	console.log(`  1. Review the migration file: ${migrationDir}/${fileBaseName}.ts`);
	console.log(`  2. Run migrations: bun qcms migrate:up`);
}

/**
 * Update migrations/index.ts to export all migrations
 */
async function updateMigrationsIndex(
	migrationDir: string,
	fileName: string,
	migrationName: string,
): Promise<void> {
	const indexPath = join(migrationDir, "index.ts");

	// Get existing migrations
	const existingMigrations: Array<{
		fileName: string;
		migrationName: string;
	}> = [];

	if (existsSync(indexPath)) {
		try {
			const existingContent = readFileSync(indexPath, "utf-8");

			// Extract migration imports
			const importMatches = existingContent.matchAll(
				/import { (\w+) } from '\.\/([^']+)'/g,
			);

			for (const match of importMatches) {
				const migrationVarName = match[1];
				const fileBaseName = match[2];

				if (migrationVarName && fileBaseName) {
					// Verify the migration file actually exists
					const migrationFilePath = join(migrationDir, `${fileBaseName}.ts`);
					if (existsSync(migrationFilePath)) {
						existingMigrations.push({
							fileName: fileBaseName,
							migrationName: migrationVarName,
						});
					}
				}
			}
		} catch (error) {
			console.warn("⚠️  Could not parse existing migrations index:", error);
		}
	}

	// Add new migration if not already present
	const existingIndex = existingMigrations.findIndex(
		(m) => m.fileName === fileName,
	);
	if (existingIndex >= 0) {
		// Update existing migration
		existingMigrations[existingIndex] = { fileName, migrationName };
	} else {
		// Add new migration
		existingMigrations.push({ fileName, migrationName });
	}

	// Generate imports
	const imports = existingMigrations
		.map((m) => `import { ${m.migrationName} } from "./${m.fileName}"`)
		.join("\n");

	// Generate exports array
	const migrationsArray = existingMigrations
		.map((m) => `\t${m.migrationName}`)
		.join(",\n");

	const content = `import type { Migration } from "@questpie/core/server/migration/types"

${imports}

export const migrations: Migration[] = [
${migrationsArray},
]
`;

	writeFileSync(indexPath, content);
	console.log(`📝 Updated migrations index: ${indexPath}`);
}

function generateRandomName(): string {
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
	];

	const randomItem = (arr: string[]) =>
		arr[Math.floor(Math.random() * arr.length)]!;

	return `${randomItem(adjectives)}_${randomItem(colors)}_${randomItem(animals)}`;
}

function toCamelCase(str: string): string {
	return str
		.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""))
		.replace(/^(.)/, (char) => char.toLowerCase());
}
