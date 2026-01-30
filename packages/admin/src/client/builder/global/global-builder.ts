/**
 * Global Builder
 *
 * For configuring UI for a backend global.
 * Single generic TState pattern with ~adminApp for type safety.
 */

import type { I18nText } from "../../i18n/types.js";
import type { AdminBuilder } from "../admin-builder";
import type {
	ExtractBlocks,
	ExtractEditViews,
	ExtractFields,
} from "../admin-types";
import {
	createFieldProxy,
	createFieldRegistryProxy,
	createViewRegistryProxy,
	type FieldProxy,
	type FieldRegistryProxy,
	type ViewRegistryProxy,
} from "../proxies";
import type { IconComponent } from "../types/common";
import type { GlobalBuilderState } from "./types";

/**
 * Helper to get fields from AdminApp
 */
type AdminAppFields<TAdminApp> =
	ExtractFields<TAdminApp> extends Record<string, any>
		? ExtractFields<TAdminApp>
		: {};

/**
 * Helper to get edit views from AdminApp
 */
type AdminAppEditViews<TAdminApp> =
	ExtractEditViews<TAdminApp> extends Record<string, any>
		? ExtractEditViews<TAdminApp>
		: {};

/**
 * Helper to get blocks from AdminApp
 */
type AdminAppBlocks<TAdminApp> =
	ExtractBlocks<TAdminApp> extends Record<string, any>
		? ExtractBlocks<TAdminApp>
		: {};

export class GlobalBuilder<TState extends GlobalBuilderState> {
	constructor(public readonly state: TState) {}

	/**
	 * Merge admin module into state
	 */
	use<TAdminApp extends AdminBuilder<any>>(
		adminApp: TAdminApp,
	): GlobalBuilder<Omit<TState, "~adminApp"> & { "~adminApp": TAdminApp }> {
		return new GlobalBuilder({
			...this.state,
			"~adminApp": adminApp,
		} as any);
	}

	/**
	 * Set global metadata
	 */
	meta(meta: {
		label?: I18nText;
		icon?: IconComponent;
		description?: I18nText;
	}): GlobalBuilder<TState> {
		return new GlobalBuilder({
			...this.state,
			...meta,
		} as any);
	}

	/**
	 * Configure fields: ({ r }) => ({ ... })
	 * r = field registry proxy (TState["~adminApp"]["fields"] with blocks)
	 */
	fields<TNewFields extends Record<string, any>>(
		callback: (ctx: {
			r: FieldRegistryProxy<
				AdminAppFields<TState["~adminApp"]>,
				AdminAppBlocks<TState["~adminApp"]>
			>;
		}) => TNewFields,
	): GlobalBuilder<Omit<TState, "fields"> & { fields: TNewFields }> {
		const adminApp = this.state["~adminApp"];
		const adminFields =
			adminApp && "state" in adminApp
				? (adminApp as any).state?.fields || {}
				: {};

		const r = createFieldRegistryProxy(adminFields);
		const newFields = callback({ r } as any);

		return new GlobalBuilder({
			...this.state,
			fields: newFields,
		} as any);
	}

	/**
	 * Configure form: ({ v, f }) => v.form({ ... })
	 * v = view registry proxy (TState["~adminApp"]["editViews"])
	 * f = field proxy (TState["fields"])
	 */
	form(
		callback: (ctx: {
			v: ViewRegistryProxy<AdminAppEditViews<TState["~adminApp"]>>;
			f: TState["fields"] extends Record<string, any>
				? FieldProxy<TState["fields"]>
				: Record<string, never>;
		}) => any,
	): GlobalBuilder<TState> {
		const adminApp = this.state["~adminApp"];
		const editViews =
			adminApp && "state" in adminApp
				? (adminApp as any).state?.editViews || {}
				: {};

		const v = createViewRegistryProxy(editViews);
		const f = this.state.fields
			? createFieldProxy(this.state.fields)
			: ({} as any);

		const config = callback({ v, f } as any);

		return new GlobalBuilder({
			...this.state,
			form: config,
		} as any);
	}
}
