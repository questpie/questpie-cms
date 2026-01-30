/**
 * Site Settings Global
 *
 * Singleton configuration for the barbershop site.
 * Features:
 * - Basic shop info (name, tagline, logo)
 * - Navigation (header nav items, localized)
 * - Footer configuration (links, localized)
 * - Contact details
 * - Business hours
 * - Booking configuration
 * - Social media links
 * - SEO settings
 *
 * Note: Hero and page content are managed via Pages collection with blocks!
 */

import { boolean, jsonb, text, varchar } from "drizzle-orm/pg-core";
import { global } from "questpie";
import type { WorkingHours } from "../collections/barbers";

/**
 * Navigation item type (for header navigation)
 */
export type NavItem = {
	label: string;
	href: string;
	isExternal?: boolean;
};

/**
 * Footer link type
 */
export type FooterLink = {
	label: string;
	href: string;
	isExternal?: boolean;
};

/**
 * Social media link type
 */
export type SocialLink = {
	platform: "instagram" | "facebook" | "twitter" | "tiktok" | "youtube";
	url: string;
};

/**
 * Booking settings type
 */
export type BookingSettings = {
	minAdvanceHours: number;
	maxAdvanceDays: number;
	slotDurationMinutes: number;
	allowCancellation: boolean;
	cancellationDeadlineHours: number;
};

export const siteSettings = global("site_settings")
	.fields({
		// === Branding ===
		shopName: text().notNull().default("Sharp Cuts"),
		tagline: text().default("Your Style, Our Passion"),
		logo: varchar("logo", { length: 500 }), // Asset ID

		// === Navigation (Header) ===
		navigation: jsonb()
			.$type<NavItem[]>()
			.default([
				{ label: "Home", href: "/" },
				{ label: "Services", href: "/services" },
				{ label: "Our Team", href: "/barbers" },
				{ label: "Contact", href: "/contact" },
			]),
		ctaButtonText: text().default("Book Now"),
		ctaButtonLink: text().default("/booking"),

		// === Footer ===
		footerTagline: text().default("Your Style, Our Passion"),
		footerLinks: jsonb()
			.$type<FooterLink[]>()
			.default([
				{ label: "Services", href: "/services" },
				{ label: "Our Team", href: "/barbers" },
				{ label: "Contact", href: "/contact" },
				{ label: "Privacy Policy", href: "/privacy" },
			]),
		copyrightText: text().default("Sharp Cuts. All rights reserved."),

		// === Contact ===
		contactEmail: text().notNull().default("hello@barbershop.com"),
		contactPhone: text().default("+1 555 0100"),
		address: text().default("123 Main Street"),
		city: text().default("New York"),
		zipCode: text().default("10001"),
		country: text().default("USA"),
		mapEmbedUrl: text("map_embed_url"), // Google Maps embed URL

		// === Business Settings ===
		isOpen: boolean().notNull().default(true),
		bookingEnabled: boolean().notNull().default(true),

		// === Working Hours (shop-wide defaults) ===
		businessHours: jsonb("business_hours")
			.$type<WorkingHours>()
			.default({
				monday: { isOpen: true, start: "09:00", end: "18:00" },
				tuesday: { isOpen: true, start: "09:00", end: "18:00" },
				wednesday: { isOpen: true, start: "09:00", end: "18:00" },
				thursday: { isOpen: true, start: "09:00", end: "20:00" },
				friday: { isOpen: true, start: "09:00", end: "20:00" },
				saturday: { isOpen: true, start: "10:00", end: "16:00" },
				sunday: { isOpen: false, start: "", end: "" },
			}),

		// === Booking Configuration ===
		bookingSettings: jsonb().$type<BookingSettings>().default({
			minAdvanceHours: 2,
			maxAdvanceDays: 30,
			slotDurationMinutes: 30,
			allowCancellation: true,
			cancellationDeadlineHours: 24,
		}),

		// === Social Media ===
		socialLinks: jsonb()
			.$type<SocialLink[]>()
			.default([
				{ platform: "instagram", url: "https://instagram.com/sharpcuts" },
				{ platform: "facebook", url: "https://facebook.com/sharpcuts" },
			]),

		// === SEO ===
		metaTitle: text().default("Sharp Cuts - Premium Barbershop"),
		metaDescription: text().default(
			"Professional barbershop services - haircuts, beard grooming, and more.",
		),
	})
	.relations(({ one, table }) => ({
		logo: one("assets", {
			fields: [table.logo],
			references: ["id"],
		}),
	}))
	.localized([
		"tagline",
		"navigation",
		"ctaButtonText",
		"footerTagline",
		"footerLinks",
		"copyrightText",
		"metaTitle",
		"metaDescription",
	] as const)
	.options({
		timestamps: true,
		versioning: true,
	})
	.access({
		read: true, // Anyone can read
		update: "admin", // Only admins can update
	})
	.build();
