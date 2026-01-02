/**
 * CMS Client Configuration
 *
 * Type-safe client for accessing barbershop CMS data
 */

import { createQCMSClient } from "@questpie/cms/client";
import type { AppCMS } from "~/server/cms";

export const cmsClient = createQCMSClient<AppCMS>({
	baseURL:
		typeof window !== "undefined"
			? window.location.origin
			: process.env.APP_URL || "http://localhost:3000",
	basePath: "/api/cms",
});

export type CMSClient = typeof cmsClient;
