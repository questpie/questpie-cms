import type { CRUDContext } from "../../src/server/collection/crud/types";
import { createMockServices } from "./test-services";

export const createTestContext = (
	overrides: Partial<CRUDContext> = {},
): CRUDContext => {
	const services = createMockServices();

	return {
		locale: "en",
		defaultLocale: "en",
		accessMode: "user",
		...services,
		...overrides,
	};
};
