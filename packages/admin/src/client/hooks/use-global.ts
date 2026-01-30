import { createQuestpieQueryOptions } from "@questpie/tanstack-query";
import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { Questpie } from "questpie";
import type { QuestpieClient } from "questpie/client";
import type { RegisteredCMS, RegisteredGlobalNames } from "../builder/registry";
import { selectClient, selectContentLocale, useAdminStore } from "../runtime";

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Resolved CMS type (Questpie<any> if not registered)
 */
type ResolvedCMS =
	RegisteredCMS extends Questpie<any> ? RegisteredCMS : Questpie<any>;

/**
 * Resolved global names (string if not registered)
 */
type ResolvedGlobalNames =
	RegisteredCMS extends Questpie<any> ? RegisteredGlobalNames : string;

// ============================================================================
// Global Hooks
// ============================================================================

/**
 * Hook to fetch global settings
 *
 * Uses RegisteredCMS from module augmentation for automatic type inference.
 *
 * @example
 * ```tsx
 * // Types inferred from module augmentation!
 * const { data } = useGlobal("siteSettings");
 * ```
 */
export function useGlobal<K extends ResolvedGlobalNames>(
	globalName: K,
	options?: any,
	queryOptions?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
): any {
	const client = useAdminStore(selectClient);
	const contentLocale = useAdminStore(selectContentLocale);
	const keyPrefix = ["questpie", "globals"] as const;
	const queryOpts = createQuestpieQueryOptions(
		client as any,
		{
			keyPrefix,
			locale: contentLocale,
		} as any,
	);

	return useQuery({
		...(queryOpts as any).globals[globalName as string].get({
			...options,
			locale: contentLocale,
		} as any),
		...queryOptions,
	});
}

/**
 * Hook to update global settings
 *
 * Uses RegisteredCMS from module augmentation for automatic type inference.
 *
 * @example
 * ```tsx
 * // Types inferred from module augmentation!
 * const { mutate } = useGlobalUpdate("siteSettings");
 * mutate({ data: { siteName: "New Name" } });
 * ```
 */
export function useGlobalUpdate<K extends ResolvedGlobalNames>(
	globalName: K,
	mutationOptions?: Omit<UseMutationOptions, "mutationFn">,
): any {
	const client = useAdminStore(selectClient);
	const contentLocale = useAdminStore(selectContentLocale);
	const queryClient = useQueryClient();
	const keyPrefix = ["questpie", "globals"] as const;
	const queryOpts = createQuestpieQueryOptions(
		client as any,
		{
			keyPrefix,
			locale: contentLocale,
		} as any,
	);

	const globalQueryKey = queryOpts.key([
		"globals",
		globalName as string,
		"get",
		contentLocale,
	]);

	return useMutation({
		...(queryOpts as any).globals[globalName as string].update(),
		onSuccess: (data: any, variables: any, context: any) => {
			queryClient.invalidateQueries({
				queryKey: globalQueryKey,
			});
			(mutationOptions?.onSuccess as any)?.(data, variables, context);
		},
		onSettled: (data: any, error: any, variables: any, context: any) => {
			queryClient.invalidateQueries({
				queryKey: globalQueryKey,
			});
			(mutationOptions?.onSettled as any)?.(data, error, variables, context);
		},
		...mutationOptions,
	} as any);
}
