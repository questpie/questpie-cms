# Migration CLI

Package-centric database migration system for QuestPie's modular architecture with **operation-based snapshots**.

## 🆕 New Operation-Based System

### Key Improvements

- **Operation-Based Snapshots**: Instead of storing full snapshots, we store only the operations (set/remove) that changed
- **Smart Deduplication**: Automatically removes redundant operations (e.g., multiple removes of the same thing)
- **Better Change Detection**: Properly handles additions, modifications, and removals at all levels
- **Auto-Generated Names**: No more manual naming - generates random, memorable names automatically
- **New File Format**: `20250127T143052_lake_chivalry_royal.ts` (timestamp first, then random name)

### How It Works

1. **Operation Generation**: Compares old vs new snapshots and generates granular operations
2. **Smart Deduplication**: Removes redundant operations automatically
3. **Snapshot Reconstruction**: Builds final snapshots by applying operations in order
4. **Cross-Package Support**: Handles dependencies correctly with operation merging

### File Structure (per package)
```
src/
├── migrations/
│   ├── 20250127T143052_lake_chivalry_royal.ts    # defineMigration (camelCase variable: lakeChivalryRoyal20250127T143052)
│   ├── snapshots/
│   │   └── 20250127T143052_lake_chivalry_royal.json  # operation snapshot
│   └── index.ts                                  # defineModuleMigrations export
└── venue-finder.module.ts                       # imports migrations in definitions
```

### Operation Snapshot Format

Instead of full Drizzle snapshots, we store operation arrays:

```json
{
  "operations": [
    {
      "type": "set",
      "path": "tables.users.columns.email",
      "value": { "type": "varchar", "length": 255 },
      "timestamp": "2025-01-27T14:30:52.123Z",
      "migrationId": "lakeChivalryRoyal20250127T143052"
    },
    {
      "type": "remove", 
      "path": "tables.users.columns.old_field",
      "timestamp": "2025-01-27T14:30:52.124Z",
      "migrationId": "lakeChivalryRoyal20250127T143052"
    }
  ],
  "metadata": {
    "migrationId": "lakeChivalryRoyal20250127T143052",
    "moduleId": "venue-finder",
    "timestamp": "2025-01-27T14:30:52.123Z",
    "prevId": "previous-snapshot-id"
  }
}
```

### Deep Structure Support

The system properly handles nested changes:

- `tables.users.columns.id.type` - Column type changes
- `tables.users.indexes.primary_key` - Index modifications  
- `tables.users.foreignKeys.user_role_fk` - Foreign key changes
- `_meta.tables.users` - Metadata updates

## CLI Commands

### Generate Migration (Auto-Named)
```bash
# Run within a package directory - names generated automatically
cd packages/venue-finder
qp-migrate generate
# Creates: 20250127T143052_crimson_happy_zebra.ts
```

**What it does:**
1. Detects package from `package.json` and finds `src/{package}.module.ts`
2. Generates timestamp + random name (e.g., `20250127T143052_crimson_happy_zebra`)
3. Parses module `imports` to get dependencies: `[CoreModule, WebModule]`
4. Builds dependency chain: `core → auth → web → venue-finder`
5. Gets cumulative operations from dependency packages
6. Generates new operations for this package's schema changes only
7. Deduplicates operations and creates optimized migration
8. Updates `src/migrations/index.ts` and module file

### Run Migrations
```bash
# Run migrations for an app
qp-migrate up --path apps/web-template-v1

# Show status
qp-migrate status --path packages/core

# Rollback
qp-migrate down --path apps/web-template-v1
```

## Benefits of Operation-Based System

1. **Proper Change Detection**: Catches additions, modifications, AND removals
2. **Smart Deduplication**: 
   - Multiple removes of same thing → single remove
   - Set after remove → just the set
   - Multiple sets → latest set wins
3. **Dependency-aware**: Each package only contains its own schema changes
4. **Clean separation**: venue-finder migrations only create venue-finder tables
5. **Automatic ordering**: Dependencies migrated before dependents
6. **Better Debugging**: See exactly what changed in each migration
7. **Conflict Resolution**: Operations are naturally mergeable across packages
8. **Organized Structure**: Snapshots stored in dedicated `snapshots/` folder for cleaner organization

## Integration with Modules

### defineModuleMigrations
Each package exports migrations using `defineModuleMigrations`:

```typescript
// src/migrations/index.ts
import { defineModuleMigrations } from '@questpie/core/backend/definitions/migration.definitions'
import { lakeChivalryRoyal20250127T143052 } from './20250127T143052_lake_chivalry_royal'

export const venue_finderMigrations = defineModuleMigrations(
  'venue-finder',
  (ioc) => ({
    migrations: [
      lakeChivalryRoyal20250127T143052,
    ],
  })
)
```

### Module Integration
The migrations are added to the module's definitions:

```typescript
// src/venue-finder.module.ts
import { venue_finderMigrations } from '@questpie/venue-finder/migrations/index'

export const VenueFinderModule = defineModule((ioc) => ({
  definitions: [
    // ... other definitions
    venue_finderMigrations,
  ],
  imports: [CoreModule, WebModule],
}))
```

## Core Files

- **Definitions**: `@questpie/core/backend/definitions/migration.definitions.ts`
- **Runner**: `@questpie/core/backend/services/migration-runner.service.ts`
- **Boot**: `@questpie/core/backend/boot/migration.boot.ts`
- **Operation Manager**: `packages/migration-cli/src/utils/operation-snapshot.ts`
- **Generator**: `packages/migration-cli/src/utils/drizzle-migration-generator.ts`

## Migration Example

```typescript
// Generated file: 20250127T143052_crimson_happy_zebra.ts
import { defineMigration } from '@questpie/core/backend/definitions/migration.definitions'
import { sql } from 'drizzle-orm'

export const crimsonHappyZebra20250127T143052 = defineMigration(
  'venue-finder',
  'crimsonHappyZebra20250127T143052',
  (ioc) => ({
    async up({ db }) {
      await db.execute(sql`CREATE TABLE "venues" (
        "id" varchar PRIMARY KEY DEFAULT generate_ulid() NOT NULL,
        "name" varchar NOT NULL,
        "email" varchar
      )`)
    },
    async down({ db }) {
      await db.execute(sql`DROP TABLE "venues"`)
    },
  })
)
```

This system ensures migrations are predictable, debuggable, and properly handle complex schema changes across a modular architecture.