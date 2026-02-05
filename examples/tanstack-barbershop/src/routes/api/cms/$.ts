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
import { appRpc, cms } from "~/questpie/server/cms";

const handler = createFetchHandler(cms, {
	basePath: "/api/cms",
	rpc: appRpc,
});

const handleCmsRequest = async (request: Request) => {
	const response = await handler(request);
	return (
		response ??
		new Response(JSON.stringify({ error: "Not found" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		})
	);
};

export const Route = createFileRoute("/api/cms/$")({
	server: {
		handlers: {
			GET: ({ request }) => handleCmsRequest(request),
			POST: ({ request }) => handleCmsRequest(request),
			PUT: ({ request }) => handleCmsRequest(request),
			DELETE: ({ request }) => handleCmsRequest(request),
			PATCH: ({ request }) => handleCmsRequest(request),
		},
	},
});
