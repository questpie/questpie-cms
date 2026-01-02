import {
	type QCMSBuilder,
	type QCMSRuntimeConfig,
	QCMS,
} from "#questpie/cms/exports/server.js";
import type { DriveManager } from "flydrive";
import { MockKVAdapter } from "./kv.adapter";
import { MockLogger } from "./logger.adapter";
import { MockMailAdapter } from "./mailer.adapter";
import { MockQueueAdapter } from "./queue.adapter";
import { createTestDb } from "../test-db";

export type MockCMS<TCms = any> = TCms & {
	/**
	 * Mock adapters for inspecting test state
	 */
	mocks: {
		kv: MockKVAdapter;
		queue: MockQueueAdapter;
		mailer: MockMailAdapter;
		logger: MockLogger;
		fakes: ReturnType<DriveManager<any>["fake"]>;
	};
};

/**
 * Builds a fully type-safe mock CMS instance from a QCMS builder for testing
 *
 * @example
 * ```ts
 * // Define test module with collections
 * const testModule = defineQCMS({ name: 'test' })
 *   .collections({
 *     products: productsCollection,
 *     categories: categoriesCollection,
 *   })
 *   .jobs({
 *     sendEmail: sendEmailJob,
 *   });
 *
 * // Create test database
 * const db = await createTestDb();
 *
 * // Build mock CMS
 * const cms = buildMockCMS(testModule, {
 *   db: { pglite: db },
 *   app: { url: 'http://localhost:3000' },
 *   secret: 'test-secret',
 * });
 *
 * await runTestDbMigrations(cms);
 *
 * // Use CMS normally
 * await cms.api.collections.products.create({ ... }, context);
 *
 * // Inspect mock state
 * expect(cms.mocks.logger.hasErrors()).toBe(false);
 * expect(cms.mocks.queue.getJobs()).toHaveLength(1);
 * expect(cms.mocks.mailer.getSentCount()).toBe(1);
 * ```
 */
export async function buildMockCMS<TBuilder extends QCMSBuilder<any>>(
	builder: TBuilder,
	runtimeOverrides: Partial<QCMSRuntimeConfig> = {},
): Promise<{
	cleanup: () => Promise<void>;
	cms: MockCMS<TBuilder["$inferCms"]>;
}> {
	const mailerAdapter = new MockMailAdapter();
	const queueAdapter = new MockQueueAdapter();
	const kvAdapter = new MockKVAdapter();
	const logger = new MockLogger();

	const usesCustomDb = Boolean(runtimeOverrides.db);
	const testDb = usesCustomDb ? null : await createTestDb();
	const dbConfig = runtimeOverrides.db ?? { pglite: testDb };

	// Build CMS using builder pattern
	const cms = builder.build({
		app: runtimeOverrides.app ?? { url: "http://localhost:3000" },
		db: dbConfig,
		storage: runtimeOverrides.storage,
		email: {
			...(runtimeOverrides.email ?? {}),
			adapter: mailerAdapter,
		},
		kv: {
			...(runtimeOverrides.kv ?? {}),
			adapter: kvAdapter,
		},
		queue: {
			...(runtimeOverrides.queue ?? {}),
			adapter: queueAdapter,
		},
		logger: {
			...(runtimeOverrides.logger ?? {}),
			adapter: logger,
		},
		search: runtimeOverrides.search,
		realtime: runtimeOverrides.realtime,
		secret: runtimeOverrides.secret,
		migrations: runtimeOverrides.migrations,
	} as QCMSRuntimeConfig);

	// Attach mock adapters for easy access in tests
	const mockCMS = cms as MockCMS<TBuilder["$inferCms"]>;
	mockCMS.mocks = {
		kv: kvAdapter,
		queue: queueAdapter,
		mailer: mailerAdapter,
		logger: logger,
		fakes: cms.storage.fake(QCMS.__internal.storageDriverServiceName),
	};

	const cleanup = async () => {
		if (testDb) {
			await testDb.close();
		}
		mockCMS.storage.restore(QCMS.__internal.storageDriverServiceName);
	};

	return { cleanup, cms: mockCMS };
}
