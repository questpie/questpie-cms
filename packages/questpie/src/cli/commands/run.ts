import { existsSync } from "node:fs";
import { join } from "node:path";
import { MigrationRunner } from "../../server/migration/runner.js";
import type { Migration } from "../../server/migration/types.js";
import { loadQuestpieConfig } from "../config.js";

export type RunMigrationAction = "up" | "down" | "status" | "reset" | "fresh";

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
 * 1. Loads the config
 * 2. Gets migrations from app.config.migrations.migrations
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

  // Load config
  const cmsConfig = await loadQuestpieConfig(resolvedConfigPath);
  const app = cmsConfig.app;

  // Get migrations from Questpie config (loaded via .migrations() builder method)
  const migrations: Migration[] = app.config.migrations?.migrations || [];

  if (migrations.length === 0) {
    console.log("ℹ️  No migrations found");
    console.log(
      "\n💡 Tip: Make sure to import and add migrations via .migrations([...]) in your CMS builder",
    );
    return;
  }

  console.log(`📦 Found ${migrations.length} migrations\n`);

  if (options.dryRun) {
    console.log(
      "🔍 DRY RUN - Would execute the following migration operation:",
    );
    console.log(`Action: ${options.action}`);
    if (options.targetMigration)
      console.log(`Target migration: ${options.targetMigration}`);
    if (options.batch) console.log(`Target batch: ${options.batch}`);
    console.log("");
    return;
  }

  // Create migration runner
  const runner = new MigrationRunner(app.db);

  // Execute the requested action
  switch (options.action) {
    case "up":
      await runner.runMigrationsUp(migrations, {
        targetMigration: options.targetMigration,
      });
      break;

    case "down":
      if (options.batch !== undefined) {
        await runner.rollbackBatch(migrations, options.batch);
      } else if (options.targetMigration) {
        await runner.rollbackToMigration(migrations, options.targetMigration);
      } else {
        await runner.rollbackLastBatch(migrations);
      }
      break;

    case "reset":
      await runner.reset(migrations);
      break;

    case "fresh":
      await runner.fresh(migrations);
      break;

    case "status":
      await runner.status(migrations);
      break;

    default:
      throw new Error(`Unknown action: ${options.action}`);
  }
}
