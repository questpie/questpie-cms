# Migrations

Database migrations in QUESTPIE CMS using Drizzle Kit with operation-based snapshots.

## Overview

The migration system provides:
- **Operation-based snapshots**: Tracks only changes (set/remove operations) instead of full schemas
- **Automatic generation**: Analyzes your CMS schema and generates SQL migrations
- **Programmatic API**: Use migrations in tests and scripts
- **CLI commands**: Full migration workflow from command line
- **Smart deduplication**: Removes redundant operations automatically

## Quick Start

### 1. Configure migrations in CMS config

```typescript
// cms.config.ts
import { QCMS } from "@questpie/core/server"

export const qcms = new QCMS({
  db: { connection: process.env.DATABASE_URL },
  collections: [posts, users, comments],

  migrations: {
    directory: "./migrations", // Where to store migrations (default: "./migrations")
  }
})
```

### 2. Generate your first migration

```bash
# CLI approach
bun qcms migrate:generate

# Or programmatic
await qcms.migrations.generate()
```

This will:
1. Compare current schema with previous snapshots
2. Generate operations (set/remove) for changes
3. Create SQL statements using Drizzle Kit
4. Write migration file: `migrations/20250126T143052_crimson_happy_zebra.ts`
5. Write operation snapshot: `migrations/snapshots/20250126T143052_crimson_happy_zebra.json`
6. Update `migrations/index.ts` to export the new migration

### 3. Run migrations

```bash
# CLI approach
bun qcms migrate:up

# Or programmatic
await qcms.migrations.up()
```

## CLI Commands

All commands support the `-c` or `--config` flag to specify your config file (default: `cms.config.ts`).

### Generate Migration

```bash
# Auto-generate with random name
bun qcms migrate:generate

# Custom name
bun qcms migrate:generate --name add_users_table

# Dry run (don't write files)
bun qcms migrate:generate --dry-run

# Verbose output
bun qcms migrate:generate --verbose
```

### Run Migrations

```bash
# Run all pending migrations
bun qcms migrate:up

# Run up to specific migration
bun qcms migrate:up --target crimsonHappyZebra20250126T143052

# Dry run
bun qcms migrate:up --dry-run
```

### Rollback Migrations

```bash
# Rollback last batch
bun qcms migrate:down

# Rollback to specific batch number
bun qcms migrate:down --batch 1

# Rollback to specific migration
bun qcms migrate:down --target crimsonHappyZebra20250126T143052
```

### Migration Status

```bash
bun qcms migrate:status
```

Shows:
- Current batch number
- Executed migrations (with batch and timestamp)
- Pending migrations

### Reset & Fresh

```bash
# Rollback all migrations
bun qcms migrate:reset

# Reset and run all migrations
bun qcms migrate:fresh
```

## Programmatic API

Use migrations in tests and scripts:

```typescript
import { qcms } from "./cms.config"

// Generate migration
const result = await qcms.migrations.generate({
  name: "add_posts_table",
  dryRun: false,
})

if (!result.skipped) {
  console.log(`Generated: ${result.fileName}`)
}

// Run pending migrations
await qcms.migrations.up()

// Run to specific migration
await qcms.migrations.up({ targetMigration: "someId" })

// Rollback last batch
await qcms.migrations.down()

// Rollback to specific migration
await qcms.migrations.downTo("someId")

// Reset all
await qcms.migrations.reset()

// Fresh (reset + run all)
await qcms.migrations.fresh()

// Get status
const status = await qcms.migrations.status()
console.log(`Pending: ${status.pending.length}`)
console.log(`Executed: ${status.executed.length}`)
```

## Migration File Structure

```
migrations/
├── 20250126T143052_crimson_happy_zebra.ts    # Migration definition
├── 20250126T150123_lake_chivalry_royal.ts
├── snapshots/
│   ├── 20250126T143052_crimson_happy_zebra.json  # Operation snapshot
│   └── 20250126T150123_lake_chivalry_royal.json
└── index.ts  # Exports all migrations
```

## Generated Migration File

```typescript
// migrations/20250126T143052_crimson_happy_zebra.ts
import type { Migration } from "@questpie/core/server/migration/types"
import { sql } from "drizzle-orm"

export const crimsonHappyZebra20250126T143052: Migration = {
  id: "crimsonHappyZebra20250126T143052",

  async up({ db }) {
    await db.execute(sql`CREATE TABLE "posts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "title" varchar(255) NOT NULL,
      "content" text
    )`)
  },

  async down({ db }) {
    await db.execute(sql`DROP TABLE "posts"`)
  },
}
```

