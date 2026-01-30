/**
 * Sidebar Configuration
 *
 * Using the new SidebarBuilder pattern for type-safe,
 * composable sidebar configuration with Phosphor icons.
 */

import {
	CalendarCheckIcon,
	FileTextIcon,
	GearIcon,
	ScissorsIcon,
	StarIcon,
	UsersIcon,
} from "@phosphor-icons/react";
import { qa } from "@questpie/admin/client";
import type { AppCMS } from "../server/cms";

export const sidebarConfig = qa
	.sidebar<AppCMS>()
	// Content section (Pages with blocks)
	.section("content", (s) =>
		s
			.title({ en: "Content", sk: "Obsah" })
			.icon(FileTextIcon)
			.items([
				{
					type: "collection",
					collection: "pages",
					icon: FileTextIcon,
				},
			]),
	)
	// Bookings section
	.section("bookings", (s) =>
		s
			.title({ en: "Bookings", sk: "Rezervácie" })
			.icon(CalendarCheckIcon)
			.items([
				{
					type: "collection",
					collection: "appointments",
					icon: CalendarCheckIcon,
				},
				{ type: "collection", collection: "reviews", icon: StarIcon },
			]),
	)
	// Staff section
	.section("staff", (s) =>
		s
			.title({ en: "Staff & Services", sk: "Personál a služby" })
			.icon(UsersIcon)
			.items([
				{ type: "collection", collection: "barbers", icon: UsersIcon },
				{ type: "collection", collection: "services", icon: ScissorsIcon },
			]),
	)
	// Settings section
	.section("settings", (s) =>
		s
			.title({ en: "Settings", sk: "Nastavenia" })
			.icon(GearIcon)
			.items([
				{
					type: "global",
					global: "siteSettings",
					icon: GearIcon,
				},
			]),
	);
