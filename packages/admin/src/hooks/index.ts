/**
 * React hooks for admin package
 */

// Provider and context
export { AdminProvider, useAdminContext } from "./admin-provider";
export type { AdminProviderProps, AdminContext } from "./admin-provider";

// TanStack DB Collection hooks (recommended - offline-first, realtime)
export {
	useCollection,
	useCollectionItemById,
	useCollectionInsert,
	useCollectionUpdate,
	useCollectionDelete,
} from "./use-collection-db";

// Legacy TanStack Query hooks (for backward compatibility)
export {
	useCollectionList,
	useCollectionItem,
	useCollectionCreate,
	useCollectionUpdate as useCollectionUpdateMutation,
	useCollectionDelete as useCollectionDeleteMutation,
} from "./use-collection";

// Global hooks
export { useGlobal, useGlobalUpdate } from "./use-global";
