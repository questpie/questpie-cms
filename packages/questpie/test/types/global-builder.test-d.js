/**
 * Global Builder Type Tests
 *
 * These tests verify that TypeScript correctly infers types for global
 * (singleton) collections. Globals follow similar patterns to collections
 * but without pagination.
 *
 * Run with: tsc --noEmit
 */
import { boolean, integer, jsonb, text, varchar } from "drizzle-orm/pg-core";
import { global } from "#questpie/server/global/builder/global-builder.js";
// ============================================================================
// Test fixtures
// ============================================================================
const settingsGlobal = global("settings").fields({
    siteName: varchar("site_name", { length: 255 }).notNull(),
    siteDescription: text("site_description"),
    maintenanceMode: boolean("maintenance_mode").default(false),
    maxUploadSize: integer("max_upload_size").default(10_000_000),
});
// ============================================================================
// global() factory tests
// ============================================================================
// Name should be inferred as literal type
const settings = global("settings");
// Empty global should initialize with empty state
const emptyGlobal = global("empty");
// ============================================================================
// .fields() method tests
// ============================================================================
// Fields should preserve types from Drizzle columns
const fieldsSettings = global("settings").fields({
    siteName: varchar("site_name", { length: 255 }).notNull(),
    maxUsers: integer("max_users"),
});
// ============================================================================
// .hooks() method type tests
// ============================================================================
// Hooks should type data correctly
const hooksSettings = global("settings")
    .fields({
    siteName: text("site_name").notNull(),
    maintenanceMode: boolean("maintenance_mode"),
})
    .hooks({
    afterChange: async ({ data }) => {
        // data should be select type
        const _id = data.id;
        const _siteName = data.siteName;
    },
});
// ============================================================================
// .access() method type tests
// ============================================================================
// Access should type context with session
const accessSettings = global("settings")
    .fields({
    siteName: text("site_name"),
    adminOnly: boolean("admin_only"),
})
    .access({
    read: ({ session }) => {
        // Anyone can read
        return true;
    },
    update: ({ session }) => {
        // Only authenticated users can update
        return !!session?.user;
    },
});
// ============================================================================
// Complex global scenarios
// ============================================================================
// Full builder chain should work
const complexSettings = global("site_settings")
    .fields({
    siteName: varchar("site_name", { length: 255 }).notNull(),
    siteDescription: text("site_description"),
    maintenanceMode: boolean("maintenance_mode").default(false),
    config: jsonb("config").$type(),
})
    .hooks({
    beforeChange: async ({ data }) => {
        // Can access data fields
    },
})
    .access({
    read: true,
    update: ({ session }) => !!session?.user,
});
// JSONB type should be inferred correctly
const jsonbSettings = global("settings").fields({
    config: jsonb("config").$type(),
});
// ============================================================================
// $infer helper tests
// ============================================================================
// $infer should provide select, insert, update types
const inferSettings = global("settings").fields({
    siteName: text("site_name").notNull(),
});
