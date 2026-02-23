/**
 * Barbershop QUESTPIE Configuration
 *
 * Central configuration file using the new config() / module() API.
 * Replaces builder.ts + app.ts + sidebar.ts + dashboard.ts.
 */

import {
	admin,
	audit,
	createAuditDashboardWidget,
} from "@questpie/admin/server";
import { ConsoleAdapter, config, pgBossAdapter, SmtpAdapter } from "questpie";
import getRevenueStats from "@/questpie/server/functions/get-revenue-stats";
import { messages } from "@/questpie/server/i18n";
import { migrations } from "../../migrations";

const DATABASE_URL =
	process.env.DATABASE_URL || "postgres://localhost/barbershop";

export default config({
	modules: [
		admin({
			branding: {
				name: { en: "Barbershop Control", sk: "Riadenie barbershopu" },
			},
			adminLocale: {
				locales: ["en", "sk"],
				defaultLocale: "en",
			},
			sidebar: ({ s, c }) =>
				s.sidebar({
					sections: [
						s.section({
							id: "overview",
							title: { en: "Overview", sk: "Prehľad" },
							items: [
								{
									type: "link",
									label: { en: "Dashboard", sk: "Dashboard" },
									href: "/admin",
									icon: c.icon("ph:house"),
								},
								{ type: "global", global: "siteSettings" },
							],
						}),
						s.section({
							id: "operations",
							title: { en: "Operations", sk: "Prevádzka" },
							items: [
								{ type: "collection", collection: "appointments" },
								{ type: "collection", collection: "reviews" },
							],
						}),
						s.section({
							id: "content",
							title: { en: "Content", sk: "Obsah" },
							items: [
								{ type: "collection", collection: "pages" },
								{ type: "collection", collection: "services" },
							],
						}),
						s.section({
							id: "team",
							title: { en: "Team", sk: "Tím" },
							items: [{ type: "collection", collection: "barbers" }],
						}),
						s.section({
							id: "external",
							title: { en: "External", sk: "Externé" },
							items: [
								{
									type: "link",
									label: { en: "Open Website", sk: "Otvoriť web" },
									href: "/",
									external: true,
									icon: c.icon("ph:arrow-square-out"),
								},
							],
						}),
						s.section({
							id: "administration",
							title: { en: "Administration", sk: "Administrácia" },
							items: [
								{ type: "collection", collection: "user" },
								{ type: "collection", collection: "adminAuditLog" },
							],
						}),
					],
				}),
			dashboard: ({ d, c, a }) =>
				d.dashboard({
					title: { en: "Barbershop Control", sk: "Riadenie barbershopu" },
					description: {
						en: "Live operations, content, and business performance overview",
						sk: "Prehľad prevádzky, obsahu a výkonu podniku v reálnom čase",
					},
					actions: [
						a.create({
							id: "new-appointment",
							collection: "appointments",
							label: {
								en: "New Appointment",
								sk: "Nová rezervácia",
							},
							icon: c.icon("ph:calendar-plus"),
							variant: "primary",
						}),
						a.create({
							id: "add-barber",
							collection: "barbers",
							label: { en: "Add Barber", sk: "Pridať holiča" },
							icon: c.icon("ph:user-plus"),
							variant: "outline",
						}),
						a.global({
							id: "edit-site-settings",
							global: "siteSettings",
							label: {
								en: "Edit Site Settings",
								sk: "Upraviť nastavenia webu",
							},
							icon: c.icon("ph:gear-six"),
							variant: "outline",
						}),
					],
					columns: 4,
					realtime: false,
					items: [
						{
							type: "section",
							label: { en: "Today", sk: "Dnes" },
							layout: "grid",
							columns: 4,
							items: [
								{
									id: "appointments-today",
									type: "stats",
									collection: "appointments",
									label: {
										en: "Today's Appointments",
										sk: "Dnešné rezervácie",
									},
									filter: {
										scheduledAt: {
											gte: new Date(
												new Date().setHours(0, 0, 0, 0),
											).toISOString(),
											lt: new Date(
												new Date().setHours(23, 59, 59, 999),
											).toISOString(),
										},
									},
									span: 1,
								},
								{
									id: "pending-appointments",
									type: "stats",
									collection: "appointments",
									label: { en: "Pending", sk: "Čakajúce" },
									filter: { status: "pending" },
									span: 1,
								},
								{
									id: "active-barbers",
									type: "stats",
									collection: "barbers",
									label: { en: "Active Barbers", sk: "Aktívni holiči" },
									filter: { isActive: true },
									span: 1,
								},
								{
									id: "published-pages",
									type: "stats",
									collection: "pages",
									label: {
										en: "Published Pages",
										sk: "Publikované stránky",
									},
									filter: { isPublished: true },
									span: 1,
								},
							],
						},
						{
							type: "section",
							label: { en: "Business", sk: "Biznis" },
							layout: "grid",
							columns: 4,
							items: [
								{
									id: "monthly-revenue",
									type: "value",
									span: 2,
									refreshInterval: 1000 * 60 * 5,
									loader: async ({ app }: any) => {
										const now = new Date();
										const currentStart = new Date(
											now.getFullYear(),
											now.getMonth(),
											1,
										).toISOString();
										const currentEnd = now.toISOString();
										const previousStart = new Date(
											now.getFullYear(),
											now.getMonth() - 1,
											1,
										).toISOString();
										const previousEnd = new Date(
											now.getFullYear(),
											now.getMonth(),
											0,
											23,
											59,
											59,
											999,
										).toISOString();

										const [currentStats, previousStats] = await Promise.all([
											getRevenueStats.handler({
												input: {
													startDate: currentStart,
													endDate: currentEnd,
													completedOnly: true,
												},
												app,
											} as any),
											getRevenueStats.handler({
												input: {
													startDate: previousStart,
													endDate: previousEnd,
													completedOnly: true,
												},
												app,
											} as any),
										]);

										const change =
											previousStats.totalRevenue === 0
												? currentStats.totalRevenue > 0
													? 100
													: 0
												: Math.round(
														((currentStats.totalRevenue -
															previousStats.totalRevenue) /
															previousStats.totalRevenue) *
															100,
													);

										const revenue = currentStats.totalRevenue / 100;

										return {
											value: revenue,
											formatted: `${revenue.toLocaleString()} €`,
											label: {
												en: "Monthly Revenue",
												sk: "Mesačné tržby",
											},
											subtitle: {
												en: `${currentStats.appointmentCount} completed appointments`,
												sk: `${currentStats.appointmentCount} dokončených rezervácií`,
											},
											trend: {
												value: `${change >= 0 ? "+" : ""}${change}%`,
											},
										};
									},
								},
								{
									id: "revenue-goal",
									type: "progress",
									span: 1,
									showPercentage: true,
									label: { en: "Monthly Goal", sk: "Mesačný cieľ" },
									loader: async ({ app }: any) => {
										const now = new Date();
										const currentStart = new Date(
											now.getFullYear(),
											now.getMonth(),
											1,
										).toISOString();
										const stats = await getRevenueStats.handler({
											input: {
												startDate: currentStart,
												endDate: now.toISOString(),
												completedOnly: true,
											},
											app,
										} as any);
										const target = 500000;

										return {
											current: stats.totalRevenue,
											target,
											label: `${(stats.totalRevenue / 100).toLocaleString()} € / ${(target / 100).toLocaleString()} €`,
											subtitle:
												stats.totalRevenue >= target
													? "Goal reached"
													: `${((target - stats.totalRevenue) / 100).toLocaleString()} € to go`,
										};
									},
								},
								{
									id: "appointments-by-status",
									type: "chart",
									collection: "appointments",
									field: "status",
									chartType: "pie",
									label: {
										en: "Appointments by Status",
										sk: "Rezervácie podľa stavu",
									},
									span: 1,
								},
							],
						},
						{
							type: "section",
							label: { en: "Operations", sk: "Prevádzka" },
							layout: "grid",
							columns: 4,
							items: [
								{
									id: "recent-appointments",
									type: "recentItems",
									collection: "appointments",
									label: {
										en: "Recent Appointments",
										sk: "Posledné rezervácie",
									},
									limit: 6,
									dateField: "scheduledAt",
									span: 2,
								},
								{
									id: "activity-stream",
									type: "timeline",
									label: { en: "Activity", sk: "Aktivita" },
									maxItems: 8,
									showTimestamps: true,
									timestampFormat: "relative",
									loader: async ({ app }: any) => {
										const res = await app.api.collections.appointments.find({
											limit: 8,
											orderBy: { updatedAt: "desc" },
										});

										return res.docs.map((apt: any) => ({
											id: apt.id,
											title: apt.displayTitle || apt.id,
											description: `Status: ${apt.status}`,
											timestamp: apt.updatedAt || apt.createdAt,
											variant:
												apt.status === "completed"
													? "success"
													: apt.status === "cancelled" ||
															apt.status === "no-show"
														? "error"
														: apt.status === "confirmed"
															? "info"
															: "warning",
											href: `/admin/collections/appointments/${apt.id}`,
										}));
									},
									span: 2,
								},
								createAuditDashboardWidget({ maxItems: 10 }),
							],
						},
					],
				}),
		}),
		audit(),
	],

	app: {
		url: process.env.APP_URL || "http://localhost:3000",
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
				flagCountryCode: "us",
			},
			{ code: "sk", label: "Slovenčina" },
		],
		defaultLocale: "en",
	},

	translations: {
		messages: messages as Record<string, Record<string, string>>,
	},

	migrations: migrations,

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

	queue: { adapter: pgBossAdapter({ connectionString: DATABASE_URL }) },

	cli: {
		migrations: { directory: "./src/migrations" },
		seeds: { directory: "./src/seeds" },
	},
});
