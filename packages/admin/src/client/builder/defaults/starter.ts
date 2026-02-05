/**
 * Admin Module (Client)
 *
 * "Batteries included" module that extends coreAdminModule with:
 * - User collection admin UI
 * - Auth pages (login, forgot-password, reset-password, setup)
 * - User management in sidebar
 *
 * This is the frontend counterpart to `adminModule` from `@questpie/admin/server`.
 *
 * @example
 * ```ts
 * import { qa, adminModule } from "@questpie/admin/client";
 *
 * const admin = qa()
 *   .use(adminModule)
 *   .collections({
 *     posts: postsAdmin,
 *   });
 * ```
 */

import type { ComponentReference } from "#questpie/admin/server";
import { qa } from "../qa";
import { assetsCollectionAdmin } from "./collections/assets";
import { userCollectionAdmin } from "./collections/user";
import { coreAdminModule } from "./core";

/**
 * Admin Module - the complete frontend config for QuestPie admin panel.
 *
 * Includes:
 * - All fields, views, and pages from coreAdminModule
 * - User collection admin UI
 * - Administration sidebar section with user management
 *
 * @example
 * ```ts
 * // Basic usage
 * import { qa, adminModule } from "@questpie/admin/client";
 *
 * const admin = qa()
 *   .use(adminModule)
 *   .collections({
 *     posts: postsAdmin,
 *   });
 * ```
 */
export const adminModule = coreAdminModule
	// Add built-in collection admin configs
	.collections({
		user: userCollectionAdmin,
		assets: assetsCollectionAdmin,
	})
	// Add administration sidebar section
	.sidebar(
		qa.sidebar().section("administration", (s) =>
			s.title({ key: "defaults.sidebar.administration" }).items([
				{
					type: "collection",
					collection: "user",
					icon: {
						type: "icon",
						props: { name: "ph:users" },
					} satisfies ComponentReference,
				},
				{
					type: "collection",
					collection: "assets",
					icon: {
						type: "icon",
						props: { name: "ph:image" },
					} satisfies ComponentReference,
				},
			]),
		),
	);

/**
 * Type of admin module state
 */
export type AdminModule = typeof adminModule;
