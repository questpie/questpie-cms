import { useMemo } from "react";
import type { Collection } from "@tanstack/db";
import type { QCMSClient } from "@questpie/cms/client";
import type { QCMS } from "@questpie/cms/server";
import { createQCMSDBHelpers } from "@questpie/tanstack-query/db";
import { useAdminContext } from "./admin-provider";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Collection item type helper
 */
type CollectionItem<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
> = Awaited<
	ReturnType<QCMSClient<T>["collections"][K]["find"]>
> extends { docs: Array<infer TItem> }
	? TItem
	: never;

/**
 * Hook to get TanStack DB Collection for a CMS collection
 * Provides offline-first, realtime-synced collection with optimistic updates
 *
 * @example
 * ```tsx
 * function PostsList() {
 *   const posts = useCollection('posts', {
 *     baseFindOptions: { where: { published: { eq: true } } },
 *     realtime: true, // Enable realtime sync
 *   })
 *
 *   return (
 *     <div>
 *       {posts.items.map(post => (
 *         <div key={post.id}>{post.title}</div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCollection<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(
	collectionName: K,
	options?: {
		/**
		 * Base query options (filters, sorting, relations)
		 */
		baseFindOptions?: Parameters<QCMSClient<T>["collections"][K]["find"]>[0];
		/**
		 * Enable realtime sync via SSE
		 */
		realtime?: boolean | {
			enabled?: boolean;
			baseURL?: string;
			basePath?: string;
		};
		/**
		 * Custom key extractor (defaults to 'id')
		 */
		getKey?: (item: CollectionItem<T, K>) => string | number;
	},
): Collection<CollectionItem<T, K>, string | number> {
	const { client, locale } = useAdminContext<T>();
	const queryClient = useQueryClient();
	const localeKey = locale ?? "default";

	const collection = useMemo(() => {
		const dbHelpers = createQCMSDBHelpers(client, {
			keyPrefix: ["qcms", "locale", localeKey],
		});
		const collectionHelper = dbHelpers.collections[collectionName as string];

		if (!collectionHelper) {
			throw new Error(`Collection "${String(collectionName)}" not found in CMS`);
		}

		return collectionHelper.createCollection({
			queryClient,
			getKey: options?.getKey ?? ((item: any) => item.id),
			baseFindOptions: options?.baseFindOptions,
			realtime: options?.realtime ?? false,
		} as any);
	}, [
		client,
		queryClient,
		collectionName,
		localeKey,
		options?.baseFindOptions,
		options?.realtime,
		options?.getKey,
	]);

	return collection as Collection<CollectionItem<T, K>, string | number>;
}

/**
 * Hook to get a single item from collection by ID
 * Uses TanStack DB Collection for offline-first access
 *
 * @example
 * ```tsx
 * function PostDetail({ id }: { id: string }) {
 *   const posts = useCollection('posts')
 *   const post = useCollectionItemById(posts, id)
 *
 *   if (!post) return <div>Loading...</div>
 *
 *   return <div>{post.title}</div>
 * }
 * ```
 */
export function useCollectionItemById<TItem extends { id: string | number }>(
	collection: Collection<TItem, string | number>,
	id: string | number,
): TItem | undefined {
	return collection.items.find((item) => collection.getKey(item) === id);
}

/**
 * Hook to create item in collection
 * Uses TanStack DB Collection with optimistic updates
 *
 * @example
 * ```tsx
 * function CreatePost() {
 *   const posts = useCollection('posts')
 *
 *   const handleCreate = async () => {
 *     await posts.insert({
 *       title: 'New Post',
 *       content: 'Hello World'
 *     })
 *   }
 *
 *   return <button onClick={handleCreate}>Create Post</button>
 * }
 * ```
 */
export function useCollectionInsert<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(collectionName: K): any {
	const collection = useCollection<T, K>(collectionName);
	return collection.insert.bind(collection);
}

/**
 * Hook to update item in collection
 * Uses TanStack DB Collection with optimistic updates
 *
 * @example
 * ```tsx
 * function EditPost({ id }: { id: string }) {
 *   const posts = useCollection('posts')
 *   const post = useCollectionItemById(posts, id)
 *
 *   const handleUpdate = async () => {
 *     await posts.update(id, {
 *       title: 'Updated Title'
 *     })
 *   }
 *
 *   return <button onClick={handleUpdate}>Update</button>
 * }
 * ```
 */
export function useCollectionUpdate<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(collectionName: K): any {
	const collection = useCollection<T, K>(collectionName);
	return collection.update.bind(collection);
}

/**
 * Hook to delete item from collection
 * Uses TanStack DB Collection with optimistic updates
 *
 * @example
 * ```tsx
 * function DeletePost({ id }: { id: string }) {
 *   const posts = useCollection('posts')
 *
 *   const handleDelete = async () => {
 *     await posts.delete(id)
 *   }
 *
 *   return <button onClick={handleDelete}>Delete</button>
 * }
 * ```
 */
export function useCollectionDelete<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>(collectionName: K): any {
	const collection = useCollection<T, K>(collectionName);
	return collection.delete.bind(collection);
}
