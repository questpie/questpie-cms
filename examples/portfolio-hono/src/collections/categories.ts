/**
 * Categories Collection
 *
 * Project categories for organization.
 * Demonstrates:
 * - Simple collection with localization
 * - Unique slug constraint
 */

import { q } from "questpie";
import { sql } from "drizzle-orm";
import { varchar, text, integer } from "drizzle-orm/pg-core";

export const categories = q
  .collection("categories")
  .fields({
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    // Display order
    order: integer("order").default(0).notNull(),
  })
  // Localize name and description
  .localized(["name", "description"])
  // Use name as title
  .title(({ f }) => f.name)
  // Public read, auth for write
  .access({
    read: true,
    create: ({ user }) => !!user,
    update: ({ user }) => !!user,
    delete: ({ user }) => user?.role === "admin",
  });
