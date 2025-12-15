import type { CollectionConfig } from "@qcms/core/types/collection";
import type { FieldConfig, GetFieldType } from "@qcms/core/types/fields";
import type { ReactNode } from "react";

export type FieldRenderProps<T> = {
  value: T;
  onChange: (value: T) => void;
  field: FieldConfig;
  error?: string;
};

export type FieldViewProps<T> = {
  value: T;
  field: FieldConfig;
};

export type ClientFieldConfig<T> = {
  /**
   * Custom component to render the input in the form
   */
  input?: (props: FieldRenderProps<T>) => ReactNode;
  
  /**
   * Custom component to render the value in the list/table view
   */
  cell?: (props: FieldViewProps<T>) => ReactNode;

  /**
   * Custom component to render the value in the detail view
   */
  view?: (props: FieldViewProps<T>) => ReactNode;
};

export type ClientCollectionConfig<T extends CollectionConfig> = {
  /**
   * Override how specific fields are rendered
   */
  fields?: {
    [K in keyof T['fields']]?: ClientFieldConfig<GetFieldType<T['fields'][K]>>;
  };

  /**
   * Custom views for the collection
   */
  views?: {
    /**
     * Override the entire list view
     */
    list?: () => ReactNode;
    
    /**
     * Override the entire detail/edit view
     */
    detail?: () => ReactNode;
  };
};

/**
 * Define client-side configuration for a collection (React components, Overrides)
 * 
 * @example
 * export const postsClient = defineClientCollection(posts, {
 *   fields: {
 *     title: {
 *       cell: ({ value }) => <strong>{value}</strong>
 *     }
 *   }
 * })
 */
export function defineClientCollection<T extends CollectionConfig>(
  _collection: T,
  config: ClientCollectionConfig<T>
): ClientCollectionConfig<T> {
  return config;
}
