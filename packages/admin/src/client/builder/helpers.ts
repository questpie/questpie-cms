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

    /**
     * Navigation helpers
     *
     * TODO: We want to use aliases to build type-safe paths
     */
    // route: {
    // 	dashboard: () => {
    // 		console.warn("navigate.dashboard() not implemented");
    // 	},
    // 	collection: (name: TCollections) => {
    // 		console.warn(`navigate.collection("${String(name)}") not implemented`);
    // 	},
    // 	collectionCreate: (name: TCollections) => {
    // 		console.warn(
    // 			`navigate.collectionCreate("${String(name)}") not implemented`,
    // 		);
    // 	},
    // 	collectionEdit: (name: TCollections, id: string) => {
    // 		console.warn(
    // 			`navigate.collectionEdit("${String(name)}", "${id}") not implemented`,
    // 		);
    // 	},
    // 	global: (name: TGlobals) => {
    // 		console.warn(`navigate.global("${String(name)}") not implemented`);
    // 	},
    // },
  };
}

/**
 * Type of helpers created by createAdminHelpers
 */
export type AdminHelpers<TAdmin extends AdminBuilder<any>> = ReturnType<
  typeof createAdminHelpers<TAdmin>
>;
