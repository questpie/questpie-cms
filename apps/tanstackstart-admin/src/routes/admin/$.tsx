import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/$")({
	component: () => {
		return <div>Admin Home</div>;
	},
});
