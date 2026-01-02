/**
 * AdminSidebar Component
 *
 * Automatically generated sidebar from admin config
 * Fully customizable via config overrides
 */

import * as React from "react";
import { cn } from "../../lib/utils";

export interface AdminSidebarProps {
	/**
	 * Admin configuration
	 */
	config: {
		app?: {
			brand?: {
				name?: string;
				logo?: React.ComponentType;
				homeRoute?: string;
			};
		};
		collections?: Record<
			string,
			{
				label?: string;
				icon?: string | React.ComponentType;
				group?: string;
			}
		>;
	};

	/**
	 * Current active route (e.g., "/admin/barbers")
	 */
	activeRoute?: string;

	/**
	 * Link component (router-specific)
	 * Must accept: to, className, children
	 */
	LinkComponent: React.ComponentType<{
		to: string;
		className?: string;
		children: React.ReactNode;
		activeProps?: { className?: string };
	}>;

	/**
	 * Custom class for sidebar container
	 */
	className?: string;

	/**
	 * Custom class for brand section
	 */
	brandClassName?: string;

	/**
	 * Custom class for nav section
	 */
	navClassName?: string;

	/**
	 * Render custom brand content
	 */
	renderBrand?: (config: AdminSidebarProps["config"]) => React.ReactNode;

	/**
	 * Render custom nav item
	 */
	renderNavItem?: (params: {
		collectionName: string;
		config: NonNullable<AdminSidebarProps["config"]["collections"]>[string];
		isActive: boolean;
	}) => React.ReactNode;
}

export function AdminSidebar({
	config,
	activeRoute,
	LinkComponent,
	className,
	brandClassName,
	navClassName,
	renderBrand,
	renderNavItem,
}: AdminSidebarProps): React.ReactElement {
	const brand = config.app?.brand;
	const collections = config.collections || {};

	// Group collections if needed
	const groupedCollections = React.useMemo(() => {
		const groups: Record<string, typeof collections> = { "": {} };

		Object.entries(collections).forEach(([name, collectionConfig]) => {
			const group = collectionConfig.group || "";
			if (!groups[group]) groups[group] = {};
			groups[group][name] = collectionConfig;
		});

		return groups;
	}, [collections]);

	return (
		<aside
			className={cn(
				"w-64 border-r bg-neutral-50 dark:bg-neutral-900",
				className,
			)}
		>
			{/* Brand Section */}
			<div className={cn("p-4", brandClassName)}>
				{renderBrand ? (
					renderBrand(config)
				) : (
					<>
						{brand?.logo && <brand.logo />}
						<h1 className="text-xl font-bold">{brand?.name || "Admin"}</h1>
					</>
				)}
			</div>

			{/* Navigation */}
			<nav className={cn("space-y-1 p-2", navClassName)}>
				{Object.entries(groupedCollections).map(([groupName, groupCollections]) => (
					<div key={groupName}>
						{/* Group Label */}
						{groupName && (
							<div className="px-3 py-2 text-xs font-semibold uppercase text-neutral-500">
								{groupName}
							</div>
						)}

						{/* Collection Links */}
						{Object.entries(groupCollections).map(([collectionName, collectionConfig]) => {
							const isActive = activeRoute === `/admin/${collectionName}`;

							if (renderNavItem) {
								return (
									<React.Fragment key={collectionName}>
										{renderNavItem({ collectionName, config: collectionConfig, isActive })}
									</React.Fragment>
								);
							}

							return (
								<LinkComponent
									key={collectionName}
									to={`/admin/${collectionName}`}
									className="block rounded px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
									activeProps={{
										className: "bg-neutral-100 dark:bg-neutral-800 font-medium",
									}}
								>
									{/* Icon */}
									{collectionConfig.icon && typeof collectionConfig.icon === "string" && (
										<span className="mr-2">{collectionConfig.icon}</span>
									)}
									{collectionConfig.icon &&
										typeof collectionConfig.icon !== "string" && (
											<collectionConfig.icon />
										)}

									{/* Label */}
									{collectionConfig.label || collectionName}
								</LinkComponent>
							);
						})}
					</div>
				))}
			</nav>
		</aside>
	);
}
