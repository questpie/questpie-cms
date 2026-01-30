/**
 * DashboardWidget Component
 *
 * Renders individual dashboard widgets based on their type configuration.
 * Supports built-in widget types and custom components.
 */

import * as React from "react";
import type {
	AnyWidgetConfig,
	ChartWidgetConfig,
	ProgressWidgetConfig,
	QuickActionsWidgetConfig,
	RecentItemsWidgetConfig,
	StatsWidgetConfig,
	TableWidgetConfig,
	TimelineWidgetConfig,
	ValueWidgetConfig,
	WidgetComponentProps,
} from "../../builder";
import { WidgetErrorBoundary } from "../../components/error-boundary";
import ChartWidget from "../../components/widgets/chart-widget";
import ProgressWidget from "../../components/widgets/progress-widget";
import QuickActionsWidget from "../../components/widgets/quick-actions-widget";
import RecentItemsWidget from "../../components/widgets/recent-items-widget";
// Import built-in widgets
import StatsWidget from "../../components/widgets/stats-widget";
import TableWidget from "../../components/widgets/table-widget";
import TimelineWidget from "../../components/widgets/timeline-widget";
import ValueWidget from "../../components/widgets/value-widget";
import { useResolveText } from "../../i18n/hooks";
import { WidgetCard } from "./widget-card";

// ============================================================================
// Types
// ============================================================================

export interface DashboardWidgetProps {
	/**
	 * Widget configuration
	 */
	config: AnyWidgetConfig;

	/**
	 * Base path for navigation links
	 */
	basePath?: string;

	/**
	 * Navigate function for item clicks
	 */
	navigate?: (path: string) => void;

	/**
	 * Custom widget registry for overrides
	 */
	widgetRegistry?: Record<string, React.ComponentType<WidgetComponentProps>>;
}

// ============================================================================
// Loading & Error States
// ============================================================================

function UnknownWidget({ type }: { type: string }) {
	return (
		<WidgetCard
			title="Unknown Widget"
			className="border-yellow-500/20 bg-yellow-500/5"
		>
			<p className="text-xs text-muted-foreground">
				Widget type "{type}" is not recognized.
			</p>
		</WidgetCard>
	);
}

// ============================================================================
// Custom Widget Renderer (handles lazy loading)
// ============================================================================

interface CustomWidgetRendererProps {
	loader: any;
	widgetConfig: Record<string, any>;
	span?: number;
}

function CustomWidgetRenderer({
	loader,
	widgetConfig,
	span,
}: CustomWidgetRendererProps) {
	const [state, setState] = React.useState<{
		Component: React.ComponentType<WidgetComponentProps> | null;
		loading: boolean;
		error: Error | null;
	}>({
		Component: null,
		loading: true,
		error: null,
	});

	React.useEffect(() => {
		if (!loader) {
			setState({ Component: null, loading: false, error: null });
			return;
		}

		// Check if it's already a component (not a lazy loader function)
		const isLazyLoader =
			typeof loader === "function" &&
			!loader.prototype?.render &&
			!loader.prototype?.isReactComponent &&
			loader.length === 0;

		if (!isLazyLoader) {
			setState({ Component: loader, loading: false, error: null });
			return;
		}

		// Load lazy component
		let mounted = true;

		(async () => {
			try {
				const result = await loader();
				if (mounted) {
					const Component = result.default || result;
					setState({ Component, loading: false, error: null });
				}
			} catch (err) {
				if (mounted) {
					setState({
						Component: null,
						loading: false,
						error:
							err instanceof Error
								? err
								: new Error("Failed to load component"),
					});
				}
			}
		})();

		return () => {
			mounted = false;
		};
	}, [loader]);

	if (state.loading) {
		return <WidgetCard isLoading />;
	}

	if (state.error) {
		return <WidgetCard error={state.error} />;
	}

	if (!state.Component) {
		return <WidgetCard error={new Error("Component not found")} />;
	}

	const Component = state.Component;
	return <Component config={widgetConfig} span={span} />;
}

// ============================================================================
// Built-in Widget Renderers
// ============================================================================

function StatsWidgetRenderer({ config }: { config: StatsWidgetConfig }) {
	const resolveText = useResolveText();
	return (
		<StatsWidget
			config={{
				collection: config.collection,
				label: config.label ? resolveText(config.label) : undefined,
				filter: config.filter,
				filterFn: config.filterFn,
				dateFilter: config.dateFilter,
				icon: config.icon,
				variant: config.variant,
			}}
		/>
	);
}

