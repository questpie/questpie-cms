---
title: Migrations Testing
---

# Using Migrations in Tests

This guide shows how to use the migration system in your tests instead of manual DDL statements.

## Why Use Migrations in Tests?

- **Consistency**: Tests use the same migration system as production
- **Maintainability**: Schema changes are managed in one place
- **Type Safety**: Migrations are type-checked TypeScript
- **Realistic**: Tests run the same code path as production

## Quick Example

### Before (Manual DDL):

```typescript
import { createTestDb } from "./utils/test-db";

const ddl = [
  testUuidFunctionSql,
  `CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT test_uuid(),
    sku varchar(50) NOT NULL,
    name text NOT NULL
  )`,
];

beforeEach(async () => {
  const setup = await createTestDb({ products: products.table }, ddl);
  db = setup.db;
});
```

### After (Using Migrations):

```typescript
import { createMigrationFromDDL } from "./utils/test-migrations";
import { createTestCms } from "./utils/test-cms";

const createProductsTable = createMigrationFromDDL(
  "create_products_table",
  [
    testUuidFunctionSql,
    `CREATE TABLE products (
      id uuid PRIMARY KEY DEFAULT test_uuid(),
      sku varchar(50) NOT NULL,
      name text NOT NULL
    )`,
  ],
  ["DROP TABLE products"],
);

beforeEach(async () => {
  const setup = await createTestDb({ products: products.table });
  db = setup.db;
  cms = createTestCms([products], db);

  cms.config.migrations = {
    migrations: [createProductsTable],
  };

  await cms.migrations.up();
});

afterEach(async () => {
  await cms.migrations.down(); // Clean rollback
  await closeTestDb(client);
});
```

## Benefits

1. **Automatic Cleanup**: `migrations.down()` handles all DROP TABLE statements
2. **Batch Tracking**: Migrations track what was created in each batch
3. **Reusable**: Same migration can be used across multiple test files
4. **Production-Ready**: Migrations tested in tests work in production

## Example: Full Test Migration

```typescript
import { sql } from "drizzle-orm";
import type { Migration } from "#questpie/cms/server/migration/types";
import { createTestDb, testUuidFunctionSql } from "./utils/test-db";

// Define migration once
const setupProductsSchema: Migration = {
  id: "setup_products_schema",
  async up({ db }) {
    // Create UUID function
    await db.execute(sql.raw(testUuidFunctionSql));

    // Create main table
    await db.execute(sql.raw(`
      CREATE TABLE products (
        id uuid PRIMARY KEY DEFAULT test_uuid(),
        sku varchar(50) NOT NULL,
        _title text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp
      )
    `));

    // Create i18n table
    await db.execute(sql.raw(`
      CREATE TABLE products_i18n (
        id uuid PRIMARY KEY DEFAULT test_uuid(),
        parent_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        locale text NOT NULL,
        _title text,
        name text,
        description text,
        UNIQUE(parent_id, locale)
      )
    `));

    // Create versions table
    await db.execute(sql.raw(`
      CREATE TABLE products_versions (
        id uuid PRIMARY KEY DEFAULT test_uuid(),
        parent_id uuid NOT NULL,
        version integer NOT NULL,
        operation text NOT NULL,
        data jsonb NOT NULL,
        user_id text,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `));
  },

  async down({ db }) {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS products_versions`));
    await db.execute(sql.raw(`DROP TABLE IF EXISTS products_i18n`));
    await db.execute(sql.raw(`DROP TABLE IF EXISTS products`));
    await db.execute(sql.raw(`DROP FUNCTION IF EXISTS test_uuid()`));
  },
};

describe("Products CRUD", () => {
  let db: any;
  let client: any;
  let cms: any;

  beforeEach(async () => {
    const setup = await createTestDb({
      products: products.table,
      products_i18n: products.i18nTable!,
      products_versions: products.versionsTable!,
    });
    db = setup.db;
    client = setup.client;

    cms = createTestCms([products], db);
    cms.config.migrations = {
      migrations: [setupProductsSchema],
    };

    await cms.migrations.up();
  });

  afterEach(async () => {
    await cms.migrations.down();
    await closeTestDb(client);
  });

  it("creates a product", async () => {
    const product = await cms.api.collections.products.create({
      sku: "TEST-001",
      name: "Test Product",
    });

    expect(product.sku).toBe("TEST-001");
  });
});
```

## Helper: createMigrationFromDDL

For quick conversions, use the helper:

```typescript
import { createMigrationFromDDL } from "./utils/test-migrations";

const migration = createMigrationFromDDL(
  "my_migration",
  [
    // UP statements
    "CREATE TABLE foo (id TEXT PRIMARY KEY)",
    "CREATE INDEX foo_id_idx ON foo(id)",
  ],
  [
    // DOWN statements (reverse order!)
    "DROP INDEX foo_id_idx",
    "DROP TABLE foo",
  ],
);
```

## Migration Status in Tests

Check migration status during tests:

```typescript
it("should have correct migration state", async () => {
  const status = await cms.migrations.status();

  expect(status.executed.length).toBe(1);
  expect(status.currentBatch).toBe(1);
  expect(status.pending.length).toBe(0);
});
```

## Fresh Start in Tests

Use `fresh()` to reset and re-run all migrations:

```typescript
beforeEach(async () => {
  // ... setup
  await cms.migrations.fresh(); // Reset + run all
});
```

## Migration Fixtures

Create reusable migration fixtures:

```typescript
// test/fixtures/migrations.ts
export const productsMigration = createMigrationFromDDL(...);
export const categoriesMigration = createMigrationFromDDL(...);
export const ordersMigration = createMigrationFromDDL(...);

// test/my-test.ts
import { productsMigration, categoriesMigration } from "./fixtures/migrations";

cms.config.migrations = {
  migrations: [productsMigration, categoriesMigration],
};
```

## Best Practices

1. **Define migrations once**: Create migration fixtures and reuse them
2. **Always rollback**: Use `migrations.down()` in `afterEach` for cleanup
3. **Test order matters**: Migrations run in array order
4. **Foreign keys**: Ensure dependent tables are created first
5. **Fresh start**: Use `migrations.fresh()` when you need a clean slate

## Converting Existing Tests

To convert existing tests from manual DDL to migrations:

1. Take existing DDL array
2. Wrap in `createMigrationFromDDL()`
3. Replace `createTestDb()` DDL execution with `migrations.up()`
4. Add `migrations.down()` to cleanup

This gradual approach lets you migrate tests one at a time.
