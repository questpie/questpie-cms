import type { QCMS } from "@questpie/cms/server";
import qs from "qs";

/**
 * Client configuration
 */
export type QCMSClientConfig = {
	/**
	 * Base URL of the CMS API
	 * @example 'http://localhost:3000'
	 */
	baseURL: string;

	/**
	 * Custom fetch implementation
	 * @default globalThis.fetch
	 */
	fetch?: typeof fetch;

	/**
	 * Base path for API routes
	 * @default '/api'
	 */
	basePath?: string;

	/**
	 * Default headers to include in all requests
	 */
	headers?: Record<string, string>;
};

/**
 * Collection API response
 */
type CollectionFindOptions = {
	limit?: number;
	offset?: number;
	where?: any;
	orderBy?: any;
	with?: any;
};

/**
 * Extract collection names from QCMS type
 */
type CollectionNames<T> = T extends QCMS<infer TCollections, any, any>
	? TCollections[number] extends { name: infer Name }
		? Name extends string
			? Name
			: never
		: never
	: never;

/**
 * Collections API proxy
 */
type CollectionsAPI<T> = {
	[K in CollectionNames<T>]: {
		find: (options?: CollectionFindOptions) => Promise<any[]>;
		findOne: (options: { where: any; with?: any }) => Promise<any | null>;
		create: (data: any) => Promise<any>;
		update: (id: string, data: any) => Promise<any>;
		delete: (id: string) => Promise<{ success: boolean }>;
	};
};

/**
 * QCMS Client
 */
export type QCMSClient<T = any> = {
	collections: CollectionsAPI<T>;
};

/**
 * Create type-safe QUESTPIE CMS client
 *
 * @example
 * ```ts
 * import { createQCMSClient } from '@questpie/client'
 * import type { cms } from './server'
 *
 * const client = createQCMSClient<typeof cms>({
 *   baseURL: 'http://localhost:3000'
 * })
 *
 * // Type-safe collections
 * const posts = await client.collections.posts.find({ limit: 10 })
 *
 * // Type-safe functions
 * const result = await client.functions.addToCart({ productId: '123' })
 * ```
 */
export function createQCMSClient<T = any>(config: QCMSClientConfig): QCMSClient<T> {
	const fetcher = config.fetch || globalThis.fetch;
	const basePath = config.basePath || "/api";
	const defaultHeaders = config.headers || {};

	/**
	 * Make a request to the CMS API
	 */
	async function request(path: string, options: RequestInit = {}): Promise<any> {
		const url = `${config.baseURL}${path}`;
		const headers = {
			"Content-Type": "application/json",
			...defaultHeaders,
			...options.headers,
		};

		const response = await fetcher(url, {
			...options,
			headers,
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: response.statusText }));
			throw new Error(error.error || `Request failed: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Collections API
	 */
	const collections = new Proxy({} as CollectionsAPI<T>, {
		get(_, collectionName: string) {
			return {
				find: async (options: CollectionFindOptions = {}) => {
					// Use qs for cleaner query strings with nested objects
					const queryString = qs.stringify(options, {
						skipNulls: true,
						arrayFormat: "brackets",
					});

					const path = `${basePath}/cms/${collectionName}${queryString ? `?${queryString}` : ""}`;

					return request(path);
				},

				findOne: async (options: { where: any; with?: any }) => {
					const where = options.where;
					if (!where.id) {
						throw new Error("findOne requires where.id");
					}

					// Use qs for query string
					const queryString = qs.stringify(
						{ with: options.with },
						{
							skipNulls: true,
							arrayFormat: "brackets",
						},
					);

					const path = `${basePath}/cms/${collectionName}/${where.id}${queryString ? `?${queryString}` : ""}`;

					return request(path);
				},

				create: async (data: any) => {
					return request(`${basePath}/cms/${collectionName}`, {
						method: "POST",
						body: JSON.stringify(data),
					});
				},

				update: async (id: string, data: any) => {
					return request(`${basePath}/cms/${collectionName}/${id}`, {
						method: "PATCH",
						body: JSON.stringify(data),
					});
				},

				delete: async (id: string) => {
					return request(`${basePath}/cms/${collectionName}/${id}`, {
						method: "DELETE",
					});
				},
			};
		},
	});

	return {
		collections,
	};
}
