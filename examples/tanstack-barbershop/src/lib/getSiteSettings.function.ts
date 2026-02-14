/**
 * Server function to fetch site settings
 *
 * Used by layout to get navigation, footer links, business hours, etc.
 */

import { createServerFn } from "@tanstack/react-start";
import { cms, createServerContext } from "@/lib/server-helpers";

export type SiteSettingsData = Awaited<
	ReturnType<typeof cms.api.globals.siteSettings.get>
>;

export const getSiteSettings = createServerFn({ method: "GET" })
	.inputValidator((data: { locale?: string }) => data)
	.handler(async ({ data }) => {
		const ctx = await createServerContext(data?.locale);

		const settings = await cms.api.globals.siteSettings.get(
			{ with: { logo: true } },
			ctx,
		);

		return settings as any;
	});
