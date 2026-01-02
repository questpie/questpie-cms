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

import { createAPIFileRoute } from "@tanstack/react-start/api";
import { questpieStartHandlers } from "@questpie/tanstack-start";
import { cms } from "~/server/cms";

export const APIRoute = createAPIFileRoute("/api/cms/$")({
	...questpieStartHandlers(cms, {
		basePath: "/api/cms",
	}),
});
