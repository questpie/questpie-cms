/**
 * AdminRouter Component
 *
 * Automatic routing for all collections from CMS + admin config
 *
 * URL Patterns:
 * - /admin -> Dashboard
 * - /admin/:collection -> List view
 * - /admin/:collection/new -> Create form
 * - /admin/:collection/:id -> Edit form
 */

import * as React from "react";
import { CollectionList } from "./collection-list";
import { CollectionForm } from "./collection-form";
import { AutoFormFields } from "./auto-form-fields";
import { LocaleSwitcher } from "./locale-switcher";
import type { ComponentRegistry } from "../../config/component-registry";

export interface AdminRouterProps {
	/**
	 * Admin configuration
	 */
	config: {
		collections?: Record<
			string,
			{
				label?: string;
				list?: {
					defaultColumns?: string[];
					defaultSort?: { field: string; direction: "asc" | "desc" };
					with?: string[];
				};
				fields?: Record<
					string,
					{
						label?: string;
						list?: {
							renderCell?: string | React.ComponentType;
						};
					}
				>;
			}
		>;
	};

	/**
	 * Current route segments (parsed from URL)
	 * Example: ["barbers", "123"] for /admin/barbers/123
	 */
	segments: string[];

	/**
	 * Navigate function (router-specific)
	 */
	navigate: (path: string) => void;

	/**
	 * Custom dashboard component
	 */
	DashboardComponent?: React.ComponentType;

	/**
	 * Custom collection components override
	 */
	collectionComponents?: Record<
		string,
		{
			List?: React.ComponentType;
			Form?: React.ComponentType;
		}
	>;

	/**
	 * Render custom form fields for collection
	 * If not provided, will use default field detection
	 */
	renderFormFields?: (collection: string) => React.ReactNode;

	/**
	 * Component registry
	 */
	registry?: ComponentRegistry;
}

/**
 * Default Dashboard
 */
function DefaultDashboard() {
	return (
		<div className="container py-8">
			<h1 className="mb-8 text-3xl font-bold">Dashboard</h1>
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div className="rounded-lg border bg-card p-6">
					<h3 className="font-semibold">Collections</h3>
					<p className="mt-2 text-3xl font-bold">--</p>
				</div>
			</div>
		</div>
	);
}

export function AdminRouter({
	config,
	segments,
	navigate,
	DashboardComponent,
	collectionComponents,
	renderFormFields,
	registry,
}: AdminRouterProps): React.ReactElement {
	// Dashboard: no segments
	if (segments.length === 0) {
		const Dashboard = DashboardComponent || DefaultDashboard;
		return <Dashboard />;
	}

	const [collection, idOrNew] = segments;
	const collectionConfig = config.collections?.[collection];

	// Custom collection component override
	const customComponents = collectionComponents?.[collection];

	// List view: /admin/:collection
	if (!idOrNew) {
		if (customComponents?.List) {
			return <customComponents.List />;
		}

		// Auto-generate columns from config
		const columns =
			collectionConfig?.list?.defaultColumns?.map((field) => ({
				accessorKey: field,
				header: collectionConfig.fields?.[field]?.label || field,
			})) || [{ accessorKey: "id", header: "ID" }];

		const withRelations = collectionConfig?.list?.with;

		return (
			<div className="container py-8">
				<CollectionList
					collection={collection as any}
					columns={columns as any}
					baseFindOptions={
						withRelations
							? {
									with: withRelations.reduce(
										(acc, rel) => {
											acc[rel] = true;
											return acc;
										},
										{} as any,
									),
								}
							: undefined
					}
					realtime={true}
					headerActions={
						<div className="flex items-center gap-2">
							<LocaleSwitcher />
							<button
								type="button"
								onClick={() => navigate(`/admin/${collection}/new`)}
								className="rounded bg-primary px-4 py-2 text-primary-foreground"
							>
								Create {collectionConfig?.label || collection}
							</button>
						</div>
					}
					onRowClick={(item: any) => {
						navigate(`/admin/${collection}/${item.id}`);
					}}
				/>
			</div>
		);
	}

	// Form view: /admin/:collection/new or /admin/:collection/:id
	const id = idOrNew === "new" ? undefined : idOrNew;

	if (customComponents?.Form) {
		return <customComponents.Form />;
	}

	return (
		<div className="container max-w-2xl py-8">
			<CollectionForm
				collection={collection as any}
				id={id}
				title={
					id
						? `Edit ${collectionConfig?.label || collection}`
						: `New ${collectionConfig?.label || collection}`
				}
				headerActions={<LocaleSwitcher />}
				onSuccess={() => navigate(`/admin/${collection}`)}
				onCancel={() => navigate(`/admin/${collection}`)}
			>
				{renderFormFields?.(collection) || (
					<AutoFormFields
						collection={collection as any}
						config={collectionConfig}
						registry={registry}
						allCollectionsConfig={config.collections}
					/>
				)}
			</CollectionForm>
		</div>
	);
}
