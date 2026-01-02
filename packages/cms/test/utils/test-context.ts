import type { CRUDContext } from "../../src/server/collection/crud/types";
import { MockKVAdapter } from "./mocks/kv.adapter";
import { MockLogger } from "./mocks/logger.adapter";
import { MockMailAdapter } from "./mocks/mailer.adapter";
import { MockQueueAdapter } from "./mocks/queue.adapter";

export const createTestContext = (
	overrides: Partial<CRUDContext> = {},
): CRUDContext => {
	return {
		locale: "en",
		defaultLocale: "en",
		accessMode: "user",
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
		...overrides,
	};
};
