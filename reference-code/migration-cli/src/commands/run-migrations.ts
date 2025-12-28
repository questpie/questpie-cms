import { existsSync } from 'node:fs'
import path from 'node:path'

type RunMigrationsOptions = {
  path?: string
  action?: string
  migration?: string
  batch?: number
  dryRun?: boolean
}

export async function runMigrations(opts: RunMigrationsOptions) {
  try {
    const logger = await import('@questpie/core/shared/logger/logger').then((m) => m.logger)

    // Determine target path
    let targetPath: string
    if (opts.path) {
      targetPath = path.resolve(process.cwd(), opts.path)
    } else {
      // Use current directory if no path specified
      targetPath = process.cwd()
    }

    logger.info(`🔄 Running migrations for path: ${targetPath}`)

    if (!existsSync(targetPath)) {
      throw new Error(`Path not found: ${targetPath}`)
    }

    // Look for payload.config.ts in the target path
    const payloadConfigPath = path.join(targetPath, 'payload.config.ts')

    if (!existsSync(payloadConfigPath)) {
      throw new Error(`PayloadCMS config not found: ${payloadConfigPath}`)
    }

    logger.info(`📋 Using PayloadCMS config: ${payloadConfigPath}`)

    // Dynamically import and setup PayloadCMS
    const { setupMigrationEnvironment } = await import('./migration-environment-setup.js')
    const { payload, db, migrationConfigs } = await setupMigrationEnvironment(payloadConfigPath)

    // Import migration runner
    const { MigrationRunner } = await import(
      '@questpie/core/backend/services/migration-runner.service'
    )
    const runner = new MigrationRunner(db as any)

    if (opts.dryRun) {
      logger.info('🔍 DRY RUN - Would execute the following migration operation:')
      logger.info(`Action: ${opts.action || 'up'}`)
      if (opts.migration) logger.info(`Target migration: ${opts.migration}`)
      if (opts.batch) logger.info(`Target batch: ${opts.batch}`)
      return
    }

    // Execute the requested action
    switch (opts.action) {
      case 'up':
      case undefined: // Default action
        await runner.runMigrationsUp(migrationConfigs, {
          targetMigration: opts.migration,
        })
        break

      case 'down':
        if (opts.batch) {
          await runner.rollbackBatch(migrationConfigs, opts.batch)
        } else if (opts.migration) {
          await runner.rollbackToMigration(migrationConfigs, opts.migration)
        } else {
          await runner.rollbackLastBatch(migrationConfigs)
        }
        break

      case 'reset':
        await runner.reset(migrationConfigs)
        break

      case 'fresh':
        await runner.fresh(migrationConfigs)
        break

      case 'status':
        await runner.status(migrationConfigs)
        break

      default:
        throw new Error(`Unknown action: ${opts.action}`)
    }

    logger.info('✅ Migration operation completed successfully')
  } catch (error) {
    const logger = await import('@questpie/core/shared/logger/logger').then((m) => m.logger)
    logger.error('❌ Migration operation failed:', error)
    throw error
  }
}
