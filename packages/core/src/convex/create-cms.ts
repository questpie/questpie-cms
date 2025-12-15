import { generateCrud } from "../crud/crud";
import type { QcmsServerConfig } from "../types/config";

/**
 * Creates the backend actions (queries and mutations) for the CMS.
 * This aggregates Core modules (CRUD) and future modules (Auth, Storage, etc).
 * 
 * @example
 * // convex/cms.ts
 * import { createCMSActions } from "@qcms/core/convex";
 * import config from "../qcms.config";
 * 
 * export default createCMSActions(config);
 */
export function createCMSActions<TConfig extends QcmsServerConfig>(config: TConfig) {
	// Generate CRUD operations for defined collections
	const crud = generateCrud(config);

	// In the future, we can merge other modules here:
	// const auth = createAuthActions(config);
	// const storage = createStorageActions(config);

	return {
		...crud,
		// ...auth,
		// ...storage
	};
}
