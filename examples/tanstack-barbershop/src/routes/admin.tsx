/**
 * Admin Layout Route
 *
 * Complete admin UI generated from config using @questpie/admin package
 */

import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { AdminProvider } from "@questpie/admin/hooks";
import { AdminLayout } from "@questpie/admin/components";
import { QueryClient } from "@tanstack/react-query";
import { cmsClient } from "~/lib/cms-client";
import { adminConfig } from "~/configs/admin";
import "@questpie/admin/styles";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
		},
	},
});

function AdminLayoutWrapper() {
	const location = useLocation();

	return (
		<AdminProvider client={cmsClient} queryClient={queryClient}>
			<AdminLayout
				config={adminConfig}
				activeRoute={location.pathname}
				LinkComponent={Link as any}
			>
				<Outlet />
			</AdminLayout>
		</AdminProvider>
	);
}

export const Route = createFileRoute("/admin")({
	component: AdminLayoutWrapper,
});
