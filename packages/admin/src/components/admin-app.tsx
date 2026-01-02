/**
 * AdminApp Component
 *
 * MAIN ENTRY POINT - Mount this and you have a complete admin!
 *
 * Minimal usage:
 *   <AdminApp client={cmsClient} />
 *
 * Everything else is OPTIONAL customization.
 */

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { QCMS } from "@questpie/cms/server";
import type { QCMSClient } from "@questpie/cms/client";
import { AdminProvider } from "../hooks/admin-provider";
import { AdminLayout } from "./views/admin-layout";
import { AdminRouter } from "./views/admin-router";
import type { ComponentRegistry } from "../config/component-registry";
import { mergeComponentRegistry } from "../config/component-registry";

export interface AdminAppProps<T extends QCMS<any, any, any>> {
	/**
	 * CMS client - THE ONLY REQUIRED PROP!
	 */
	client: QCMSClient<T>;

	/**
	 * Admin config (OPTIONAL)
	 * If not provided, auto-generates from CMS schema
	 */
	config?: {
		app?: {
			brand?: {
				name?: string;
				logo?: React.ComponentType;
				homeRoute?: string;
			};
			locales?: {
				default: string;
				available: string[];
			};
			header?: {
				show?: boolean;
				component?: React.ComponentType;
			};
			footer?: {
				show?: boolean;
				component?: React.ComponentType;
			};
			debug?: {
				showQueryDevtools?: boolean;
				showRouterDevtools?: boolean;
			};
		};
		collections?: Record<string, any>;
		globals?: Record<string, any>;
		pages?: Record<string, any>;
	};

	/**
	 * Component registry (OPTIONAL)
	 * Custom field components, layouts, etc.
	 */
	registry?: Partial<ComponentRegistry>;

	/**
	 * QueryClient instance (OPTIONAL)
	 * If not provided, creates default
	 */
	queryClient?: QueryClient;

	/**
	 * Router integration (framework-specific)
	 */
	router: {
		/**
		 * Link component from your router
		 * Example: from TanStack Router, Next.js, React Router
		 */
		LinkComponent: React.ComponentType<{
			to: string;
			className?: string;
			children: React.ReactNode;
			activeProps?: { className?: string };
		}>;

		/**
		 * Current route path
		 */
		currentPath: string;

		/**
		 * Route segments after /admin
		 * Example: for /admin/barbers/123 -> ["barbers", "123"]
		 */
		segments: string[];

		/**
		 * Navigate function
		 */
		navigate: (path: string) => void;
	};

	/**
	 * Base path for admin routes (OPTIONAL)
	 * Default: "/admin"
	 */
	basePath?: string;

	/**
	 * Custom dashboard component (OPTIONAL)
	 */
	DashboardComponent?: React.ComponentType;

	/**
	 * Custom collection components (OPTIONAL)
	 */
	collectionComponents?: Record<
		string,
		{
			List?: React.ComponentType;
			Form?: React.ComponentType;
		}
	>;

	/**
	 * Render custom form fields (OPTIONAL - will be replaced by AutoFormFields)
	 */
	renderFormFields?: (collection: string) => React.ReactNode;
}

/**
 * Default QueryClient configuration
 */
function createDefaultQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000, // 1 minute
				refetchOnWindowFocus: false,
			},
		},
	});
}

/**
 * AdminApp Component
 *
 * ONE COMPONENT TO RULE THEM ALL!
 */
export function AdminApp<T extends QCMS<any, any, any>>({
	client,
	config,
	registry,
	queryClient,
	router,
	basePath = "/admin",
	DashboardComponent,
	collectionComponents,
	renderFormFields,
}: AdminAppProps<T>): React.ReactElement {
	// Create or use provided QueryClient
	const [defaultQueryClient] = React.useState(
		() => queryClient ?? createDefaultQueryClient(),
	);

	// Merge component registry
	const mergedRegistry = React.useMemo(
		() => mergeComponentRegistry(registry),
		[registry],
	);

	// Auto-generate config from CMS if not provided
	const finalConfig = React.useMemo(() => {
		if (config) return config;

		// TODO: Auto-generate from CMS schema
		// For now, return minimal config
		return {
			app: {
				brand: {
					name: "Admin",
				},
			},
			collections: {},
		};
	}, [config]);

	return (
		<QueryClientProvider client={defaultQueryClient}>
			<AdminProvider
				client={client}
				queryClient={defaultQueryClient}
				locales={finalConfig.app?.locales}
			>
				<AdminLayout
					config={finalConfig}
					activeRoute={router.currentPath}
					LinkComponent={router.LinkComponent}
				>
					<AdminRouter
						config={finalConfig}
						segments={router.segments}
						navigate={router.navigate}
						DashboardComponent={DashboardComponent}
						collectionComponents={collectionComponents}
						renderFormFields={renderFormFields}
						registry={mergedRegistry}
					/>
				</AdminLayout>
			</AdminProvider>

			{/* Optional: Query Devtools */}
			{config?.app?.debug?.showQueryDevtools && (
				// TODO: Add ReactQueryDevtools
				<div />
			)}
		</QueryClientProvider>
	);
}
