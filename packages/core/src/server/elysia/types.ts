import type { CMSConfig } from "#questpie/core/exports/server";

// Elysia adapter config is same as CMSConfig
// db can be provided in config or injected via Elysia context
export type ElysiaAdapterConfig<
	TCollections extends any[] = any[],
	TGlobals extends any[] = any[],
	TJobs extends any[] = any[]
> = CMSConfig<TCollections, TGlobals, TJobs>;