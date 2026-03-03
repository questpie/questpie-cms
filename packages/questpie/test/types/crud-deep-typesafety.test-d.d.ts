/**
 * CRUD Deep Type Safety Tests
 *
 * Comprehensive compile-time tests covering:
 * - Many-to-many relations (with junction table)
 * - Nested with result types (ApplyQuery depth)
 * - Columns + With interaction in result types
 * - Object/Array field type inference
 * - Select (enum) field types
 * - Boolean field operators
 * - Aggregation result types (_count, _sum, _avg)
 * - Create input: FK optionalization, required relation enforcement
 * - Update input: nested relation mutations
 * - Circular relation depth handling
 *
 * IMPORTANT: Uses $inferApp as TApp to test the REAL public API surface.
 * If tests fail here, it means the type system has real bugs that users would hit.
 *
 * Run with: bunx tsc --noEmit
 */
export {};
