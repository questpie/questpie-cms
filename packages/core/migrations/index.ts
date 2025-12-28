import type { Migration } from "@questpie/core/server";
import { testMig20251226001404 } from "./20251226001404_test_mig";

export const migrations: Migration[] = [
	testMig20251226001404,
];
