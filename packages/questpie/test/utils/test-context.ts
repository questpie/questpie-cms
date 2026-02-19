import type { CRUDContext } from "../../src/server/collection/crud/types";
import { MockKVAdapter } from "./mocks/kv.adapter";
import { MockLogger } from "./mocks/logger.adapter";
import { MockMailAdapter } from "./mocks/mailer.adapter";
import { MockQueueAdapter } from "./mocks/queue.adapter";

/**
 * Create a mock user object with all required Better Auth fields
 */
export const createMockUser = (
	overrides: { id?: string; role?: string; email?: string; name?: string } = {},
) => ({
	id: overrides.id ?? crypto.randomUUID(),
	email: overrides.email ?? "test@example.com",
	emailVerified: true,
	name: overrides.name ?? "Test User",
	createdAt: new Date(),
	updatedAt: new Date(),
	role: overrides.role,
});

/**
 * Create a mock session object with user and session data (Better Auth format)
 */
export const createMockSession = (
	overrides: { id?: string; role?: string; email?: string; name?: string } = {},
) => ({
	user: createMockUser(overrides),
	session: {
		id: crypto.randomUUID(),
		userId: overrides.id ?? crypto.randomUUID(),
		token: crypto.randomUUID(),
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
		createdAt: new Date(),
		updatedAt: new Date(),
	},
});

export const createTestContext = (
	overrides: Partial<CRUDContext> & { role?: string } = {},
): CRUDContext => {
	const { role, session, accessMode, ...rest } = overrides;

	// If session is explicitly set (even to undefined/null), use it
	// Otherwise create a mock session if role is provided
	const resolvedSession =
		"session" in overrides
			? session
			: role
				? createMockSession({ role })
				: undefined;

	// If no role provided and no explicit accessMode, use "system" mode to bypass access control
	// This allows tests to run without authentication when not testing access control explicitly
	const resolvedAccessMode = accessMode ?? (role ? "user" : "system");

	return {
		locale: "en",
		defaultLocale: "en",
		accessMode: resolvedAccessMode,
		kv: new MockKVAdapter() as any,
		queue: new MockQueueAdapter() as any,
		email: new MockMailAdapter() as any,
		logger: new MockLogger() as any,
		storage: {
			disk: () => ({
				put: async () => {},
				get: async () => null,
				delete: async () => {},
				exists: async () => false,
				getUrl: async () => "",
			}),
		} as any,
		auth: {} as any,
		session: resolvedSession,
		...rest,
	};
};
