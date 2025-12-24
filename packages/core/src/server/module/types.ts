import { CollectionBuilder } from '../collection/builder/collection-builder'

export type ModuleConfig = Record<string, any>

export type ModuleDefinition<
  TName extends string,
  TCollections extends Record<string, CollectionBuilder<any>> = Record<string, CollectionBuilder<any>>,
  TExtensions extends Record<string, CollectionBuilder<any>> = Record<string, CollectionBuilder<any>>,
  TConfig extends ModuleConfig = ModuleConfig
> = {
  name: TName
  
  /**
   * Configuration schema validation (optional)
   * Can be a Zod schema or validation function
   */
  configSchema?: (config: any) => TConfig

  /**
   * Collections defined by this module
   */
  collections?: TCollections

  /**
   * Extensions to existing collections (Merge Pattern)
   * Keys must match the name of the collection being extended
   */
  extensions?: TExtensions

  /**
   * Lifecycle hook: Called when CMS is starting
   */
  setup?: (ctx: { config: TConfig }) => void | Promise<void>
}

/**
 * Helper type to extract config type from module definition
 */
export type InferModuleConfig<T> = T extends ModuleDefinition<any, any, any, infer C> ? C : never
