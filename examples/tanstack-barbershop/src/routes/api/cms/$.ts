/**
 * CMS API Routes - Catch-all handler
 *
 * Handles all CMS endpoints:
 * - /api/cms/collections/*
 * - /api/cms/globals/*
 * - /api/cms/auth/*
 * - /api/cms/storage/*
 * - /api/cms/stream (SSE)
 */

import { createFileRoute } from "@tanstack/react-router";
import { createFetchHandler } from "questpie";
import { cms } from "~/questpie/server/cms";

const handler = createFetchHandler(cms, {
	basePath: "/api/cms",
});
export const Route = createFileRoute("/api/cms/$")({
	server: {
		handlers: {
			GET: async ({ request }) => handler(request),
			POST: async ({ request }) => handler(request),
			PUT: async ({ request }) => handler(request),
			DELETE: async ({ request }) => handler(request),
			PATCH: async ({ request }) => handler(request),
		},
	},
});
