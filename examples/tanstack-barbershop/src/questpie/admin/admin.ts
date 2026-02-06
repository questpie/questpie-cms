import { qa } from "@questpie/admin/client";
import type { AppCMS } from "../server/cms";
import { builder } from "./builder";

function getMonthRange(offsetMonths = 0): {
	startDate: string;
	endDate: string;
} {
	const now = new Date();
	const startDate = new Date(
		now.getFullYear(),
		now.getMonth() + offsetMonths,
		1,
		0,
		0,
		0,
		0,
	);

	const endDate =
		offsetMonths === 0
			? now
			: new Date(
					now.getFullYear(),
					now.getMonth() + offsetMonths + 1,
					0,
					23,
					59,
					59,
					999,
				);

	return {
		startDate: startDate.toISOString(),
		endDate: endDate.toISOString(),
	};
}

function getStatusVariant(
	status: string,
): "default" | "info" | "success" | "warning" | "error" {
	switch (status) {
		case "completed":
			return "success";
		case "cancelled":
		case "no-show":
			return "error";
		case "confirmed":
			return "info";
		default:
			return "warning";
	}
}

// ============================================================================
// Admin UI Configuration
// ============================================================================

/**
 * Admin configuration for the barbershop app.
 *
 * IMPORTANT: Translations are now configured on the SERVER via:
 * - .adminLocale({ locales: ["en", "sk"], defaultLocale: "en" })
 * - .messages({ en: {...}, sk: {...} })
 *
 * The client fetches translations from the server via getAdminTranslations() RPC.
 * This enables single source of truth for all translations.
 *
 * To enable server-side translations in AdminProvider, set useServerTranslations={true}
 *
 * @example
 * ```tsx
 * <AdminProvider
 *   admin={admin}
 *   client={client}
 *   useServerTranslations  // Fetch translations from server
 * >
 *   {children}
 * </AdminProvider>
 * ```
 */
export const admin = builder
	// Client-side locale config (for backwards compatibility)
	// When using useServerTranslations, the server's adminLocale config takes precedence
	.locale({
		default: "en",
		supported: ["en", "sk"],
	})
	.sidebar(
		qa
			.sidebar<AppCMS>()
			.section("overview", (s) =>
				s
					.title({ en: "Overview", sk: "Prehľad" })
					.link({ en: "Dashboard", sk: "Dashboard" }, "/admin")
					.global("siteSettings", {
						label: { en: "Site Settings", sk: "Nastavenia webu" },
					}),
			)
			.section("operations", (s) =>
				s
					.title({ en: "Operations", sk: "Prevádzka" })
					.collection("appointments", {
						label: { en: "Appointments", sk: "Rezervácie" },
					})
					.collection("reviews", {
						label: { en: "Reviews", sk: "Recenzie" },
					}),
			)
			.section("content", (s) =>
				s
					.title({ en: "Content", sk: "Obsah" })
					.collection("pages", {
						label: { en: "Pages", sk: "Stránky" },
					})
					.collection("services", {
						label: { en: "Services", sk: "Služby" },
					}),
			)
			.section("team", (s) =>
				s
					.title({ en: "Team", sk: "Tím" })
					.collection("barbers", {
						label: { en: "Barbers", sk: "Holiči" },
					})
					.collection("barberServices", {
						label: { en: "Barber Services", sk: "Služby holičov" },
					}),
			)
			.section("external", (s) =>
				s
					.title({ en: "External", sk: "Externé" })
					.link({ en: "Open Website", sk: "Otvoriť web" }, "/", {
						external: true,
					}),
			),
	)
	.dashboard(
		qa.dashboard({
			title: { en: "Barbershop Control", sk: "Riadenie barbershopu" },
			description: {
				en: "Live operations, content, and business performance overview",
				sk: "Prehľad prevádzky, obsahu a výkonu podniku v reálnom čase",
			},
			columns: 4,
			realtime: true,
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
							label: { en: "Today's Appointments", sk: "Dnešné rezervácie" },
							dateFilter: { field: "scheduledAt", range: "today" },
							variant: "primary",
							span: 1,
						},
						{
							id: "pending-appointments",
							type: "stats",
							collection: "appointments",
							label: { en: "Pending", sk: "Čakajúce" },
							filter: { status: "pending" },
							variant: "warning",
							span: 1,
						},
						{
							id: "active-barbers",
							type: "stats",
							collection: "barbers",
							label: { en: "Active Barbers", sk: "Aktívni holiči" },
							filter: { isActive: true },
							variant: "success",
							span: 1,
						},
						{
							id: "published-pages",
							type: "stats",
							collection: "pages",
							label: { en: "Published Pages", sk: "Publikované stránky" },
							filter: { isPublished: true },
							variant: "default",
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
							cardVariant: "featured",
							refreshInterval: 1000 * 60 * 5,
							fetchFn: async (client: any) => {
								const current = getMonthRange(0);
								const previous = getMonthRange(-1);

								const [currentStats, previousStats] = await Promise.all([
									client.rpc.getRevenueStats({
										startDate: current.startDate,
										endDate: current.endDate,
										completedOnly: true,
									}),
									client.rpc.getRevenueStats({
										startDate: previous.startDate,
										endDate: previous.endDate,
										completedOnly: true,
									}),
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
							title: { en: "Monthly Goal", sk: "Mesačný cieľ" },
							fetchFn: async (client: any) => {
								const current = getMonthRange(0);
								const stats = await client.rpc.getRevenueStats({
									startDate: current.startDate,
									endDate: current.endDate,
									completedOnly: true,
								});
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
							label: { en: "Recent Appointments", sk: "Posledné rezervácie" },
							limit: 6,
							dateField: "scheduledAt",
							subtitleFields: ["status"],
							span: 2,
						},
						{
							id: "activity-stream",
							type: "timeline",
							title: { en: "Activity", sk: "Aktivita" },
							maxItems: 8,
							showTimestamps: true,
							timestampFormat: "relative",
							fetchFn: async (client: any) => {
								const res = await client.collections.appointments.find({
									limit: 8,
									orderBy: { updatedAt: "desc" },
								});

								return res.docs.map((apt: any) => ({
									id: apt.id,
									title: apt.displayTitle || apt.id,
									description: `Status: ${apt.status}`,
									timestamp: apt.updatedAt || apt.createdAt,
									variant: getStatusVariant(String(apt.status)),
									href: `/admin/collections/appointments/${apt.id}`,
								}));
							},
							span: 1,
						},
						{
							id: "quick-actions",
							type: "quickActions",
							title: { en: "Quick Actions", sk: "Rýchle akcie" },
							layout: "list",
							quickActions: [
								{
									label: {
										en: "New Appointment",
										sk: "Nová rezervácia",
									},
									href: "/admin/collections/appointments/create",
									variant: "primary",
								},
								{
									label: { en: "Add Barber", sk: "Pridať holiča" },
									href: "/admin/collections/barbers/create",
								},
								{
									label: {
										en: "Edit Site Settings",
										sk: "Upraviť nastavenia webu",
									},
									href: "/admin/globals/siteSettings",
									variant: "outline",
								},
							],
							span: 1,
						},
					],
				},
			],
		}),
	)
	// Branding
	.branding({
		name: { en: "Barbershop Control", sk: "Riadenie barbershopu" },
		logo: undefined, // TODO: Add logo component
	});

export type AdminConfig = typeof admin;
