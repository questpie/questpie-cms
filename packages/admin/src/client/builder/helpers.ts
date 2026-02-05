/**
 * Typed Helpers Factory
 *
 * Creates type-safe helpers for working with admin config.
 * Simplifies complex generics in components and hooks.
 */

import type { AdminBuilder } from "./admin-builder";

/**
 * TODO: check if this may cause infinite types if used in collection itself
 * Create typed helpers from admin config
 *
 * @example
 * ```typescript
 * import { admin } from './admin';
 * import { createAdminHelpers } from '@questpie/admin/builder';
 *
 * export const h = createAdminHelpers<typeof admin>();
 * h.collection('posts'); // 'posts'
 * h.global('siteSettings'); // 'siteSettings'
 *
 */
export function createAdminHelpers<TAdmin extends AdminBuilder<any>>() {
	type TApp = TAdmin["state"]["~app"];
	type TCollections = keyof TAdmin["state"]["collections"];
	type TGlobals = keyof TAdmin["state"]["globals"];

	return {
		collection(name: TCollections) {
			return name;
		},

		global(name: TGlobals) {
			return name;
		},
	};
}

/**
 * Type of helpers created by createAdminHelpers
 */
export type AdminHelpers<TAdmin extends AdminBuilder<any>> = ReturnType<
	typeof createAdminHelpers<TAdmin>
>;
