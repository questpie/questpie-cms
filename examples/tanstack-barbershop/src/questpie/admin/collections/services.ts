/**
 * Services Admin Configuration
 *
 * Demonstrates:
 * - Simple form with sections
 * - Number fields with min/max
 * - Reverse relation field (shows barbers that offer this service)
 * - Field hooks: compute, onChange, defaultValue
 */

import { Scissors } from "@phosphor-icons/react";
import { builder } from "@/questpie/admin/builder";

export const servicesAdmin = builder
	.collection("services")
	.meta({
		label: { en: "Services", sk: "Služby" },
		icon: Scissors,
	})
	.fields(({ r }) => ({
		name: r.text({
			label: { en: "Service Name", sk: "Nazov sluzby" },
			maxLength: 255,
			required: true,
			localized: true,
			// onChange hook - side effects when name changes
			onChange: (value, { setValue }) => {
				console.log("[Field Hook] name onChange:", value);
				// Could auto-generate slug, update other fields, etc.
			},
		}),
		description: r.textarea({
			label: { en: "Description", sk: "Popis" },
		}),
		image: r.upload({
			label: { en: "Service Image", sk: "Obrazok sluzby" },
			accept: ["image/*"],
			maxSize: 5_000_000, // 5MB
			previewVariant: "card",
		}),
		duration: r.number({
			label: { en: "Duration (minutes)", sk: "Trvanie (minuty)" },
			min: 0,
			required: true,
		}),
		price: r.number({
			label: { en: "Price", sk: "Cena" },
			description: (values: Record<string, any>) =>
				values.duration
					? {
							en: `Total for ${values.duration} min`,
							sk: `Celkovo za ${values.duration} min`,
						}
					: {
							en: "Total price",
							sk: "Celkova cena",
						},
			min: 0,
			step: 0.01,
			required: true,
			// onChange hook - logs when price changes
			onChange: (value) => {
				console.log("[Field Hook] price onChange:", value);
			},
		}),
		// Computed field - price per minute
		// Uses proxy-tracked compute function (auto-detects dependencies)
		// Works in both form (reactive) and table (static)
		// Implies: readOnly + not submitted to backend
		pricePerMinute: r.text({
			label: { en: "Price/Minute", sk: "Cena/Minuta" },
			compute: (values) => {
				if (values.price && values.duration) {
					return `€${(values.price / values.duration).toFixed(2)}/min`;
				}
				return "-";
			},
		}),
		isActive: r.switch({
			label: { en: "Active", sk: "Aktivne" },
			// defaultValue hook - new services are active by default
			defaultValue: true,
		}),
		// Reverse relation - shows which barbers offer this service
		// Note: This requires a M:N relation "services" on the barbers collection
		offeredBy: r.reverseRelation({
			label: { en: "Offered by", sk: "Ponukaju" },
			description: {
				en: "Barbers who offer this service",
				sk: "Barberi, ktori ponukaju tuto sluzbu",
			},
			sourceCollection: "barbers",
			sourceField: "services", // M:N field on barbers that references services
			display: "table",
			linkToDetail: true,
			openInSheet: true, // Open barbers in side sheet for quick editing
			emptyMessage: {
				en: "No barbers offer this service yet.",
				sk: "Ziadni barberi este neponukaju tuto sluzbu.",
			},
			allowCreate: true, // Allow creating new barbers with this service pre-selected
			createLabel: { en: "Add barber", sk: "Pridat barbera" },
		}),
	}))
	.list(({ v, f }) =>
		v.table({
			// pricePerMinute will be computed in table too!
			columns: [f.name, f.duration, f.price, f.pricePerMinute, f.isActive],
		}),
	)
	.form(({ v, f }) =>
		v.form({
			sidebar: {
				position: "right",
				fields: [f.isActive, f.image],
			},
			fields: [
				{
					type: "section",
					label: { en: "Service Details", sk: "Detaily sluzby" },
					fields: [f.name, f.description],
				},
				{
					type: "section",
					label: { en: "Pricing & Duration", sk: "Cena a trvanie" },
					layout: "grid",
					columns: 3,
					fields: [f.duration, f.price, f.pricePerMinute],
				},
				{
					type: "section",
					fields: [f.offeredBy],
				},
			],
		}),
	);
