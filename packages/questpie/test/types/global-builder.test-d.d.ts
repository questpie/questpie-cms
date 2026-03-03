/**
 * Global Builder Type Tests
 *
 * These tests verify that TypeScript correctly infers types for global
 * (singleton) collections. Globals follow similar patterns to collections
 * but without pagination.
 *
 * Run with: tsc --noEmit
 */
declare module "#questpie/server/config/app-context.js" {
    interface AppContext {
        session: {
            user: {
                id: string;
            };
        } | null;
        db: any;
    }
}
export {};
