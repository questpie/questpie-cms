#!/usr/bin/env tsx

import { boolean, command, run, string } from '@drizzle-team/brocli'
import { generateMigration } from './commands/generate-migration.js'
import { runMigrations } from './commands/run-migrations.js'
// Register CSS import suppression using Node.js module register
import { register } from 'node:module'

// Register the CSS loader
try {
  register(
    `data:text/javascript,${encodeURIComponent(`
    export async function load(url, context, defaultLoad) {
      if (url.endsWith('.css')) {
        return {
          format: 'module',
          source: 'export default {};',
          shortCircuit: true
        }
      }
      return defaultLoad(url, context)
    }
  `)}`,
  )
} catch (error) {
  console.warn('⚠️  Could not register CSS loader:', error)
}

const generateCommand = command({
  name: 'generate',
  desc: 'Generate a new migration for current package or specified module',
  options: {
    'dry-run': boolean().default(false).desc('Show what would be generated'),
    'verbose': boolean().default(false).desc('Show detailed migration processing logs'),
  },
  handler: async (opts) => {
    await generateMigration({
      dryRun: opts['dry-run'],
      verbose: opts['verbose'],
    })
  },
})

const upCommand = command({
  name: 'up',
  desc: 'Run pending migrations',
  options: {
    path: string().desc('Path to package with payload.config.ts'),
    migration: string().desc('Target specific migration ID'),
    'dry-run': boolean().default(false).desc('Show what would be run'),
  },
  handler: async (opts) => {
    await runMigrations({
      path: opts.path,
      action: 'up',
      migration: opts.migration,
      dryRun: opts['dry-run'],
    })
  },
})

const downCommand = command({
  name: 'down',
  desc: 'Rollback migrations',
  options: {
    path: string().desc('Path to package with payload.config.ts'),
    batch: string().desc('Specific batch number to rollback to'),
    migration: string().desc('Rollback to specific migration'),
    'dry-run': boolean().default(false).desc('Show what would be run'),
  },
  handler: async (opts) => {
    await runMigrations({
      path: opts.path,
      action: 'down',
      batch: opts.batch ? Number.parseInt(opts.batch, 10) : undefined,
      migration: opts.migration,
      dryRun: opts['dry-run'],
    })
  },
})

const statusCommand = command({
  name: 'status',
  desc: 'Show migration status',
  options: {
    path: string().desc('Path to package with payload.config.ts'),
  },
  handler: async (opts) => {
    await runMigrations({
      path: opts.path,
      action: 'status',
    })
  },
})

const resetCommand = command({
  name: 'reset',
  desc: 'Rollback all migrations',
  options: {
    path: string().desc('Path to package with payload.config.ts'),
    'dry-run': boolean().default(false).desc('Show what would be run'),
  },
  handler: async (opts) => {
    await runMigrations({
      path: opts.path,
      action: 'reset',
      dryRun: opts['dry-run'],
    })
  },
})

const freshCommand = command({
  name: 'fresh',
  desc: 'Reset and run all migrations',
  options: {
    path: string().desc('Path to package with payload.config.ts'),
    'dry-run': boolean().default(false).desc('Show what would be run'),
  },
  handler: async (opts) => {
    await runMigrations({
      path: opts.path,
      action: 'fresh',
      dryRun: opts['dry-run'],
    })
  },
})

run([generateCommand, upCommand, downCommand, statusCommand, resetCommand, freshCommand], {
  hook: (e, c, o) => {
    if (e === 'after') {
      process.exit(0)
    }
  },
})
