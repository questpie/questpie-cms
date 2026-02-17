/**
 * Extension interface for QuestpieBuilder.
 *
 * Packages can augment this interface to add methods to QuestpieBuilder
 * without causing type explosion.
 *
 * @example
 * ```typescript
 * // In your package's augmentation file:
 * declare module "questpie" {
 *   interface QuestpieBuilderExtensions {
 *     dashboard(config: DashboardConfig): this;
 *     sidebar(config: SidebarConfig): this;
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: This is an extension point for module augmentation
export interface QuestpieBuilderExtensions {}

/**
 * Extract the state type from a QuestpieBuilder instance.
 * Used for lazy type extraction in extension methods.
 */
export type QuestpieStateOf<T> = T extends { state: infer S } ? S : never;
