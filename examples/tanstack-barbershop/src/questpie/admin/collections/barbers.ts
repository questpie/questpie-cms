/**
 * Barbers Admin Configuration (Localized EN/SK)
 *
 * Collection meta label supports I18nText for inline translations.
 * Field labels use plain strings (localized via message keys if needed).
 */

import { UsersIcon } from "@phosphor-icons/react/dist/ssr";
import { builder } from "@/questpie/admin/builder";

export const barbersAdmin = builder
	.collection("barbers")
	.meta({
		label: { en: "Barbers", sk: "Holiči" },
		icon: UsersIcon,
	})
	// Live preview for barber profiles
	.preview({
		url: (values) => {
			const name = values.name as string | undefined;
			const slug = name?.toLowerCase().replace(/\s+/g, "-") || "barber";
			return `/barbers/${slug}?preview=true`;
		},
		enabled: true,
		position: "right",
		defaultWidth: 50,
	})
	.fields(({ r }) => ({
		name: r.text({
			label: { en: "Full Name", sk: "Cele meno" },
			placeholder: { en: "John Doe", sk: "Jan Novak" },
			maxLength: 255,
		}),
		email: r.email({
			label: { en: "Email Address", sk: "Emailova adresa" },
			placeholder: { en: "barber@example.com", sk: "barber@priklad.sk" },
		}),
		phone: r.text({
			label: { en: "Phone Number", sk: "Telefonne cislo" },
			placeholder: { en: "+1 (555) 000-0000", sk: "+421 900 000 000" },
		}),
		bio: r.richText({
			label: { en: "Biography", sk: "Zivotopis" },
			description: {
				en: "A short description about the barber (supports rich formatting)",
				sk: "Kratky popis o barberovi (podporuje formatovanie)",
			},
		}),
		avatar: r.upload({
			label: { en: "Profile Photo", sk: "Profilova fotka" },
			accept: ["image/*"],
			maxSize: 5_000_000,
			previewVariant: "compact",
		}),
		isActive: r.switch({
			label: { en: "Active", sk: "Aktivny" },
			description: {
				en: "Whether this barber is currently available for appointments",
				sk: "Ci je barber aktualne dostupny na objednavky",
			},
		}),
		services: r.relation({
			label: { en: "Services Offered", sk: "Ponukane sluzby" },
			description: {
				en: "Select the services this barber can perform",
				sk: "Vyberte sluzby, ktore barber poskytuje",
			},
			targetCollection: "services",
			type: "multiple",
		}),
		workingHours: r.object({
			label: { en: "Working Hours", sk: "Pracovna doba" },
			description: {
				en: "Set the working schedule for each day",
				sk: "Nastavte pracovny rozvrh pre kazdy den",
			},
			layout: "grid",
			wrapper: "collapsible",
			fields: ({ r }) => ({
				monday: r.object({
					label: { en: "Monday", sk: "Pondelok" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({ label: { en: "Open", sk: "Otvorene" } }),
						start: r.time({ label: { en: "Start", sk: "Zaciatok" } }),
						end: r.time({ label: { en: "End", sk: "Koniec" } }),
					}),
				}),
				tuesday: r.object({
					label: { en: "Tuesday", sk: "Utorok" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({ label: { en: "Open", sk: "Otvorene" } }),
						start: r.time({ label: { en: "Start", sk: "Zaciatok" } }),
						end: r.time({ label: { en: "End", sk: "Koniec" } }),
					}),
				}),
				wednesday: r.object({
					label: { en: "Wednesday", sk: "Streda" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({ label: { en: "Open", sk: "Otvorene" } }),
						start: r.time({ label: { en: "Start", sk: "Zaciatok" } }),
						end: r.time({ label: { en: "End", sk: "Koniec" } }),
					}),
				}),
				thursday: r.object({
					label: { en: "Thursday", sk: "Stvrtok" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({ label: { en: "Open", sk: "Otvorene" } }),
						start: r.time({ label: { en: "Start", sk: "Zaciatok" } }),
						end: r.time({ label: { en: "End", sk: "Koniec" } }),
					}),
				}),
				friday: r.object({
					label: { en: "Friday", sk: "Piatok" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({ label: { en: "Open", sk: "Otvorene" } }),
						start: r.time({ label: { en: "Start", sk: "Zaciatok" } }),
						end: r.time({ label: { en: "End", sk: "Koniec" } }),
					}),
				}),
				saturday: r.object({
					label: { en: "Saturday", sk: "Sobota" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({ label: { en: "Open", sk: "Otvorene" } }),
						start: r.time({ label: { en: "Start", sk: "Zaciatok" } }),
						end: r.time({ label: { en: "End", sk: "Koniec" } }),
					}),
				}),
				sunday: r.object({
					label: { en: "Sunday", sk: "Nedela" },
					layout: "inline",
					fields: ({ r }) => ({
						isOpen: r.switch({ label: { en: "Open", sk: "Otvorene" } }),
						start: r.time({ label: { en: "Start", sk: "Zaciatok" } }),
						end: r.time({ label: { en: "End", sk: "Koniec" } }),
					}),
				}),
			}),
		}),
		socialLinks: r.array({
			label: { en: "Social Links", sk: "Socialne siete" },
			description: {
				en: "Add social media profiles",
				sk: "Pridajte profily na socialnych sietach",
			},
			item: ({ r }) => ({
				platform: r.select({
					label: { en: "Platform", sk: "Platforma" },
					options: [
						{ label: "Instagram", value: "instagram" },
						{ label: "Facebook", value: "facebook" },
						{ label: "Twitter", value: "twitter" },
						{ label: "LinkedIn", value: "linkedin" },
						{ label: "TikTok", value: "tiktok" },
					],
				}),
				url: r.text({
					label: { en: "URL", sk: "URL" },
					placeholder: { en: "https://...", sk: "https://..." },
				}),
			}),
			orderable: true,
			maxItems: 5,
			itemLabel: (item) => item?.platform || "New link",
			mode: "inline",
		}),
	}))
	.list(({ v }) => v.table({}))
	.form(({ v, f }) =>
		v.form({
			sidebar: {
				position: "right",
				fields: [f.isActive, f.avatar],
			},
			fields: [
				{
					type: "section",
					label: { en: "Contact Information", sk: "Kontaktne informacie" },
					layout: "grid",
					columns: 2,
					fields: [f.name, f.email, f.phone],
				},
				{
					type: "section",
					label: { en: "Profile", sk: "Profil" },
					fields: [f.bio],
				},
				{
					type: "section",
					label: { en: "Services", sk: "Sluzby" },
					description: {
						en: "Services this barber offers",
						sk: "Sluzby, ktore barber poskytuje",
					},
					fields: [f.services],
				},
				{
					type: "section",
					fields: [f.socialLinks],
				},
				{
					type: "section",
					fields: [f.workingHours],
				},
			],
		}),
	);
