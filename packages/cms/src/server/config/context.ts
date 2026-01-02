import { AsyncLocalStorage } from "node:async_hooks";
import type { User, Session } from "better-auth/types";
import type { AccessMode } from "./types";
import type { QCMS, QCMSBuilder } from "#questpie/cms/exports/server.js";

type CMSContextStore<TCMS = unknown> = {
	cms: TCMS;
	context: RequestContext;
};

const cmsContextStorage = new AsyncLocalStorage<CMSContextStore>();

/**
 * Minimal per-request context
 * Contains only what changes per request: user, locale, accessMode
 * Services are accessed via cms.* not context.*
 */
export interface RequestContext {
	/**
	 * Current authenticated user (from Better Auth)
	 */
	user?: User & { role?: string };

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

export function runWithCMSContext<TCMS, TResult>(
	cms: TCMS,
	context: RequestContext,
	fn: () => TResult | Promise<TResult>,
): TResult | Promise<TResult> {
	return cmsContextStorage.run({ cms, context }, fn);
}

export function getCMSFromContext<
	TCMS extends QCMS<any> | QCMSBuilder<any>,
>(): TCMS extends { $inferCms: infer U } ? U : TCMS {
	const store = cmsContextStorage.getStore();
	if (!store?.cms) {
		throw new Error(
			"QUESTPIE: CMS context is not available. Wrap your execution with runWithCMSContext().",
		);
	}
	return store.cms as TCMS extends { $inferCms: infer U } ? U : TCMS;
}

export function getRequestContext(): RequestContext | undefined {
	return cmsContextStorage.getStore()?.context;
}
