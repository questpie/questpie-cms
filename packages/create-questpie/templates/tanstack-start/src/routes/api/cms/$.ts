import { withOpenApi } from "@questpie/openapi";
import { createFileRoute } from "@tanstack/react-router";
import { createFetchHandler } from "questpie";
import { appRpc, cms } from "@/questpie/server/app.js";

const handler = withOpenApi(
	createFetchHandler(cms, {
		basePath: "/api/cms",
		rpc: appRpc,
	}),
	{
		cms,
		rpc: appRpc,
		basePath: "/api/cms",
		info: {
			title: "{{projectName}} API",
			version: "1.0.0",
			description: "QUESTPIE CMS API",
		},
		scalar: { theme: "purple" },
	},
);

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
