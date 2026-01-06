import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type * as React from "react";
import appCss from "@/styles/app.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import {
	generateMeta,
	generateLinks,
	generateJsonLd,
	siteConfig,
} from "@/lib/seo";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			...generateMeta(),
		],
		links: [...generateLinks({ cssUrl: appCss })],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(generateJsonLd()),
			},
		],
	}),
	component: RootComponent,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const umamiUrl = import.meta.env.VITE_UMAMI_URL;
	const umamiWebsiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

	return (
		<html suppressHydrationWarning>
			<head>
				<HeadContent />
				{umamiUrl && umamiWebsiteId && (
					<script defer src={umamiUrl} data-website-id={umamiWebsiteId} />
				)}
			</head>
			<body className="flex flex-col min-h-screen bg-grid-quest">
				<RootProvider>{children}</RootProvider>
				<Scripts />
			</body>
		</html>
	);
}