## Operation Snapshots

Instead of storing full Drizzle snapshots, we store only operations:

```json
{
  "operations": [
    {
      "type": "set",
      "path": "tables.posts.columns.title",
      "value": { "type": "varchar", "length": 255 },
      "timestamp": "2025-01-26T14:30:52.123Z",
      "migrationId": "crimsonHappyZebra20250126T143052"
    },
    {
      "type": "remove",
      "path": "tables.posts.columns.old_field",
      "timestamp": "2025-01-26T14:30:52.124Z",
      "migrationId": "crimsonHappyZebra20250126T143052"
    }
  ],
  "metadata": {
    "migrationId": "crimsonHappyZebra20250126T143052",
    "timestamp": "2025-01-26T14:30:52.123Z",
    "prevId": "previous-snapshot-id"
  }
}
```

## How It Works

### 1. **Schema Detection**
- Uses `qcms.getSchema()` to get all collections and globals
- Includes main tables, i18n tables, and version tables

### 2. **Snapshot Comparison**
- Loads previous operation snapshots from `migrations/snapshots/`
- Reconstructs previous schema by applying operations in order
- Compares with current schema using Drizzle Kit's `generateDrizzleJson()`

### 3. **Operation Generation**
- Generates granular operations (set/remove) for all changes
- Handles deep nested changes (columns, indexes, foreign keys, etc.)
- Deduplicates redundant operations

### 4. **SQL Generation**
- Uses Drizzle Kit's `generateMigration()` to create SQL
- Generates both `up` and `down` SQL statements
- Adds safety features (IF EXISTS for constraint drops)

### 5. **Migration Tracking**
- Stores migration history in `questpie_migrations` table
- Tracks batch numbers for rollback grouping
- Records execution timestamps

## Manual Migrations

You can define custom migrations in your config:

```typescript
import { sql } from "drizzle-orm"
import type { Migration } from "@questpie/core/server/migration/types"

const customMigration: Migration = {
  id: "custom_data_migration_20250126",
  async up({ db }) {
    // Custom data migration
    await db.execute(sql`UPDATE posts SET status = 'published' WHERE status IS NULL`)
  },
  async down({ db }) {
    await db.execute(sql`UPDATE posts SET status = NULL WHERE status = 'published'`)
  },
}

export const qcms = new QCMS({
  // ... other config
  migrations: {
    directory: "./migrations",
    migrations: [customMigration], // Manual migrations
  }
})
```

## Testing with Migrations

```typescript
import { describe, test, beforeEach, afterEach } from "bun:test"
import { qcms } from "./cms.config"

describe("Posts API", () => {
  beforeEach(async () => {
    // Run migrations before each test
    await qcms.migrations.fresh()
  })

  afterEach(async () => {
    // Clean up after tests
    await qcms.migrations.reset()
  })

  test("create post", async () => {
    // Your tests here
  })
})
```

## Future: Module-Level Migrations

When modules become first-class citizens, they can export their own migrations:

```typescript
// Future syntax (not yet implemented)
export const myModule = defineModule({
  name: "my-module",
  collections: [posts],
  migrations: [migration1, migration2],
})

// QCMS will merge module migrations automatically:
// [...config.migrations, ...module1.migrations, ...module2.migrations]
```

## Best Practices

1. **Always review generated migrations** before running them in production
2. **Test migrations locally first** using `migrate:fresh` to ensure they work
3. **Never edit existing migration files** - create new ones instead
4. **Use meaningful names** when generating migrations manually
5. **Backup your database** before running migrations in production
6. **Keep snapshots in version control** for complete migration history
7. **Run migrations in CI/CD** as part of deployment process

## Troubleshooting

### No changes detected

If `migrate:generate` says "No schema changes detected":
- Make sure you've actually changed your collection/global definitions
- Check that your CMS config is correctly loading all collections

### Migration fails to run

- Check the generated SQL in the migration file
- Ensure your database user has the necessary permissions
- Look for syntax errors in custom migrations

### Can't rollback

- Ensure you have `down()` implementations in your migrations
- Check that referenced tables/columns still exist
- Some operations (like data migrations) may not be fully reversible

## Advanced

### Skip migration generation

If you only want to run existing migrations without generating new ones:

```typescript
// Just run what's in migrations/
await qcms.migrations.up()
```

### Migration batches

Migrations are grouped into batches. Each time you run `migrate:up`, all pending migrations are executed in a single batch. This allows you to rollback all migrations from the last deployment with one `migrate:down` command.
