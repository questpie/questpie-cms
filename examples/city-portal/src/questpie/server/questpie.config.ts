/**
 * City Portal QUESTPIE Configuration
 *
 * Central configuration file using the config() / module() API.
 * Replaces builder.ts + app.ts + sidebar.ts + dashboard.ts.
 */

import { admin, audit } from "@questpie/admin/server";
import { ConsoleAdapter, config, pgBossAdapter, SmtpAdapter } from "questpie";

const DATABASE_URL =
	process.env.DATABASE_URL || "postgres://localhost/cityportal";

export default config({
	modules: [
		admin({
			branding: {
				name: "City Portal",
			},
			adminLocale: {
				locales: ["en"],
				defaultLocale: "en",
			},
			sidebar: ({ s, c }) =>
				s.sidebar({
					sections: [
						s.section({
							id: "overview",
							title: "Overview",
							items: [
								{
									type: "link",
									label: "Dashboard",
									href: "/admin",
									icon: c.icon("ph:house"),
								},
								{ type: "global", global: "siteSettings" },
							],
						}),
						s.section({
							id: "content",
							title: "Content",
							items: [
								{ type: "collection", collection: "pages" },
								{ type: "collection", collection: "news" },
								{ type: "collection", collection: "announcements" },
							],
						}),
						s.section({
							id: "resources",
							title: "Resources",
							items: [
								{ type: "collection", collection: "documents" },
								{ type: "collection", collection: "contacts" },
							],
						}),
						s.section({
							id: "engagement",
							title: "Engagement",
							items: [{ type: "collection", collection: "submissions" }],
						}),
						s.section({
							id: "administration",
							title: "Administration",
							items: [
								{ type: "collection", collection: "cities" },
								{ type: "collection", collection: "cityMembers" },
							],
						}),
						s.section({
							id: "external",
							title: "External",
							items: [
								{
									type: "link",
									label: "View Website",
									href: "/",
									external: true,
									icon: c.icon("ph:arrow-square-out"),
								},
							],
						}),
					],
				}),
			dashboard: ({ d, c, a }) =>
				d.dashboard({
					title: "City Portal Dashboard",
					description: "Content management overview for your city portal",
					actions: [
						a.create({
							id: "new-page",
							collection: "pages",
							label: "New Page",
							icon: c.icon("ph:article"),
							variant: "primary",
						}),
						a.create({
							id: "new-article",
							collection: "news",
							label: "New Article",
							icon: c.icon("ph:newspaper"),
							variant: "outline",
						}),
						a.global({
							id: "edit-site-settings",
							global: "siteSettings",
							label: "Site Settings",
							icon: c.icon("ph:gear"),
							variant: "outline",
						}),
					],
					columns: 4,
					items: [
						{
							type: "section",
							label: "Content Overview",
							layout: "grid",
							columns: 4,
							items: [
								{
									id: "published-pages",
									type: "stats",
									collection: "pages",
									label: "Published Pages",
									filter: { isPublished: true },
									span: 1,
								},
								{
									id: "published-news",
									type: "stats",
									collection: "news",
									label: "News Articles",
									filter: { isPublished: true },
									span: 1,
								},
								{
									id: "active-announcements",
									type: "stats",
									collection: "announcements",
									label: "Announcements",
									span: 1,
								},
								{
									id: "new-submissions",
									type: "stats",
									collection: "submissions",
									label: "New Submissions",
									filter: { status: "new" },
									span: 1,
								},
							],
						},
						{
							type: "section",
							label: "Recent Activity",
							layout: "grid",
							columns: 4,
							items: [
								{
									id: "recent-submissions",
									type: "recentItems",
									collection: "submissions",
									label: "Recent Submissions",
									dateField: "createdAt",
									limit: 6,
									span: 2,
								},
								{
									id: "recent-news",
									type: "recentItems",
									collection: "news",
									label: "Latest News",
									dateField: "publishedAt",
									limit: 6,
									span: 2,
								},
							],
						},
					],
				}),
		}),
		audit(),
	],

	app: {
		url: process.env.APP_URL || "http://localhost:3001",
	},
	db: {
		url: DATABASE_URL,
	},
	storage: {
		basePath: "/api",
	},
	secret: process.env.BETTER_AUTH_SECRET || "demo-secret-change-in-production",

	locale: {
		locales: [
			{
				code: "en",
				label: "English",
				fallback: true,
				flagCountryCode: "gb",
			},
		],
		defaultLocale: "en",
	},

	// Multi-tenant context: extract cityId from request header
	contextResolver: async ({ request }) => {
		const cityId = request.headers.get("x-selected-city");
		return {
			cityId: cityId || null,
		};
	},

	email: {
		adapter:
			process.env.MAIL_ADAPTER === "console"
				? new ConsoleAdapter({ logHtml: false })
				: new SmtpAdapter({
						transport: {
							host: process.env.SMTP_HOST || "localhost",
							port: Number.parseInt(process.env.SMTP_PORT || "1025", 10),
							secure: false,
						},
					}),
	},

	queue: {
		adapter: pgBossAdapter({ connectionString: DATABASE_URL }),
	},

	cli: {
		migrations: { directory: "./src/migrations" },
	},
});
