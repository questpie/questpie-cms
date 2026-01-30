import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { generateDrizzleJson } from "drizzle-kit/api-postgres";
import { OperationSnapshotManager } from "./operation-snapshot.js";
import type { GenerateMigrationResult, OperationSnapshot } from "./types.js";

// Infer snapshot type from drizzle-kit API
type DrizzleSnapshotJSON = Awaited<ReturnType<typeof generateDrizzleJson>>;

export type GenerateMigrationOptions = {
  /** Custom name for the migration (auto-generated if not provided) */
  name?: string;

  /** Dry run - don't write files, just show what would be generated */
  dryRun?: boolean;

  /** Verbose logging */
  verbose?: boolean;

  /** Skip interactive prompts - auto-select default options */
  nonInteractive?: boolean;
};

export type DrizzleMigrationGeneratorOptions = {
  /** Migration name (e.g., "crimsonHappyZebra20250126T143052") */
  migrationName: string;

  /** File base name (e.g., "20250126T143052_crimson_happy_zebra") */
  fileBaseName: string;

  /** Drizzle schema from app.getSchema() */
  schema: Record<string, unknown>;

  /** Directory where migrations are stored */
  migrationDir: string;

  /** Cumulative snapshot from previous migrations */
  cumulativeSnapshot?: DrizzleSnapshotJSON;
};

/**
 * Generates Drizzle migrations using operation-based snapshots
 *
 * This generator:
 * 1. Compares current schema with previous snapshot
 * 2. Generates operations (set/remove) for changes
 * 3. Creates SQL migration statements
 * 4. Writes migration file and operation snapshot
 */
export class DrizzleMigrationGenerator {
  private operationManager = new OperationSnapshotManager();

  async generateMigration(
    options: DrizzleMigrationGeneratorOptions,
  ): Promise<GenerateMigrationResult> {
    // Import drizzle-kit API dynamically
    const { generateDrizzleJson, generateMigration } =
      await import("drizzle-kit/api-postgres");

    // Create migrations directory if it doesn't exist
    if (!existsSync(options.migrationDir)) {
      mkdirSync(options.migrationDir, { recursive: true });
    }

    // Create snapshots directory if it doesn't exist
    const snapshotsDir = join(options.migrationDir, "snapshots");
    if (!existsSync(snapshotsDir)) {
      mkdirSync(snapshotsDir, { recursive: true });
    }

    const fileName = options.fileBaseName;
    const filePath = join(options.migrationDir, fileName);

    // Get the previous snapshot (either cumulative or built from operations)
    const previousSnapshot = await this.getPreviousSnapshot(
      options.migrationDir,
      options.cumulativeSnapshot,
    );

    // Generate new snapshot for this schema
    const newSnapshot = await generateDrizzleJson(
      options.schema,
      previousSnapshot.id,
      undefined, // schemaFilter
      undefined, // casing
    );

    // Generate operations by comparing snapshots
    const operations = this.operationManager.generateOperations(
      previousSnapshot,
      newSnapshot,
      options.migrationName,
    );

    console.log(`Found ${operations.length} operations`);

    // Skip if no operations (no changes)
    if (operations.length === 0) {
      console.log(
        "⏭️  No schema changes detected, skipping migration generation (No operations)",
      );
      return {
        fileName,
        filePath,
        snapshot: previousSnapshot,
        skipped: true,
      };
    }

    // Generate SQL statements
    const sqlStatementsUp = await generateMigration(
      previousSnapshot,
      newSnapshot,
    );
    const sqlStatementsDown = await generateMigration(
      newSnapshot,
      previousSnapshot,
    );

    // Post-process SQL to add IF EXISTS to constraint drops for safety
    const processedSqlUp = this.addIfExistsToConstraintDrops(sqlStatementsUp);
    const processedSqlDown =
      this.addIfExistsToConstraintDrops(sqlStatementsDown);

    // Skip if no SQL changes (even if there are operations)
    if (processedSqlUp.length === 0 && processedSqlDown.length === 0) {
      console.log(
        "⏭️  No SQL changes detected, skipping migration generation (No SQL statements)",
      );
      return {
        fileName,
        filePath,
        snapshot: previousSnapshot,
        skipped: true,
      };
    }

    // Create operation snapshot
    const operationSnapshot: OperationSnapshot = {
      operations,
      metadata: {
        migrationId: options.migrationName,
        timestamp: new Date().toISOString(),
        prevId: previousSnapshot.id,
      },
    };

    // Write snapshot to separate JSON file
    const snapshotPath = join(snapshotsDir, `${fileName}.json`);
    writeFileSync(snapshotPath, JSON.stringify(operationSnapshot, null, 2));

    // Write migration file (imports snapshot from JSON)
    const migrationContent = this.generateMigrationTemplate({
      migrationName: options.migrationName,
      upSQL: processedSqlUp.length ? processedSqlUp : undefined,
      downSQL: processedSqlDown.length ? processedSqlDown : undefined,
      snapshotFileName: fileName,
    });

    writeFileSync(`${filePath}.ts`, migrationContent);

    // Update index.ts
    this.updateMigrationsIndex(
      options.migrationDir,
      fileName,
      options.migrationName,
    );

    console.info(`📄 Generated migration: ${fileName}.ts`);
    console.info(`⚡ Operations: ${operations.length} (embedded in migration)`);

    return {
      fileName,
      filePath,
      snapshot: newSnapshot,
      skipped: false,
    };
  }

