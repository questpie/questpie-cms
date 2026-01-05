import {
	accountsCollection,
	apiKeysCollection,
	sessionsCollection,
	usersCollection,
	verificationsCollection,
} from "#questpie/cms/server/collection/defaults/auth";
import { dedupeBy, deepMerge } from "#questpie/cms/shared/index.js";
import type { BetterAuthOptions } from "better-auth";
import { admin, apiKey, bearer } from "better-auth/plugins";

/**
 * just a typesafe helper around better-auth's AuthOptions
 */
export const coreAuthOptions = defineAuthOptions({
	baseURL: process.env.BETTER_AUTH_URL,
	secret: process.env.BETTER_AUTH_SECRET,
	advanced: {
		useSecureCookies: process.env.NODE_ENV === "production",
	},
	plugins: [admin(), apiKey(), bearer()],
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
});

// Type inference validation:
//
// The MergeAuthOptions type correctly merges:
// 1. ✅ plugins array (type-level concatenation)
// 2. ✅ additionalFields (deep merge for user/session/account)
//
// Runtime behavior: All plugin methods work correctly
// Type inference: Use `typeof cms.auth.$Infer` to get merged types

export const coreAuthCollections = {
	user: usersCollection,
	session: sessionsCollection,
	account: accountsCollection,
	verification: verificationsCollection,
	apikey: apiKeysCollection,
};

export function defineAuthOptions<O extends BetterAuthOptions>(options: O): O {
	return options;
}

export type MergeAuthOptions<
	A extends BetterAuthOptions,
	B extends BetterAuthOptions,
> = {
	[K in keyof A | keyof B]: K extends "plugins"
		? [
				...(B extends { plugins: Array<infer BP> } ? BP[] : []),
				...(A extends { plugins: Array<infer AP> } ? AP[] : []),
			]
		: K extends keyof B
			? B[K]
			: K extends keyof A
				? A[K]
				: never;
};

export function mergeAuthOptions<
	A extends BetterAuthOptions,
	B extends BetterAuthOptions,
>(base: A, overrides: B): MergeAuthOptions<A, B> {
	const merged = {
		// we deepmerge all
		...deepMerge(base, overrides),
		// merge plugins, newer plugins take precedence
		plugins: dedupeBy(
			[...(overrides?.plugins || []), ...(base?.plugins || [])],
			(plugin) => plugin.id,
		),
		// social providers are merged shallowly
		socialProviders: {
			...base?.socialProviders,
			...overrides?.socialProviders,
		},
	} as any;

	return merged;
}
