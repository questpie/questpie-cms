import { ModuleDefinition } from './types'

/**
 * Defines a reusable QUESTPIE module.
 * This function is purely for type inference and structural validation.
 * 
 * @example
 * const authModule = defineModule({
 *   name: 'auth',
 *   collections: { sessions },
 *   extensions: { users: authUserExtension }
 * })
 */
export function defineModule<
  TName extends string,
  TCollections extends Record<string, any>,
  TExtensions extends Record<string, any>,
  TConfig extends Record<string, any> = {}
>(
  definition: ModuleDefinition<TName, TCollections, TExtensions, TConfig>
): ModuleDefinition<TName, TCollections, TExtensions, TConfig> {
  return definition
}

/**
 * Creates an instance of a module with specific configuration.
 * This is what users call in their `cms.config.ts`.
 */
export function configureModule<
  TDef extends ModuleDefinition<any, any, any, any>
>(
  module: TDef,
  config?: TDef extends ModuleDefinition<any, any, any, infer C> 
    ? (keyof C extends never ? never : C) 
    : never
) {
  return {
    ...module,
    config: config || {}
  }
}
