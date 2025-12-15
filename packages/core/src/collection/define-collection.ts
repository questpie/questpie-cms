import type { CollectionConfig } from "../types/collection";
import type { FieldsRecord } from "../types/fields";

/**
 * Define a collection with shared configuration
 * This can be used on both client and server
 *
 * @example
 * export const articlesCollection = defineCollection({
 *   name: 'articles',
 *   label: 'Articles',
 *   fields: {
 *     title: { type: 'text', label: 'Title', required: true },
 *     content: { type: 'richText', label: 'Content' },
 *   },
 *   $server: {
 *     hooks: { ... }
 *   }
 * })
 */
export function defineCollection<
	TName extends string,
	TFields extends FieldsRecord,
>(config: CollectionConfig<TName, TFields>): CollectionConfig<TName, TFields> {
	return config;
}