function ChartWidgetRenderer({ config }: { config: ChartWidgetConfig }) {
	const resolveText = useResolveText();
	return (
		<ChartWidget
			config={{
				collection: config.collection,
				field: config.field,
				chartType: config.chartType,
				timeRange: config.timeRange,
				label: config.label ? resolveText(config.label) : undefined,
				color: config.color,
				showGrid: config.showGrid,
				aggregation: config.aggregation,
				valueField: config.valueField,
			}}
		/>
	);
}

function RecentItemsWidgetRenderer({
	config,
	basePath,
	navigate,
}: {
	config: RecentItemsWidgetConfig;
	basePath: string;
	navigate?: (path: string) => void;
}) {
	const resolveText = useResolveText();
	return (
		<RecentItemsWidget
			config={{
				collection: config.collection,
				limit: config.limit,
				label: config.label ? resolveText(config.label) : undefined,
				titleField: config.titleField,
				dateField: config.dateField,
				subtitleFields: config.subtitleFields,
				basePath,
				onItemClick: navigate
					? (item: any) =>
							navigate(
								`${basePath}/collections/${config.collection}/${item.id}`,
							)
					: undefined,
			}}
		/>
	);
}

function QuickActionsWidgetRenderer({
	config,
	basePath,
	navigate,
}: {
	config: QuickActionsWidgetConfig;
	basePath: string;
	navigate?: (path: string) => void;
}) {
	return (
		<QuickActionsWidget
			config={config}
			basePath={basePath}
			navigate={navigate}
		/>
	);
}

function TableWidgetRenderer({
	config,
	basePath,
	navigate,
}: {
	config: TableWidgetConfig;
	basePath: string;
	navigate?: (path: string) => void;
}) {
	return (
		<TableWidget config={config} basePath={basePath} navigate={navigate} />
	);
}

function TimelineWidgetRenderer({
	config,
	navigate,
}: {
	config: TimelineWidgetConfig;
	navigate?: (path: string) => void;
}) {
	return <TimelineWidget config={config} navigate={navigate} />;
}

function ProgressWidgetRenderer({ config }: { config: ProgressWidgetConfig }) {
	return <ProgressWidget config={config} />;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * DashboardWidget - Renders a single widget based on its configuration
 *
 * @example
 * ```tsx
 * <DashboardWidget
 *   config={{ type: "stats", collection: "posts", label: "Total Posts" }}
 *   basePath="/admin"
 *   navigate={navigate}
 * />
 * ```
 */
export function DashboardWidget({
	config,
	basePath = "/admin",
	navigate,
	widgetRegistry,
}: DashboardWidgetProps): React.ReactElement {
	// Wrap all widget rendering in ErrorBoundary to prevent crashes
	const renderWidget = (): React.ReactElement => {
		// Handle custom widget type
		if (config.type === "custom") {
			return (
				<CustomWidgetRenderer
					loader={config.component}
					widgetConfig={config.config || {}}
					span={config.span}
				/>
			);
		}

		// Check widget registry for overrides
		if (widgetRegistry?.[config.type]) {
			const CustomWidget = widgetRegistry[config.type];
			return <CustomWidget config={config as any} span={config.span} />;
		}

		// Render built-in widgets - use type assertions since GenericWidgetConfig
		// prevents proper narrowing
		switch (config.type) {
			case "stats":
				return <StatsWidgetRenderer config={config as StatsWidgetConfig} />;

			case "chart":
				return <ChartWidgetRenderer config={config as ChartWidgetConfig} />;

			case "recentItems":
				return (
					<RecentItemsWidgetRenderer
						config={config as RecentItemsWidgetConfig}
						basePath={basePath}
						navigate={navigate}
					/>
				);

			case "quickActions":
				return (
					<QuickActionsWidgetRenderer
						config={config as QuickActionsWidgetConfig}
						basePath={basePath}
						navigate={navigate}
					/>
				);

			case "value":
				return <ValueWidget config={config as ValueWidgetConfig} />;

			case "table":
				return (
					<TableWidgetRenderer
						config={config as TableWidgetConfig}
						basePath={basePath}
						navigate={navigate}
					/>
				);

			case "timeline":
				return (
					<TimelineWidgetRenderer
						config={config as TimelineWidgetConfig}
						navigate={navigate}
					/>
				);

			case "progress":
				return (
					<ProgressWidgetRenderer config={config as ProgressWidgetConfig} />
				);

			default:
				return <UnknownWidget type={config.type} />;
		}
	};

	return (
		<WidgetErrorBoundary widgetType={config.type}>
			{renderWidget()}
		</WidgetErrorBoundary>
	);
}

export default DashboardWidget;
