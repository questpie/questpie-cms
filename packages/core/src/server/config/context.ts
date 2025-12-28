import type { User, Session } from "better-auth/types";
import type { AccessMode } from "./types";

/**
 * Minimal per-request context
 * Contains only what changes per request: user, locale, accessMode
 * Services are accessed via cms.* not context.*
 */
export interface RequestContext {
	/**
	 * Current authenticated user (from Better Auth)
	 */
	user?: User;

	/**
	 * Current request session
	 */
	session?: Session;

	/**
	 * Current locale for this request
	 */
	locale?: string;

	/**
	 * Default locale (fallback)
	 */
	defaultLocale?: string;

	/**
	 * Access mode - defaults to 'system' since CMS API is backend-only
	 * Set to 'user' explicitly when handling user requests with access control
	 */
	accessMode?: AccessMode;

	/**
	 * Optional database override (for transactions)
	 */
	db?: any;

	/**
	 * Allow extensions
	 */
	[key: string]: any;
}
