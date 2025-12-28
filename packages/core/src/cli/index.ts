#!/usr/bin/env bun

import { Command } from "commander";
import { generateMigrationCommand } from "./commands/generate";
import { runMigrationCommand } from "./commands/run";

const program = new Command();

program
	.name("qcms")
	.description("QUESTPIE CMS CLI")
	.version("1.0.0");

// Generate migration command
program
	.command("migrate:generate")
	.description("Generate a new migration")
	.option("-c, --config <path>", "Path to CMS config file", "cms.config.ts")
	.option("-n, --name <name>", "Custom migration name")
	.option("--dry-run", "Show what would be generated without creating files")
	.option("--verbose", "Show verbose output")
	.action(async (options) => {
		try {
			await generateMigrationCommand(options.config, {
				name: options.name,
				dryRun: options.dryRun,
				verbose: options.verbose,
			});
		} catch (error) {
			console.error("❌ Failed to generate migration:", error);
			process.exit(1);
		}
	});

// Run migrations (up)
program
	.command("migrate:up")
	.description("Run pending migrations")
	.option("-c, --config <path>", "Path to CMS config file", "cms.config.ts")
	.option("-t, --target <migration>", "Target specific migration ID")
	.option("--dry-run", "Show what would be run without executing")
	.action(async (options) => {
		try {
			await runMigrationCommand({
				action: "up",
				configPath: options.config,
				targetMigration: options.target,
				dryRun: options.dryRun,
			});
		} catch (error) {
			console.error("❌ Failed to run migrations:", error);
			process.exit(1);
		}
	});

// Rollback migrations (down)
program
	.command("migrate:down")
	.description("Rollback migrations")
	.option("-c, --config <path>", "Path to CMS config file", "cms.config.ts")
	.option("-b, --batch <number>", "Rollback specific batch number")
	.option("-t, --target <migration>", "Rollback to specific migration")
	.option("--dry-run", "Show what would be run without executing")
	.action(async (options) => {
		try {
			await runMigrationCommand({
				action: "down",
				configPath: options.config,
				batch: options.batch ? Number.parseInt(options.batch, 10) : undefined,
				targetMigration: options.target,
				dryRun: options.dryRun,
			});
		} catch (error) {
			console.error("❌ Failed to rollback migrations:", error);
			process.exit(1);
		}
	});

// Migration status
program
	.command("migrate:status")
	.description("Show migration status")
	.option("-c, --config <path>", "Path to CMS config file", "cms.config.ts")
	.action(async (options) => {
		try {
			await runMigrationCommand({
				action: "status",
				configPath: options.config,
			});
		} catch (error) {
			console.error("❌ Failed to get migration status:", error);
			process.exit(1);
		}
	});

// Reset migrations
program
	.command("migrate:reset")
	.description("Rollback all migrations")
	.option("-c, --config <path>", "Path to CMS config file", "cms.config.ts")
	.option("--dry-run", "Show what would be run without executing")
	.action(async (options) => {
		try {
			await runMigrationCommand({
				action: "reset",
				configPath: options.config,
				dryRun: options.dryRun,
			});
		} catch (error) {
			console.error("❌ Failed to reset migrations:", error);
			process.exit(1);
		}
	});

// Fresh migrations (reset + run all)
program
	.command("migrate:fresh")
	.description("Reset and run all migrations")
	.option("-c, --config <path>", "Path to CMS config file", "cms.config.ts")
	.option("--dry-run", "Show what would be run without executing")
	.action(async (options) => {
		try {
			await runMigrationCommand({
				action: "fresh",
				configPath: options.config,
				dryRun: options.dryRun,
			});
		} catch (error) {
			console.error("❌ Failed to fresh migrations:", error);
			process.exit(1);
		}
	});

program.parse();
