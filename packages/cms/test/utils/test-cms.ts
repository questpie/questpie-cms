import { QCMS } from "../../src/server/config/cms";
import { createMockServices } from "./test-services";
import type {
	AnyCollectionOrBuilder,
	CMSConfig,
} from "../../src/server/config/types";
import { RealtimeService } from "../../src/server/integrated/realtime/service";

export const createTestCms = (
	collections: AnyCollectionOrBuilder[],
	db: any,
	services?: ReturnType<typeof createMockServices>,
	configOverrides?: Partial<CMSConfig<any, any, any>>,
) => {
	const mockServices = services ?? createMockServices();

	// Create minimal CMS config for testing
	// We need to provide minimal config to avoid initialization errors
	// but we'll override services with mocks after construction
	const cms = new QCMS({
		app: {
			url: "http://localhost:3000",
		},
		collections: [
			...collections,
			...(configOverrides?.collections || []),
		] as any,
		db: {
			connection: db.connectionString || "mock",
		},
		queue: {
			jobs: [],
			adapter: {
				_start: async () => {},
				_stop: async () => {},
				publish: async () => null,
				schedule: async () => {},
				unschedule: async () => {},
				work: async () => {},
				on: () => {},
				off: () => {},
			} as any,
		},
		// Skip auth initialization - will be mocked after construction
		storage: {
			default: "local",
			disks: {
				local: {
					driver: "local",
					config: {
						root: "/tmp/test-storage",
					},
				},
			},
		} as any,
		email: {
			from: "test@example.com",
			transport: {
				sendMail: async () => ({ messageId: "test" }),
			} as any,
		} as any,
		...configOverrides, // Apply overrides
	} as any);

	// Override services with mocks
	cms.queue = mockServices.queue as any;
	cms.storage = mockServices.storage as any;
	cms.email = mockServices.email as any;
	cms.logger = mockServices.logger as any;
	cms.auth = mockServices.auth as any;

	// Override db with test db
	cms.db = {
		client: db,
		drizzle: db,
	};

	if (cms.config.realtime) {
		cms.realtime = new RealtimeService(cms.db.drizzle, cms.config.realtime);
	}

	// Reinitialize migrations API and CRUD API with the correct db reference
	const { QCMSMigrationsAPI } = require("../../src/server/config/integrated/migrations-api");
	const { QCMSCrudAPI } = require("../../src/server/config/integrated/crud-api");
	cms.migrations = new QCMSMigrationsAPI(cms);
	cms.api = new QCMSCrudAPI(cms);

	// Add .crud() compatibility method for tests
	(cms as any).crud = (name: string) => {
		return (cms.api.collections as any)[name];
	};

	return cms;
};
