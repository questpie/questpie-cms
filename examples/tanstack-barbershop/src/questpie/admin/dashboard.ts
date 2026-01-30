/**
 * Dashboard Configuration
 *
 * Beautiful dashboard layout using sections, tabs, and multiple widget types.
 */

import {
	ArrowDownIcon,
	ArrowUpIcon,
	CalendarCheckIcon,
	CalendarIcon,
	ChartLineUpIcon,
	ClockIcon,
	CurrencyEurIcon,
	ListChecksIcon,
	RocketLaunchIcon,
	ScissorsIcon,
	StarIcon,
	TrendUpIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import type { DashboardConfig } from "@questpie/admin/client";
import { qa } from "@questpie/admin/client";
import { client } from "@/lib/cms-client";

// ============================================================================
// Helpers
// ============================================================================

const getMonthRange = (offset = 0) => {
	const now = new Date();
	const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
	const end = new Date(
		now.getFullYear(),
		now.getMonth() + offset + 1,
		0,
		23,
		59,
		59,
	);
	return { start, end };
};

// ============================================================================
// Dashboard Configuration
// ============================================================================

export const dashboard = qa.dashboard({
	title: { en: "Dashboard", sk: "Prehľad" },
	description: {
		en: "Key metrics and quick access to important actions",
		sk: "Kľúčové metriky a rýchly prístup k dôležitým akciám",
	},
	columns: 4,
	items: [
		// ========================================================================
		// KEY METRICS SECTION - Featured cards at top
		// ========================================================================
		{
			type: "section",
			label: { en: "Key Metrics", sk: "Kľúčové metriky" },
			wrapper: "flat",
			layout: "grid",
			columns: 4,
			items: [
				// Monthly Revenue - Featured
				{
					id: "monthly-revenue",
					type: "value",
					span: 2,
					cardVariant: "featured",
					fetchFn: async () => {
						const current = getMonthRange(0);
						const previous = getMonthRange(-1);

						const [currentStats, previousStats] = await Promise.all([
							client.functions.getRevenueStats({
								startDate: current.start.toISOString(),
								endDate: current.end.toISOString(),
								completedOnly: true,
							}),
							client.functions.getRevenueStats({
								startDate: previous.start.toISOString(),
								endDate: previous.end.toISOString(),
								completedOnly: true,
							}),
						]);

						const change =
							previousStats.totalRevenue > 0
								? ((currentStats.totalRevenue - previousStats.totalRevenue) /
										previousStats.totalRevenue) *
									100
								: 0;
						const isPositive = change >= 0;

						return {
							value: currentStats.totalRevenue / 100,
							formatted: `${(currentStats.totalRevenue / 100).toLocaleString("sk-SK")} €`,
							label: { en: "Monthly Revenue", sk: "Mesačné tržby" },
							subtitle: {
								en: `${currentStats.appointmentCount} completed appointments`,
								sk: `${currentStats.appointmentCount} dokončených rezervácií`,
							},
							footer: { en: "vs. last month", sk: "vs. minulý mesiac" },
							icon: CurrencyEurIcon,
							trend: {
								value: `${isPositive ? "+" : ""}${change.toFixed(1)}%`,
								icon: isPositive ? ArrowUpIcon : ArrowDownIcon,
							},
							classNames: {
								root: isPositive
									? "border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5"
									: "border-red-500/30 bg-gradient-to-br from-red-500/10 to-orange-500/5",
								icon: isPositive ? "text-green-600" : "text-red-600",
								value: isPositive
									? "text-green-600 text-3xl"
									: "text-red-600 text-3xl",
								trend: isPositive
									? "text-green-600 font-medium"
									: "text-red-600 font-medium",
								trendIcon: isPositive ? "text-green-500" : "text-red-500",
							},
						};
					},
				},

				// Pending Appointments - Urgent indicator
				{
					id: "pending-urgent",
					type: "value",
					span: 1,
					fetchFn: async () => {
						const count = await client.collections.appointments.count({
							where: { status: "pending" },
						});

						const isUrgent = count > 5;
						const isWarning = count > 2;

						return {
							value: count,
							label: { en: "Pending", sk: "Čakajúce" },
							subtitle: isUrgent
								? { en: "Needs attention!", sk: "Vyžaduje pozornosť!" }
								: { en: "to confirm", sk: "na potvrdenie" },
							icon: ClockIcon,
							classNames: {
								root: isUrgent
									? "border-red-500/30 bg-red-500/10"
									: isWarning
										? "border-yellow-500/30 bg-yellow-500/10"
										: "",
								icon: isUrgent
									? "text-red-500 animate-pulse"
									: isWarning
										? "text-yellow-500"
										: "text-muted-foreground",
								value: isUrgent
									? "text-red-600 text-3xl font-black"
									: isWarning
										? "text-yellow-600 text-2xl"
										: "text-2xl",
								subtitle: isUrgent
									? "text-red-600 font-medium"
									: "text-muted-foreground",
							},
						};
					},
				},

				// Average Rating
				{
					id: "avg-rating",
					type: "value",
					span: 1,
					fetchFn: async () => {
						const reviews = await client.collections.reviews.find({
							limit: 1000,
						});
						const docs = reviews.docs ?? [];

						if (docs.length === 0) {
							return {
								value: "-",
								label: { en: "Rating", sk: "Hodnotenie" },
								subtitle: { en: "no reviews yet", sk: "žiadne recenzie" },
								icon: StarIcon,
							};
						}

						const avgRating =
							docs.reduce((sum: number, r: any) => sum + (r.rating ?? 0), 0) /
							docs.length;
						const isGood = avgRating >= 4;

						return {
							value: avgRating.toFixed(1),
							formatted: `${avgRating.toFixed(1)}/5`,
							label: { en: "Rating", sk: "Hodnotenie" },
							subtitle: {
								en: `from ${docs.length} reviews`,
								sk: `z ${docs.length} recenzií`,
							},
							icon: StarIcon,
							classNames: {
								root: isGood
									? "bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/30"
									: "",
								icon: "text-amber-500",
								value: isGood ? "text-amber-600 text-3xl" : "text-2xl",
							},
						};
					},
				},
			],
		},

		// ========================================================================
		// MAIN CONTENT - Tabs for different views
		// ========================================================================
		{
			type: "tabs",
			variant: "line",
			defaultTab: "overview",
			tabs: [
				// ==================================================================
				// OVERVIEW TAB
				// ==================================================================
				{
					id: "overview",
					label: { en: "Overview", sk: "Prehľad" },
					icon: ListChecksIcon,
					items: [
						// Stats row
						{
							type: "section",
							wrapper: "flat",
							layout: "grid",
							columns: 4,
							items: [
								{
									id: "barbers-count",
									type: "stats",
									collection: "barbers",
									label: { en: "Barbers", sk: "Holiči" },
									icon: ScissorsIcon,
									variant: "primary",
									span: 1,
								},
								{
									id: "services-count",
									type: "stats",
									collection: "services",
									label: { en: "Services", sk: "Služby" },
									icon: UsersIcon,
									span: 1,
								},
								{
									id: "monthly-appointments",
									type: "stats",
									collection: "appointments",
									label: { en: "This Month", sk: "Tento mesiac" },
									icon: CalendarCheckIcon,
									dateFilter: {
										field: "scheduledAt",
										range: "thisMonth",
									},
									variant: "primary",
									span: 1,
								},
								{
									id: "today-appointments",
									type: "stats",
									collection: "appointments",
									label: { en: "Today", sk: "Dnes" },
									icon: CalendarIcon,
									dateFilter: {
										field: "scheduledAt",
										range: "today",
									},
									filter: { status: { in: ["pending", "confirmed"] } },
									variant: "success",
									span: 1,
								},
							],
						},

						// Recent Appointments + Quick Actions
						{
							type: "section",
							wrapper: "flat",
							layout: "grid",
							columns: 2,
							items: [
								{
									id: "recent-appointments",
									type: "recentItems",
									collection: "appointments",
									label: {
										en: "Recent Appointments",
										sk: "Posledné rezervácie",
									},
									limit: 5,
									dateField: "scheduledAt",
									subtitleFields: ["status"],
									span: 1,
								},
								{
									id: "quick-actions",
									type: "quickActions",
									title: { en: "Quick Actions", sk: "Rýchle akcie" },
									quickActions: [
										{
											label: { en: "New Appointment", sk: "Nová rezervácia" },
											href: "/admin/collections/appointments/create",
											icon: CalendarIcon,
											variant: "primary",
										},
										{
											label: { en: "Add Barber", sk: "Pridať holiča" },
											href: "/admin/collections/barbers/create",
											icon: ScissorsIcon,
										},
										{
											label: { en: "Add Service", sk: "Pridať službu" },
											href: "/admin/collections/services/create",
											icon: UsersIcon,
										},
									],
									layout: "list",
									span: 1,
								},
							],
						},
					],
				},

				// ==================================================================
				// ANALYTICS TAB
				// ==================================================================
				{
					id: "analytics",
					label: { en: "Analytics", sk: "Analytika" },
					icon: ChartLineUpIcon,
					items: [
						// Progress widgets
						{
							type: "section",
							label: { en: "Goals", sk: "Ciele" },
							wrapper: "flat",
							layout: "grid",
							columns: 2,
							items: [
								{
									id: "monthly-goal",
									type: "progress",
									title: {
										en: "Monthly Revenue Goal",
										sk: "Mesačný cieľ tržieb",
									},
									fetchFn: async () => {
										const current = getMonthRange(0);
										const stats = await client.functions.getRevenueStats({
											startDate: current.start.toISOString(),
											endDate: current.end.toISOString(),
											completedOnly: true,
										});

										const target = 500000; // 5000€ in cents
										const currentRevenue = stats.totalRevenue;

										return {
											current: currentRevenue,
											target,
											label: `${(currentRevenue / 100).toLocaleString("sk-SK")} € / ${(target / 100).toLocaleString("sk-SK")} €`,
											subtitle:
												currentRevenue >= target
													? "Goal reached!"
													: `${((target - currentRevenue) / 100).toLocaleString("sk-SK")} € to go`,
										};
									},
									showPercentage: true,
									span: 1,
								},
								{
									id: "appointments-goal",
									type: "progress",
									title: {
										en: "Monthly Appointments Goal",
										sk: "Mesačný cieľ rezervácií",
									},
									fetchFn: async () => {
										const current = getMonthRange(0);
										const count =
											await client.collections.appointments.count({
												where: {
													scheduledAt: {
														gte: current.start.toISOString(),
														lte: current.end.toISOString(),
													},
												},
											});

										const target = 100;

										return {
											current: count,
											target,
											label: `${count} / ${target} appointments`,
											subtitle:
												count >= target
													? "Goal reached!"
													: `${target - count} more to go`,
										};
									},
									showPercentage: true,
									span: 1,
								},
							],
						},

						// Charts
						{
							type: "section",
							label: { en: "Trends", sk: "Trendy" },
							wrapper: "flat",
							layout: "grid",
							columns: 2,
							items: [
								{
									id: "appointments-chart",
									type: "chart",
									collection: "appointments",
									field: "scheduledAt",
									chartType: "area",
									timeRange: "30d",
									label: {
										en: "Appointments (30 days)",
										sk: "Rezervácie (30 dní)",
									},
									color: "var(--color-chart-1)",
									span: 1,
								},
								{
									id: "reviews-chart",
									type: "chart",
									collection: "reviews",
									field: "createdAt",
									chartType: "bar",
									timeRange: "30d",
									label: { en: "Reviews (30 days)", sk: "Recenzie (30 dní)" },
									color: "var(--color-chart-2)",
									span: 1,
								},
							],
						},

						// Status breakdown
						{
							type: "section",
							label: { en: "Status Breakdown", sk: "Prehľad stavov" },
							wrapper: "card",
							layout: "grid",
							columns: 1,
							items: [
								{
									id: "status-chart",
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
					],
				},

				// ==================================================================
				// ACTIVITY TAB
				// ==================================================================
				{
					id: "activity",
					label: { en: "Activity", sk: "Aktivita" },
					icon: RocketLaunchIcon,
					items: [
						{
							type: "section",
							wrapper: "flat",
							layout: "grid",
							columns: 2,
							items: [
								// Recent activity timeline
								{
									id: "recent-activity",
									type: "timeline",
									title: { en: "Recent Activity", sk: "Posledná aktivita" },
									maxItems: 8,
									showTimestamps: true,
									timestampFormat: "relative",
									emptyMessage: {
										en: "No recent activity",
										sk: "Žiadna nedávna aktivita",
									},
									fetchFn: async () => {
										// Fetch recent appointments as activity
										const appointments =
											await client.collections.appointments.find({
												limit: 8,
												orderBy: { updatedAt: "desc" },
											});

										return (appointments.docs ?? []).map((apt: any) => {
											const statusVariant: Record<string, any> = {
												pending: "warning",
												confirmed: "info",
												completed: "success",
												cancelled: "error",
												"no-show": "error",
											};

											const statusLabels: Record<string, string> = {
												pending: "New appointment pending",
												confirmed: "Appointment confirmed",
												completed: "Appointment completed",
												cancelled: "Appointment cancelled",
												"no-show": "Customer no-show",
											};

											return {
												id: apt.id,
												title:
													apt._title || `Appointment #${apt.id.slice(0, 8)}`,
												description: statusLabels[apt.status] || apt.status,
												timestamp: apt.updatedAt,
												variant: statusVariant[apt.status] || "default",
												href: `/admin/collections/appointments/${apt.id}`,
											};
										});
									},
									span: 1,
								},

								// Recent reviews table - uses field definitions automatically
								{
									id: "recent-reviews",
									type: "table",
									title: { en: "Recent Reviews", sk: "Posledné recenzie" },
									collection: "reviews",
									// Simple field keys - labels come from field definitions
									// Override only where needed (custom render)
									columns: [
										{
											key: "rating",
											width: 80,
											render: (value: number) => `${value}/5`,
										},
										"comment",
									],
									limit: 5,
									sortBy: "createdAt",
									sortOrder: "desc",
									linkToDetail: true,
									emptyMessage: {
										en: "No reviews yet",
										sk: "Zatiaľ žiadne recenzie",
									},
									span: 1,
								},
							],
						},

						// Top barbers section
						{
							type: "section",
							label: { en: "Team", sk: "Tím" },
							wrapper: "card",
							layout: "grid",
							columns: 1,
							items: [
								{
									id: "barbers-table",
									type: "table",
									title: { en: "Barbers", sk: "Holiči" },
									collection: "barbers",
									// Simple field keys - labels & cells from field definitions
									// isActive will auto-use BooleanCell (Badge with Yes/No)
									columns: ["name", "email", "isActive"],
									limit: 5,
									sortBy: "name",
									sortOrder: "asc",
									linkToDetail: true,
									span: 1,
								},
							],
						},
					],
				},
			],
		},
	],
} satisfies DashboardConfig);