  /**
   * Update or create the migrations index.ts file
   * If the file already exists and contains the migration, it won't be modified
   * Otherwise, the new migration is appended to preserve existing structure
   */
  private updateMigrationsIndex(
    migrationDir: string,
    fileName: string,
    migrationName: string,
  ): void {
    const indexPath = join(migrationDir, "index.ts");

    // Check if index.ts already exists
    if (existsSync(indexPath)) {
      const existingContent = readFileSync(indexPath, "utf8");

      // Check if migration is already imported (by checking for the migration name)
      if (existingContent.includes(migrationName)) {
        // Migration already exists in index, no need to update
        return;
      }

      // Parse existing content to append new migration
      const updatedContent = this.appendMigrationToIndex(
        existingContent,
        fileName,
        migrationName,
      );
      writeFileSync(indexPath, updatedContent);
    } else {
      // Create new index.ts from scratch
      const indexContent = this.generateNewIndex(migrationDir);
      writeFileSync(indexPath, indexContent);
    }
  }

  /**
   * Append a new migration to existing index.ts content
   * Preserves existing formatting, imports, and export order
   */
  private appendMigrationToIndex(
    existingContent: string,
    fileName: string,
    migrationName: string,
  ): string {
    // Generate the new import line
    const newImport = `import { ${migrationName} } from "./${fileName}.js";`;

    // Find where to insert the new import (after existing imports, before the export)
    // Look for the last import statement
    const importRegex = /^import .+ from .+;?\s*$/gm;
    let lastImportMatch: RegExpExecArray | null = null;

    for (const match of existingContent.matchAll(importRegex)) {
      lastImportMatch = match;
    }

    let contentWithImport: string;
    if (lastImportMatch) {
      // Insert after the last import
      const insertPos = lastImportMatch.index + lastImportMatch[0].length;
      contentWithImport =
        existingContent.slice(0, insertPos) +
        "\n" +
        newImport +
        existingContent.slice(insertPos);
    } else {
      // No imports found, add at the beginning after type import
      contentWithImport = existingContent.replace(
        /(import type \{ Migration \} from .+;\n?)/,
        `$1${newImport}\n`,
      );
    }

    // Find and update the migrations array to include the new migration
    // Match the migrations array pattern
    const arrayRegex =
      /(export const migrations:\s*Migration\[\]\s*=\s*\[)([\s\S]*?)(\];)/;
    const arrayMatch = contentWithImport.match(arrayRegex);

    if (arrayMatch) {
      const [_fullMatch, arrayStart, arrayContent, arrayEnd] = arrayMatch;
      const trimmedContent = arrayContent.trim();

      // Detect indentation style from existing content
      const indentMatch = arrayContent.match(/\n(\s+)/);
      const indent = indentMatch ? indentMatch[1] : "\t";

      let newArrayContent: string;
      if (trimmedContent) {
        // Add comma after last item if not present, then add new migration
        const contentWithComma = trimmedContent.endsWith(",")
          ? trimmedContent
          : `${trimmedContent},`;
        newArrayContent = `\n${indent}${contentWithComma}\n${indent}${migrationName},\n`;
      } else {
        newArrayContent = `\n${indent}${migrationName},\n`;
      }

      contentWithImport = contentWithImport.replace(
        arrayRegex,
        `${arrayStart}${newArrayContent}${arrayEnd}`,
      );
    }

    return contentWithImport;
  }

  /**
   * Generate a new index.ts from scratch by scanning migration files
   */
  private generateNewIndex(migrationDir: string): string {
    const { readdirSync } = require("node:fs");

    // Get all migration files
    const migrationFiles = readdirSync(migrationDir)
      .filter((file: string) => file.endsWith(".ts") && file !== "index.ts")
      .sort();

    // Generate imports and exports
    const imports: string[] = [];
    const exports: string[] = [];

    for (const file of migrationFiles) {
      const baseName = file.replace(".ts", "");
      // Extract migration variable name from file
      const varMatch = baseName.match(/\d+_(.+)$/);
      if (varMatch) {
        const varName = this.toCamelCase(varMatch[1] || baseName);
        const timestamp = baseName.match(/^(\d+)_/)?.[1] || "";
        const migrationVarName = `${varName}${timestamp}`;

        imports.push(`import { ${migrationVarName} } from "./${baseName}.js";`);
        exports.push(migrationVarName);
      }
    }

    return `import type { Migration } from "questpie";
${imports.join("\n")}

export const migrations: Migration[] = [
	${exports.join(",\n\t")},
];
`;
  }

  private toCamelCase(str: string): string {
    return str
      .split("_")
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join("");
  }

