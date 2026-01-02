/**
 * Admin Catch-All Route
 *
 * Uses AdminRouter from @questpie/admin to automatically render all views
 */

import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AdminRouter } from "@questpie/admin/components";
import { adminConfig } from "~/configs/admin";

function AdminCatchAll() {
	const navigate = useNavigate();
	const params = useParams({ from: "/admin/$" });
	const splat = params._ as string;

	// Parse URL segments
	const segments = splat ? splat.split("/").filter(Boolean) : [];

	return (
		<AdminRouter
			config={adminConfig}
			segments={segments}
			navigate={navigate}
		/>
	);
}

export const Route = createFileRoute("/admin/$")({
	component: AdminCatchAll,
});
