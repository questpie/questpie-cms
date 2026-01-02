import {
	type QCMSBuilderState,
	type QCMSBuilder,
	type CMSConfig,
	defineQCMS,
	type AnyCollectionOrBuilder,
	QCMS,
} from "#questpie/cms/exports/server.js";
import { MockKVAdapter } from "./mocks/kv.adapter";
import { MockLogger } from "./mocks/logger.adapter";
import { MockMailAdapter } from "./mocks/mailer.adapter";
import { MockQueueAdapter } from "./mocks/queue.adapter";

export function createMockCms<TOtherState extends QCMSBuilderState>(
	builder: QCMSBuilder<TOtherState>,
) {
	return defineQCMS({
		name: "Test CMS",
	}).use(builder);
}

export function createTestCms<
	const TCollections extends
		AnyCollectionOrBuilder[] = AnyCollectionOrBuilder[],
>(
	collections: TCollections[],
	db: any,
	services?: Partial<{
		kv: MockKVAdapter;
		queue: MockQueueAdapter;
		mailer: MockMailAdapter;
		logger: MockLogger;
	}>,
	configOverrides?: Partial<CMSConfig<any, any, any>>,
) {
	const mockServices = {
		kv: services?.kv ?? new MockKVAdapter(),
		queue: services?.queue ?? new MockQueueAdapter(),
		mailer: services?.mailer ?? new MockMailAdapter(),
		logger: services?.logger ?? new MockLogger(),
	};

	const collectionsList = [
		...collections,
		...(configOverrides?.collections || []),
	] as any;

	const queueConfig = configOverrides?.queue
		? {
				jobs: configOverrides.queue.jobs ?? [],
				adapter: configOverrides.queue.adapter ?? mockServices.queue,
			}
		: undefined;

	return new QCMS({
		app: {
			url: "http://localhost:3000",
		},
		collections: collectionsList,
		globals: configOverrides?.globals as any,
		locale: configOverrides?.locale,
		db: {
			pglite: db,
		},
		storage: configOverrides?.storage,
		email: {
			...(configOverrides?.email ?? {}),
			adapter: configOverrides?.email?.adapter ?? mockServices.mailer,
		} as any,
		queue: queueConfig,
		logger: configOverrides?.logger ?? { adapter: mockServices.logger },
		kv: configOverrides?.kv ?? { adapter: mockServices.kv },
		auth: configOverrides?.auth,
		secret: configOverrides?.secret,
		search: configOverrides?.search,
		realtime: configOverrides?.realtime,
		migrations: configOverrides?.migrations,
	} as any);
}
