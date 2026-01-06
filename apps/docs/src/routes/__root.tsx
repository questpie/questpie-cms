import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type * as React from "react";
import appCss from "@/styles/app.css?url";
import { RootProvider } from "fumadocs-ui/provider/tanstack";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "QUESTPIE CMS - Headless CMS for Modern Web",
			},
			{
				name: "description",
				content:
					"A powerful, type-safe headless CMS built for developers. Flexible, modular, and framework-agnostic.",
			},
			{
				property: "og:title",
				content: "QUESTPIE CMS",
			},
			{
				property: "og:description",
				content: "A powerful, type-safe headless CMS built for developers",
			},
			{
				property: "og:type",
				content: "website",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/symbol/Q-symbol-dark-pink.svg",
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
