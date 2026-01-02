/**
 * AdminLayout Component
 *
 * Complete admin layout generated from config
 * - Sidebar navigation
 * - Main content area
 * - Optional header/footer
 */

import * as React from "react";
import { cn } from "../../lib/utils";
import { AdminSidebar, type AdminSidebarProps } from "./admin-sidebar";

export interface AdminLayoutProps {
	/**
	 * Admin configuration
	 */
	config: AdminSidebarProps["config"] & {
		app?: {
			header?: {
				show?: boolean;
				component?: React.ComponentType;
			};
			footer?: {
				show?: boolean;
				component?: React.ComponentType;
			};
		};
	};

	/**
	 * Current active route
	 */
	activeRoute?: string;

	/**
	 * Link component (router-specific)
	 */
	LinkComponent: AdminSidebarProps["LinkComponent"];

	/**
	 * Main content to render
	 */
	children: React.ReactNode;

	/**
	 * Custom layout className
	 */
	className?: string;

	/**
	 * Custom sidebar props
	 */
	sidebarProps?: Partial<AdminSidebarProps>;

	/**
	 * Custom header content
	 */
	renderHeader?: () => React.ReactNode;

	/**
	 * Custom footer content
	 */
	renderFooter?: () => React.ReactNode;
}

export function AdminLayout({
	config,
	activeRoute,
	LinkComponent,
	children,
	className,
	sidebarProps,
	renderHeader,
	renderFooter,
}: AdminLayoutProps): React.ReactElement {
	const showHeader = config.app?.header?.show ?? false;
	const showFooter = config.app?.footer?.show ?? false;
	const HeaderComponent = config.app?.header?.component;
	const FooterComponent = config.app?.footer?.component;

	return (
		<div className={cn("flex h-screen flex-col", className)}>
			{/* Header (optional) */}
			{showHeader && (
				<header className="border-b">
					{renderHeader ? renderHeader() : HeaderComponent && <HeaderComponent />}
				</header>
			)}

			{/* Main Layout */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<AdminSidebar
					config={config}
					activeRoute={activeRoute}
					LinkComponent={LinkComponent}
					{...sidebarProps}
				/>

				{/* Main Content */}
				<main className="flex-1 overflow-auto">{children}</main>
			</div>

			{/* Footer (optional) */}
			{showFooter && (
				<footer className="border-t">
					{renderFooter ? renderFooter() : FooterComponent && <FooterComponent />}
				</footer>
			)}
		</div>
	);
}
