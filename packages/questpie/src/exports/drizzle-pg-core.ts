/**
 * questpie/drizzle-pg-core — Re-exports all of drizzle-orm/pg-core
 *
 * Ensures dependent packages resolve drizzle-orm/pg-core from the same
 * instance as questpie itself, avoiding duplicate-package type incompatibilities.
 *
 * Usage:
 *   import { uniqueIndex, index, pgTable } from "questpie/drizzle-pg-core";
 */

export * from "drizzle-orm/pg-core";
