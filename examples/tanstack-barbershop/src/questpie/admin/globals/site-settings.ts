/**
 * Site Settings Admin Configuration
 *
 * Demonstrates global settings UI configuration.
 */

import { GearIcon } from "@phosphor-icons/react/dist/ssr";
import { builder } from "@/questpie/admin/builder";

export const siteSettingsAdmin = builder
	.global("siteSettings")
	.meta({
		label: { en: "Site Settings", sk: "Nastavenia stránky" },
		icon: GearIcon,
		description: {
			en: "Configure your barbershop website settings",
			sk: "Nakonfigurujte nastavenia vašej stránky",
		},
	})
	.fields(({ r }) => ({
		// Branding
		shopName: r.text({
			label: { en: "Shop Name", sk: "Názov podniku" },
			placeholder: { en: "My Barbershop", sk: "Môj barbershop" },
		}),
		logo: r.upload({
			label: { en: "Logo", sk: "Logo" },
			accept: ["image/*"],
		}),
		tagline: r.text({
			label: { en: "Tagline", sk: "Slogan" },
			placeholder: {
				en: "Your Style, Our Passion",
				sk: "Váš štýl, naša vášeň",
			},
			localized: true,
		}),

		// Header
		navigation: r.array({
			label: { en: "Navigation", sk: "Navigácia" },
			description: {
				en: "Primary header links",
				sk: "Hlavné odkazy v hlavičke",
			},
			localized: true,
			orderable: true,
			mode: "inline",
			itemLabel: (item) => item?.label || "New link",
			item: ({ r }) => ({
				label: r.text({
					label: { en: "Label", sk: "Názov" },
					required: true,
				}),
				href: r.text({
					label: { en: "URL", sk: "URL" },
					placeholder: "/services",
					required: true,
				}),
				isExternal: r.switch({
					label: { en: "Open in new tab", sk: "Otvoriť v novom okne" },
				}),
			}),
		}),
		ctaButtonText: r.text({
			label: { en: "CTA Button Text", sk: "Text CTA tlačidla" },
			placeholder: { en: "Book Now", sk: "Rezervovať" },
			localized: true,
		}),
		ctaButtonLink: r.text({
			label: { en: "CTA Button Link", sk: "Link CTA tlačidla" },
			placeholder: "/booking",
		}),

		// Footer
		footerTagline: r.text({
			label: { en: "Footer Tagline", sk: "Slogan v pätičke" },
			placeholder: {
				en: "Your Style, Our Passion",
				sk: "Váš štýl, naša vášeň",
			},
			localized: true,
		}),
		footerLinks: r.array({
			label: { en: "Footer Links", sk: "Linky v pätičke" },
			description: {
				en: "Quick links displayed in the footer",
				sk: "Rýchle odkazy zobrazené v pätičke",
			},
			localized: true,
			orderable: true,
			mode: "inline",
			itemLabel: (item) => item?.label || "New link",
			item: ({ r }) => ({
				label: r.text({
					label: { en: "Label", sk: "Názov" },
					required: true,
				}),
				href: r.text({
					label: { en: "URL", sk: "URL" },
					placeholder: "/privacy",
					required: true,
				}),
				isExternal: r.switch({
					label: { en: "Open in new tab", sk: "Otvoriť v novom okne" },
				}),
			}),
		}),
		copyrightText: r.text({
			label: { en: "Copyright Text", sk: "Copyright text" },
			placeholder: {
				en: "Sharp Cuts. All rights reserved.",
				sk: "Sharp Cuts. Všetky práva vyhradené.",
			},
			localized: true,
		}),

		// Contact
		contactEmail: r.email({
			label: { en: "Contact Email", sk: "Kontaktný email" },
			placeholder: "contact@barbershop.com",
		}),
		contactPhone: r.text({
			label: { en: "Phone Number", sk: "Telefón" },
			placeholder: "+421 900 000 000",
		}),
		address: r.text({
			label: { en: "Street Address", sk: "Ulica" },
			placeholder: { en: "123 Main Street", sk: "Lazaretská 12" },
		}),
		city: r.text({
			label: { en: "City", sk: "Mesto" },
			placeholder: { en: "New York", sk: "Bratislava" },
		}),
		zipCode: r.text({
			label: { en: "ZIP Code", sk: "PSČ" },
			placeholder: "811 09",
		}),
		country: r.text({
			label: { en: "Country", sk: "Krajina" },
			placeholder: { en: "USA", sk: "Slovensko" },
		}),
		mapEmbedUrl: r.text({
			label: { en: "Map Embed URL", sk: "URL mapy" },
			placeholder: "https://...",
		}),

		// Business settings
		isOpen: r.switch({
			label: { en: "Shop Open", sk: "Otvorené" },
			description: {
				en: "Show if the shop is currently open",
				sk: "Zobraziť, či je podnik práve otvorený",
			},
		}),
		bookingEnabled: r.switch({
			label: { en: "Online Booking", sk: "Online rezervácie" },
			description: {
				en: "Allow customers to book appointments online",
				sk: "Umožniť zákazníkom rezervovať termíny online",
			},
		}),
		businessHours: r.object({
			label: { en: "Business Hours", sk: "Otváracie hodiny" },
			fields: ({ r }) => ({
				monday: r.object({
					label: { en: "Monday", sk: "Pondelok" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({
							label: { en: "Open", sk: "Otvorené" },
						}),
						start: r.time({ label: { en: "Start", sk: "Od" } }),
						end: r.time({ label: { en: "End", sk: "Do" } }),
					}),
				}),
				tuesday: r.object({
					label: { en: "Tuesday", sk: "Utorok" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({
							label: { en: "Open", sk: "Otvorené" },
						}),
						start: r.time({ label: { en: "Start", sk: "Od" } }),
						end: r.time({ label: { en: "End", sk: "Do" } }),
					}),
				}),
				wednesday: r.object({
					label: { en: "Wednesday", sk: "Streda" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({
							label: { en: "Open", sk: "Otvorené" },
						}),
						start: r.time({ label: { en: "Start", sk: "Od" } }),
						end: r.time({ label: { en: "End", sk: "Do" } }),
					}),
				}),
				thursday: r.object({
					label: { en: "Thursday", sk: "Štvrtok" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({
							label: { en: "Open", sk: "Otvorené" },
						}),
						start: r.time({ label: { en: "Start", sk: "Od" } }),
						end: r.time({ label: { en: "End", sk: "Do" } }),
					}),
				}),
				friday: r.object({
					label: { en: "Friday", sk: "Piatok" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({
							label: { en: "Open", sk: "Otvorené" },
						}),
						start: r.time({ label: { en: "Start", sk: "Od" } }),
						end: r.time({ label: { en: "End", sk: "Do" } }),
					}),
				}),
				saturday: r.object({
					label: { en: "Saturday", sk: "Sobota" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({
							label: { en: "Open", sk: "Otvorené" },
						}),
						start: r.time({ label: { en: "Start", sk: "Od" } }),
						end: r.time({ label: { en: "End", sk: "Do" } }),
					}),
				}),
				sunday: r.object({
					label: { en: "Sunday", sk: "Nedeľa" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({
							label: { en: "Open", sk: "Otvorené" },
						}),
						start: r.time({ label: { en: "Start", sk: "Od" } }),
						end: r.time({ label: { en: "End", sk: "Do" } }),
					}),
				}),
			}),
		}),

		// Booking settings
		bookingSettings: r.object({
			layout: "grid",
			columns: 2,
			fields: ({ r }) => ({
				minAdvanceHours: r.number({
					label: {
						en: "Minimum Advance (hours)",
						sk: "Minimum vopred (hodiny)",
					},
					description: {
						en: "Minimum hours before appointment",
						sk: "Minimálny počet hodín pred termínom",
					},
					min: 0,
					max: 72,
				}),
				maxAdvanceDays: r.number({
					label: { en: "Maximum Advance (days)", sk: "Maximum vopred (dni)" },
					description: {
						en: "How far in advance can bookings be made",
						sk: "Ako dlho dopredu sa dá rezervovať",
					},
					min: 1,
					max: 365,
				}),
				slotDurationMinutes: r.select({
					label: { en: "Slot Duration", sk: "Dĺžka termínu" },
					options: [
						{ label: { en: "15 minutes", sk: "15 minút" }, value: "15" },
						{ label: { en: "30 minutes", sk: "30 minút" }, value: "30" },
						{ label: { en: "45 minutes", sk: "45 minút" }, value: "45" },
						{ label: { en: "60 minutes", sk: "60 minút" }, value: "60" },
					],
				}),
				allowCancellation: r.switch({
					label: { en: "Allow Cancellation", sk: "Povoliť zrušenie" },
				}),
				cancellationDeadlineHours: r.number({
					label: {
						en: "Cancellation Deadline (hours)",
						sk: "Deadline zrušenia (hodiny)",
					},
					description: {
						en: "Hours before appointment when cancellation is allowed",
						sk: "Koľko hodín pred termínom je možné zrušenie",
					},
					min: 0,
					max: 72,
				}),
			}),
		}),

		// Social links
		socialLinks: r.array({
			label: { en: "Social Links", sk: "Sociálne siete" },
			description: {
				en: "Add social media profiles",
				sk: "Pridajte profily na sociálnych sieťach",
			},
			item: ({ r }) => ({
				platform: r.select({
					label: { en: "Platform", sk: "Platforma" },
					options: [
						{ label: "Instagram", value: "instagram" },
						{ label: "Facebook", value: "facebook" },
						{ label: "Twitter", value: "twitter" },
						{ label: "TikTok", value: "tiktok" },
						{ label: "YouTube", value: "youtube" },
					],
				}),
				url: r.text({
					label: { en: "URL", sk: "URL" },
					placeholder: "https://...",
				}),
			}),
			orderable: true,
			maxItems: 6,
			itemLabel: (item) => item?.platform || "New link",
			mode: "inline",
		}),

		// SEO
		metaTitle: r.text({
			label: { en: "Meta Title", sk: "Meta titulok" },
			description: {
				en: "Default title for pages that don't override it",
				sk: "Predvolený titulok pre stránky bez vlastného SEO",
			},
			localized: true,
		}),
		metaDescription: r.textarea({
			label: { en: "Meta Description", sk: "Meta popis" },
			description: {
				en: "Used for SEO - describe your barbershop in 150-160 characters",
				sk: "Používa sa pre SEO - opíšte podnik v 150-160 znakoch",
			},
			maxLength: 160,
			localized: true,
		}),
	}))
	.form(({ v, f }) =>
		v.form({
			// Sidebar for status/quick settings
			sidebar: {
				position: "right",
				fields: [f.isOpen, f.bookingEnabled],
			},
			// Main content with tabs
			fields: [
				{
					type: "tabs",
					tabs: [
						{
							id: "general",
							label: { en: "General", sk: "Všeobecné" },
							fields: [
								{
									type: "section",
									label: { en: "Branding", sk: "Branding" },
									layout: "grid",
									columns: 2,
									fields: [f.shopName, f.tagline, f.logo],
								},
								{
									type: "section",
									label: { en: "Header Navigation", sk: "Hlavička" },
									fields: [f.navigation, f.ctaButtonText, f.ctaButtonLink],
								},
							],
						},
						{
							id: "contact",
							label: { en: "Contact", sk: "Kontakt" },
							fields: [
								{
									type: "section",
									label: { en: "Contact & Location", sk: "Kontakt a poloha" },
									layout: "grid",
									columns: 2,
									fields: [
										f.contactEmail,
										f.contactPhone,
										f.address,
										f.city,
										f.zipCode,
										f.country,
										f.mapEmbedUrl,
									],
								},
							],
						},
						{
							id: "business",
							label: { en: "Business", sk: "Prevádzka" },
							fields: [
								{
									type: "section",
									label: { en: "Business Hours", sk: "Otváracie hodiny" },
									fields: [f.businessHours],
								},
								{
									type: "section",
									label: { en: "Booking Settings", sk: "Nastavenia rezervácií" },
									fields: [f.bookingSettings],
								},
							],
						},
						{
							id: "social-footer",
							label: { en: "Social & Footer", sk: "Sociálne siete a pätička" },
							fields: [
								{
									type: "section",
									label: { en: "Social Media", sk: "Sociálne siete" },
									fields: [f.socialLinks],
								},
								{
									type: "section",
									label: { en: "Footer", sk: "Pätička" },
									fields: [f.footerTagline, f.footerLinks, f.copyrightText],
								},
							],
						},
						{
							id: "seo",
							label: { en: "SEO", sk: "SEO" },
							fields: [
								{
									type: "section",
									label: { en: "SEO Settings", sk: "SEO nastavenia" },
									fields: [f.metaTitle, f.metaDescription],
								},
							],
						},
					],
				},
			],
		}),
	);
