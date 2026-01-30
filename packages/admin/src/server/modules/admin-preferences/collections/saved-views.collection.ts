import { q } from "questpie";
import { boolean, jsonb, varchar } from "drizzle-orm/pg-core";
import type { ViewConfiguration } from "../../../../shared/types/saved-views.types.js";

// Re-export types from shared
export type {
  FilterOperator,
  FilterRule,
  SortConfig,
  ViewConfiguration,
} from "../../../../shared/types/saved-views.types.js";

/**
 * Admin Saved Views Collection
 *
 * Stores user-specific view configurations for collection lists.
 * Each view can contain:
 * - Filter rules (field/operator/value combinations)
 * - Sort configuration (field/direction)
 * - Visible columns selection
 *
 * @example
 * ```ts
 * import { adminModule } from "@questpie/admin/server";
 *
 * const cms = q({ name: "my-app" })
 *   .use(starterModule)
 *   .use(adminModule)
 *   .collections({ ... })
 *   .build({ ... });
 *
 * // Access saved views
 * const views = await cms.api.collections.adminSavedViews.find({
 *   where: { collectionName: "posts", userId: currentUser.id }
 * });
 * ```
 */
export const savedViewsCollection = q
  .collection("admin_saved_views")
  .fields({
    // User who owns this saved view
    userId: varchar("user_id", { length: 255 }).notNull(),

    // Target collection for this view
    collectionName: varchar("collection_name", { length: 255 }).notNull(),

    // Display name for the view
    name: varchar("name", { length: 255 }).notNull(),

    // View configuration (filters, sort, columns)
    configuration: jsonb("configuration").notNull().$type<ViewConfiguration>(),

    // Whether this is the default view for the user/collection
    isDefault: boolean("is_default").default(false).notNull(),
  })
  .options({
    timestamps: true,
  });
