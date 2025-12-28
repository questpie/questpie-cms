import fs from 'node:fs'
import path from 'node:path'
import type { DrizzleSnapshotJSON } from 'drizzle-kit/api'
import { OperationSnapshotManager, type OperationSnapshot } from './operation-snapshot.js'

export type DrizzleMigrationOptions = {
  migrationName: string
  fileBaseName: string
  moduleId: string
  schema: any
  migrationDir: string
  cumulativeSnapshot?: DrizzleSnapshotJSON
}

export class DrizzleMigrationGenerator {
  private operationManager = new OperationSnapshotManager()

  async generateMigration(options: DrizzleMigrationOptions): Promise<{
    fileName: string
    filePath: string
    snapshot: DrizzleSnapshotJSON
    skipped: boolean
  }> {
    const { generateDrizzleJson, generateMigration } = require('drizzle-kit/api')

    // Create migration directory if it doesn't exist
    if (!fs.existsSync(options.migrationDir)) {
      fs.mkdirSync(options.migrationDir, { recursive: true })
    }

    // Create snapshots directory if it doesn't exist
    const snapshotsDir = path.join(options.migrationDir, 'snapshots')
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true })
    }

    const fileName = options.fileBaseName
    const filePath = path.join(options.migrationDir, fileName)

    // Get the previous snapshot (either cumulative or built from operations)
    const previousSnapshot = await this.getPreviousSnapshot(
      options.migrationDir,
      options.cumulativeSnapshot,
    )

    // Generate new snapshot for this schema
    const newSnapshot = generateDrizzleJson(
      options.schema,
      previousSnapshot.id,
      undefined, // schemaFilter
      undefined, // casing
    )

    // Generate operations by comparing snapshots
    const operations = this.operationManager.generateOperations(
      previousSnapshot,
      newSnapshot,
      options.migrationName,
    )

    console.log(`Found ${operations.length} operations`)

    // Skip if no operations (no changes)
    if (operations.length === 0) {
      console.log('⏭️  No schema changes detected, skipping migration generation (No operations)')
      return {
        fileName,
        filePath,
        snapshot: previousSnapshot,
        skipped: true,
      }
    }

    // Generate SQL statements
    const sqlStatementsUp = await generateMigration(previousSnapshot, newSnapshot)
    const sqlStatementsDown = await generateMigration(newSnapshot, previousSnapshot)

    // Post-process SQL to add IF EXISTS to constraint drops for safety
    const processedSqlUp = this.addIfExistsToConstraintDrops(sqlStatementsUp)
    const processedSqlDown = this.addIfExistsToConstraintDrops(sqlStatementsDown)

    // Skip if no SQL changes (even if there are operations)
    if (processedSqlUp.length === 0 && processedSqlDown.length === 0) {
      console.log('⏭️  No SQL changes detected, skipping migration generation (No SQL statements)')
      return {
        fileName,
        filePath,
        snapshot: previousSnapshot,
        skipped: true,
      }
    }

    // Write operation snapshot instead of full snapshot
    const operationSnapshot: OperationSnapshot = {
      operations,
      metadata: {
        migrationId: options.migrationName,
        moduleId: options.moduleId,
        timestamp: new Date().toISOString(),
        prevId: previousSnapshot.id,
      },
    }

    // Save snapshot to snapshots directory
    const snapshotPath = path.join(snapshotsDir, `${fileName}.json`)
    fs.writeFileSync(snapshotPath, JSON.stringify(operationSnapshot, null, 2))

    // Write migration file
    const migrationContent = this.generateMigrationTemplate({
      fileName: options.migrationName,
      moduleId: options.moduleId,
      upSQL: processedSqlUp.length ? processedSqlUp : undefined,
      downSQL: processedSqlDown.length ? processedSqlDown : undefined,
    })

    fs.writeFileSync(`${filePath}.ts`, migrationContent)

    console.info(`📄 Generated migration: ${fileName}.ts`)
    console.info(`📊 Generated operation snapshot: snapshots/${fileName}.json`)
    console.info(`⚡ Operations: ${operations.length}`)

    return {
      fileName,
      filePath,
      snapshot: newSnapshot,
      skipped: false,
    }
  }

  async getCumulativeSnapshot(
    moduleIds: string[],
    packageRoot: string | null,
    pathResolver?: (moduleId: string, repoRoot: string | null) => string | null,
    verbose?: boolean,
  ): Promise<DrizzleSnapshotJSON> {
    const allOperations: Array<{ operations: any[]; timestamp: string; moduleId: string; migrationId: string }> = []
    const moduleStats: Array<{ moduleId: string; count: number; operations: number }> = []

    if (verbose) {
      console.log(`🔍 Processing modules in order: ${moduleIds.join(', ')}`)
    }

    // Collect all operations from all modules
    for (const moduleId of moduleIds) {
      let snapshotsDir: string | null

      if (pathResolver) {
        // Use custom path resolver (for external packages)
        snapshotsDir = pathResolver(moduleId, packageRoot)
      } else {
        // Default monorepo behavior
        snapshotsDir = packageRoot 
          ? path.join(packageRoot, 'packages', moduleId, 'src', 'migrations', 'snapshots')
          : null
      }

      if (!snapshotsDir || !fs.existsSync(snapshotsDir)) {
        if (verbose) {
          console.log(`  📂 ${moduleId}: No snapshots directory found`)
        }
        moduleStats.push({ moduleId, count: 0, operations: 0 })
        continue
      }

      // Find all operation snapshots for this module
      const operationFiles = fs
        .readdirSync(snapshotsDir)
        .filter((file) => file.endsWith('.json'))
        .sort((a, b) => {
          const tsA = this.extractTimestamp(a)
          const tsB = this.extractTimestamp(b)
          return tsA.localeCompare(tsB)
        })

      if (verbose) {
        console.log(`  📂 ${moduleId}: Found ${operationFiles.length} migration snapshots in ${snapshotsDir}`)
      }

      let moduleOperationCount = 0

      for (const operationFile of operationFiles) {
        const operationPath = path.join(snapshotsDir, operationFile)

        try {
          const operationSnapshot: OperationSnapshot = JSON.parse(
            fs.readFileSync(operationPath, 'utf8'),
          )

          // Add operations with their timestamp for proper ordering
          allOperations.push({
            operations: operationSnapshot.operations,
            timestamp: operationSnapshot.metadata.timestamp,
            moduleId: moduleId,
            migrationId: operationSnapshot.metadata.migrationId,
          })

          moduleOperationCount += operationSnapshot.operations.length

          if (verbose) {
            console.log(`    🔄 ${moduleId}: ${operationSnapshot.metadata.migrationId} (${operationSnapshot.metadata.timestamp}) - ${operationSnapshot.operations.length} operations`)
          }
        } catch (error) {
          console.warn(`⚠️  Failed to parse operation snapshot ${operationFile}: ${error}`)
        }
      }

      // Store module stats for summary
      moduleStats.push({ moduleId, count: operationFiles.length, operations: moduleOperationCount })
    }

    // Sort all operations by timestamp
    allOperations.sort((a, b) => a.timestamp.localeCompare(b.timestamp))

    // Clean summary logging
    if (!verbose) {
      // Condensed module summary
      const modulesSummary = moduleStats
        .filter(stat => stat.count > 0)
        .map(stat => `${stat.moduleId}: ${stat.count} migrations (${stat.operations} ops)`)
        .join(' | ')
      
      console.log(`🔍 Dependencies: ${moduleIds.join(', ')}`)
      if (modulesSummary) {
        console.log(`📦 ${modulesSummary}`)
      }

      // Simplified timeline grouped by date
      if (allOperations.length > 0) {
        const groupedByDate = this.groupMigrationsByDate(allOperations)
        console.log(`📅 Migration timeline (${allOperations.length} total):`)
        Object.entries(groupedByDate).forEach(([date, migrations]) => {
          const migrationList = migrations.map(m => `${m.moduleId}→${this.shortenMigrationName(m.migrationId)}`).join(', ')
          console.log(`  ${date}: ${migrationList}`)
        })
      }
    } else {
      // Verbose: Log final chronological order
      console.log(`📅 Final chronological order (${allOperations.length} migrations):`)
      allOperations.forEach((op, index) => {
        console.log(`  ${index + 1}. ${op.moduleId}: ${op.migrationId} (${op.timestamp})`)
      })
    }

    // Flatten and build cumulative snapshot
    const flatOperations = allOperations.flatMap((op) => op.operations)
    const deduplicatedOperations = this.operationManager.deduplicateOperations(flatOperations)

    console.log(`✨ Building cumulative snapshot: ${deduplicatedOperations.length} operations from ${allOperations.length} migrations`)

    return this.operationManager.buildSnapshotFromOperations(deduplicatedOperations)
  }

  private groupMigrationsByDate(operations: Array<{ operations: any[]; timestamp: string; moduleId: string; migrationId: string }>): Record<string, Array<{ moduleId: string; migrationId: string }>> {
    const groups: Record<string, Array<{ moduleId: string; migrationId: string }>> = {}
    
    operations.forEach(op => {
      const date = op.timestamp.split('T')[0] // Get YYYY-MM-DD part
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push({ moduleId: op.moduleId, migrationId: op.migrationId })
    })
    
    return groups
  }

  private shortenMigrationName(migrationId: string): string {
    // Extract the descriptive part (remove timestamp)
    // Format: descriptiveNameTimestamp -> descriptiveName
    const match = migrationId.match(/^(.+?)(?:\d{14})?$/)
    if (match && match[1]) {
      // Take first part of camelCase and capitalize
      const descriptive = match[1].replace(/([A-Z])/g, ' $1').trim()
      const words = descriptive.split(' ')
      if (words.length > 2) {
        return words.slice(0, 2).join('')
      }
      return words[0] || migrationId
    }
    return migrationId
  }

  private async getPreviousSnapshot(
    migrationDir: string,
    cumulativeSnapshot?: DrizzleSnapshotJSON,
  ): Promise<DrizzleSnapshotJSON> {
    if (cumulativeSnapshot) {
      return cumulativeSnapshot
    }

    // Build snapshot from local operations in snapshots directory
    const snapshotsDir = path.join(migrationDir, 'snapshots')
    if (!fs.existsSync(snapshotsDir)) {
      return this.getDefaultSnapshot()
    }

    const operationFiles = fs
      .readdirSync(snapshotsDir)
      .filter((file) => file.endsWith('.json'))
      .sort((a, b) => {
        const tsA = this.extractTimestamp(a)
        const tsB = this.extractTimestamp(b)
        return tsA.localeCompare(tsB)
      })

    if (operationFiles.length === 0) {
      return this.getDefaultSnapshot()
    }

    const allOperations: any[] = []

    for (const operationFile of operationFiles) {
      const operationPath = path.join(snapshotsDir, operationFile)

      try {
        const operationSnapshot: OperationSnapshot = JSON.parse(
          fs.readFileSync(operationPath, 'utf8'),
        )
        allOperations.push(...operationSnapshot.operations)
      } catch (error) {
        console.warn(`⚠️  Failed to parse operation snapshot ${operationFile}: ${error}`)
      }
    }

    const deduplicatedOperations = this.operationManager.deduplicateOperations(allOperations)
    return this.operationManager.buildSnapshotFromOperations(deduplicatedOperations)
  }

  private generateMigrationTemplate(options: {
    fileName: string
    moduleId: string
    upSQL?: string[]
    downSQL?: string[]
  }): string {
    const { fileName, moduleId, upSQL = [], downSQL = [] } = options

    const generateStatements = (statements: string[]) => {
      if (statements.length === 0) return '// No schema changes'
      
      return statements
        .filter(stmt => stmt.trim()) // Remove empty statements
        .map(stmt => `await db.execute(sql\`${stmt.trim()}\`)`)
        .join('\n      ')
    }

    return `import { defineMigration } from '@questpie/cms/backend/definitions/migration.definitions'
import { sql } from 'drizzle-orm'

export const ${fileName} = defineMigration(
  '${moduleId}',
  '${fileName}',
  (ioc) => ({
    async up({ db }) {
      ${generateStatements(upSQL)}
    },
    async down({ db }) {
      ${generateStatements(downSQL)}
    },
  })
)
`
  }

  private getDefaultSnapshot(): DrizzleSnapshotJSON {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      _meta: {
        columns: {},
        schemas: {},
        tables: {},
      },
      dialect: 'postgresql',
      enums: {},
      prevId: '00000000-0000-0000-0000-00000000000',
      schemas: {},
      tables: {},
      version: '7',
      policies: {},
      views: {},
      sequences: {},
      roles: {},
    }
  }

  public extractTimestamp(filename: string): string {
    // New format: 20250627T16185_lake_chivalry_royal.json
    // Extract timestamp from the beginning
    const match = filename.match(/^(\d{8,}T\d+)_/)
    if (match?.[1]) {
      return match[1]
    }

    // Return default timestamp if no match found
    return '00000000T000000'
  }

  private addIfExistsToConstraintDrops(sqlStatements: string[]): string[] {
    return sqlStatements.map(statement => {
      // Add IF EXISTS to constraint drops for safety
      if (statement.includes('DROP CONSTRAINT') && !statement.includes('IF EXISTS')) {
        return statement.replace(
          /ALTER TABLE "([^"]+)" DROP CONSTRAINT "([^"]+)"/g,
          'ALTER TABLE "$1" DROP CONSTRAINT IF EXISTS "$2"'
        )
      }
      return statement
    })
  }

  // Legacy methods for backwards compatibility
  mergeSnapshots(
    baseSnapshot: DrizzleSnapshotJSON,
    newSnapshot: DrizzleSnapshotJSON,
  ): DrizzleSnapshotJSON {
    console.warn('⚠️  mergeSnapshots is deprecated. Use operation-based snapshots instead.')
    return this.operationManager.buildSnapshotFromOperations(
      this.operationManager.generateOperations(baseSnapshot, newSnapshot, 'legacy'),
      baseSnapshot,
    )
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^(.)/, (char) => char.toLowerCase())
  }
}
