import { createAdminAuthClient } from "@questpie/admin/client";
import type { AppCMS } from "@/questpie/server/app.js";

export const authClient = createAdminAuthClient<AppCMS>({
	baseURL:
		typeof window !== "undefined"
			? window.location.origin
			: process.env.APP_URL || "http://localhost:3000",
	basePath: "/api/cms/auth",
});

export type AuthClient = typeof authClient;
