/**
 * Admin Preferences Collections
 *
 * Provides backend storage for admin UI preferences including:
 * - Saved views (filters, columns, sorting configurations)
 * - User preferences (view state, column visibility, etc.)
 *
 * Note: Use `adminModule` from "@questpie/admin/server" which includes
 * these collections along with auth, assets, and setup functions.
 */

export {
  savedViewsCollection,
  type FilterOperator,
  type FilterRule,
  type SortConfig,
  type ViewConfiguration,
} from "./collections/saved-views.collection.js";

export { adminPreferencesCollection } from "./collections/admin-preferences.collection.js";
