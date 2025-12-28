import { CollectionBuilder } from '../collection/builder/collection-builder'
import { ModuleDefinition } from './types'

/**
 * Extracts all collections from a list of configured modules.
 * Use this to easily populate the `collections` array in createCMS.
 * 
 * @example
 * const cms = createCMS({
 *   collections: [
 *     users,
 *     ...collectModuleCollections([auth, stripe, blog])
 *   ]
 * })
 */
export function collectModuleCollections(
  modules: ModuleDefinition<any, any, any, any>[]
): CollectionBuilder<any>[] {
  return modules.flatMap(m => Object.values(m.collections || {}))
}

/**
 * Helper to find an extension for a specific collection in a module.
 * Returns the extension builder or undefined.
 */
export function getExtension(
  module: ModuleDefinition<any, any, any, any>,
  collectionName: string
): CollectionBuilder<any> | undefined {
  return module.extensions?.[collectionName]
}
