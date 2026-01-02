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
 * Hook to fetch collection list with filters, sorting, pagination
 */
export function useCollectionList<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(
	collection: K,
	options?: Parameters<QCMSClient<T>["collections"][K]["find"]>[0],
	queryOptions?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
): any {
	const { client, locale } = useAdminContext<T>();
	const localeKey = locale ?? "default";
	const keyPrefix = ["qcms", "locale", localeKey] as const;
	const queryOpts = createQCMSQueryOptions(client, { keyPrefix });

	return useQuery({
		...queryOpts.collections[collection as string].find(options),
		...queryOptions,
	});
}

/**
 * Hook to fetch single collection item
 */
export function useCollectionItem<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(
	collection: K,
	id: string,
	options?: Omit<
		Parameters<QCMSClient<T>["collections"][K]["findOne"]>[0],
		"where"
	>,
	queryOptions?: Omit<UseQueryOptions, "queryKey" | "queryFn">,
): any {
	const { client, locale } = useAdminContext<T>();
	const localeKey = locale ?? "default";
	const keyPrefix = ["qcms", "locale", localeKey] as const;
	const queryOpts = createQCMSQueryOptions(client, { keyPrefix });

	return useQuery({
		...queryOpts.collections[collection as string].findOne({
			where: { id },
			...options,
		} as any),
		...queryOptions,
	});
}

/**
 * Hook to create collection item
 */
export function useCollectionCreate<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(
	collection: K,
	mutationOptions?: UseMutationOptions<
		Awaited<ReturnType<QCMSClient<T>["collections"][K]["create"]>>,
		Error,
		Parameters<QCMSClient<T>["collections"][K]["create"]>[0]
	>,
): any {
	const { client, locale } = useAdminContext<T>();
	const queryClient = useQueryClient();
	const localeKey = locale ?? "default";
	const keyPrefix = ["qcms", "locale", localeKey] as const;
	const queryOpts = createQCMSQueryOptions(client, { keyPrefix });

	return useMutation({
		...queryOpts.collections[collection as string].create(),
		onSuccess: (...args) => {
			// Invalidate list queries
			queryClient.invalidateQueries({
				queryKey: [...keyPrefix, "collections", collection, "find"],
			});
			mutationOptions?.onSuccess?.(...args);
		},
		...mutationOptions,
	});
}

/**
 * Hook to update collection item
 */
export function useCollectionUpdate<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(
	collection: K,
	mutationOptions?: UseMutationOptions<
		Awaited<ReturnType<QCMSClient<T>["collections"][K]["update"]>>,
		Error,
		{ id: string; data: Parameters<QCMSClient<T>["collections"][K]["update"]>[1] }
	>,
): any {
	const { client, locale } = useAdminContext<T>();
	const queryClient = useQueryClient();
	const localeKey = locale ?? "default";
	const keyPrefix = ["qcms", "locale", localeKey] as const;
	const queryOpts = createQCMSQueryOptions(client, { keyPrefix });

	return useMutation({
		...queryOpts.collections[collection as string].update(),
		onSuccess: (data, variables, ...args) => {
			// Invalidate list and detail queries
			queryClient.invalidateQueries({
				queryKey: [...keyPrefix, "collections", collection],
			});
			mutationOptions?.onSuccess?.(data, variables, ...args);
		},
		...mutationOptions,
	});
}

/**
 * Hook to delete collection item
 */
export function useCollectionDelete<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(
	collection: K,
	mutationOptions?: UseMutationOptions<
		Awaited<ReturnType<QCMSClient<T>["collections"][K]["delete"]>>,
		Error,
		{ id: string }
	>,
): any {
	const { client, locale } = useAdminContext<T>();
	const queryClient = useQueryClient();
	const localeKey = locale ?? "default";
	const keyPrefix = ["qcms", "locale", localeKey] as const;
	const queryOpts = createQCMSQueryOptions(client, { keyPrefix });

	return useMutation({
		...queryOpts.collections[collection as string].delete(),
		onSuccess: (...args) => {
			// Invalidate list queries
			queryClient.invalidateQueries({
				queryKey: [...keyPrefix, "collections", collection],
			});
			mutationOptions?.onSuccess?.(...args);
		},
		...mutationOptions,
	});
}
