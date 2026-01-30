export * from "./collection-meta.js";
export * from "./constants.js";
export * from "./i18n/index.js";
export * from "./type-utils.js";
export * from "./utils/index.js";

export const sharedHelper = () => {
	return "Shared helper function";
};

// Config types (needed for type exports from client)
export type { KVConfig } from "#questpie/server/integrated/kv/types.js";
export type { LoggerConfig } from "#questpie/server/integrated/logger/types.js";
