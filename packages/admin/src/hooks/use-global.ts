import {
	useQuery,
	useMutation,
	useQueryClient,
	type UseQueryOptions,
	type UseMutationOptions,
} from "@tanstack/react-query";
import type { QCMSClient } from "@questpie/cms/client";
import type { QCMS } from "@questpie/cms/server";
import { createQCMSQueryOptions } from "@questpie/tanstack-query";
import { useAdminContext } from "./admin-provider";

/**
 * Hook to fetch global settings
 */
export function useGlobal<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["globals"],
>(
	globalName: K,
	options?: Parameters<QCMSClient<T>["globals"][K]["get"]>[0],
	queryOptions?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
): any {
	const { client, locale } = useAdminContext<T>();
	const localeKey = locale ?? "default";
	const keyPrefix = ["qcms", "locale", localeKey] as const;
	const queryOpts = createQCMSQueryOptions(client, { keyPrefix });

	return useQuery({
		...queryOpts.globals[globalName as string].get(options),
		...queryOptions,
	});
}

/**
 * Hook to update global settings
 */
export function useGlobalUpdate<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["globals"],
>(
	globalName: K,
	mutationOptions?: UseMutationOptions<
		Awaited<ReturnType<QCMSClient<T>["globals"][K]["update"]>>,
		Error,
		{
			data: Parameters<QCMSClient<T>["globals"][K]["update"]>[0];
			options?: Parameters<QCMSClient<T>["globals"][K]["update"]>[1];
		}
	>,
): any {
	const { client, locale } = useAdminContext<T>();
	const queryClient = useQueryClient();
	const localeKey = locale ?? "default";
	const keyPrefix = ["qcms", "locale", localeKey] as const;
	const queryOpts = createQCMSQueryOptions(client, { keyPrefix });

	return useMutation({
		...queryOpts.globals[globalName as string].update(),
		onSuccess: (...args) => {
			// Invalidate global queries
			queryClient.invalidateQueries({
				queryKey: [...keyPrefix, "globals", globalName],
			});
			mutationOptions?.onSuccess?.(...args);
		},
		...mutationOptions,
	});
}
