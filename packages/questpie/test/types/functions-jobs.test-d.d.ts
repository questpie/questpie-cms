/**
 * Functions and Jobs Type Tests
 *
 * These tests verify that TypeScript correctly infers types for
 * RPC functions (q.fn) and background jobs (q.job).
 *
 * Run with: tsc --noEmit
 */
declare module "#questpie/server/config/app-context.js" {
    interface AppContext {
        app: any;
        session: {
            user: {
                id: string;
            };
        } | null;
        db: any;
    }
}
export {};
