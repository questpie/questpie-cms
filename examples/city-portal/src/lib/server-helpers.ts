/**
 * Shared server-side helpers for data fetching
 */

import { cms } from "@/questpie/server/cms";

/**
 * Create CMS context for server-side data fetching
 */
export async function createServerContext() {
	return cms.createContext({
		accessMode: "system",
	});
}

export { cms };
