/**
 * Type-safe check for nullish values (null or undefined)
 */
export function isNullish(value: unknown): value is null | undefined {
    return value === null || value === undefined
}