  /**
   * Get cumulative snapshot from migrations loaded via .migrations([...])
   * This is the preferred method as it uses the migrations that are actually imported
   */
  getCumulativeSnapshotFromMigrations(
    migrations: Array<{ id: string; snapshot?: OperationSnapshot }>,
  ): DrizzleSnapshotJSON {
    if (!migrations || migrations.length === 0) {
      return this.getDefaultSnapshot();
    }

    const allOperations: any[] = [];

    for (const migration of migrations) {
      if (migration.snapshot?.operations) {
        allOperations.push(...migration.snapshot.operations);
      }
    }

    if (allOperations.length === 0) {
      return this.getDefaultSnapshot();
    }

    const deduplicatedOperations =
      this.operationManager.deduplicateOperations(allOperations);
    return this.operationManager.buildSnapshotFromOperations(
      deduplicatedOperations,
    );
  }

  /**
   * Get cumulative snapshot from all previous operation snapshots in file system
   * @deprecated Use getCumulativeSnapshotFromMigrations instead
   */
  async getCumulativeSnapshot(
    migrationDir: string,
  ): Promise<DrizzleSnapshotJSON> {
    const snapshotsDir = join(migrationDir, "snapshots");
    if (!existsSync(snapshotsDir)) {
      return this.getDefaultSnapshot();
    }

    const { readdirSync } = await import("node:fs");
    const operationFiles = readdirSync(snapshotsDir)
      .filter((file) => file.endsWith(".json"))
      .sort((a, b) => {
        const tsA = this.extractTimestamp(a);
        const tsB = this.extractTimestamp(b);
        return tsA.localeCompare(tsB);
      });

    if (operationFiles.length === 0) {
      return this.getDefaultSnapshot();
    }

    const allOperations: any[] = [];

    for (const operationFile of operationFiles) {
      const operationPath = join(snapshotsDir, operationFile);

      try {
        const operationSnapshot: OperationSnapshot = JSON.parse(
          readFileSync(operationPath, "utf8"),
        );
        allOperations.push(...operationSnapshot.operations);
      } catch (error) {
        console.warn(
          `⚠️  Failed to parse operation snapshot ${operationFile}: ${error}`,
        );
      }
    }

    const deduplicatedOperations =
      this.operationManager.deduplicateOperations(allOperations);
    return this.operationManager.buildSnapshotFromOperations(
      deduplicatedOperations,
    );
  }

  private async getPreviousSnapshot(
    migrationDir: string,
    cumulativeSnapshot?: DrizzleSnapshotJSON,
  ): Promise<DrizzleSnapshotJSON> {
    if (cumulativeSnapshot) {
      return cumulativeSnapshot;
    }

    // Build snapshot from local operations in snapshots directory
    return this.getCumulativeSnapshot(migrationDir);
  }

  private generateMigrationTemplate(options: {
    migrationName: string;
    upSQL?: string[];
    downSQL?: string[];
    snapshotFileName: string;
  }): string {
    const {
      migrationName,
      upSQL = [],
      downSQL = [],
      snapshotFileName,
    } = options;

    const generateStatements = (statements: string[]) => {
      if (statements.length === 0) return "// No schema changes";

      return statements
        .filter((stmt) => stmt.trim()) // Remove empty statements
        .map((stmt) => `await db.execute(sql\`${stmt.trim()}\`)`)
        .join("\n\t\t");
    };

    return `import type { Migration, OperationSnapshot } from "questpie"
import { sql } from "drizzle-orm"
import snapshotJson from "./snapshots/${snapshotFileName}.json"

const snapshot = snapshotJson as OperationSnapshot

export const ${migrationName}: Migration = {
	id: "${migrationName}",
	async up({ db }) {
		${generateStatements(upSQL)}
	},
	async down({ db }) {
		${generateStatements(downSQL)}
	},
	snapshot,
}
`;
  }

  private getDefaultSnapshot(): DrizzleSnapshotJSON {
    return {
      id: "00000000-0000-0000-0000-000000000000",
      dialect: "postgres",
      prevIds: [],
      version: "8",
      ddl: [],
      renames: [],
    } as DrizzleSnapshotJSON;
  }

  extractTimestamp(filename: string): string {
    // Format: 20250627T16185_lake_chivalry_royal.json
    // Extract timestamp from the beginning
    const match = filename.match(/^(\d{8,}T\d+)_/);
    if (match?.[1]) {
      return match[1];
    }

    // Return default timestamp if no match found
    return "00000000T000000";
  }

  private addIfExistsToConstraintDrops(sqlStatements: string[]): string[] {
    return sqlStatements.map((statement) => {
      // Add IF EXISTS to constraint drops for safety
      if (
        statement.includes("DROP CONSTRAINT") &&
        !statement.includes("IF EXISTS")
      ) {
        return statement.replace(
          /ALTER TABLE "([^"]+)" DROP CONSTRAINT "([^"]+)"/g,
          'ALTER TABLE "$1" DROP CONSTRAINT IF EXISTS "$2"',
        );
      }
      return statement;
    });
  }
}
