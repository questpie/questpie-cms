/**
 * Reviews Admin Configuration
 *
 * Demonstrates:
 * - Multiple relation fields
 * - Collapsible sections
 */

import { Star } from "@phosphor-icons/react";
import { builder } from "@/questpie/admin/builder";

export const reviewsAdmin = builder
	.collection("reviews")
	.meta({
		label: { en: "Reviews", sk: "Recenzie" },
		icon: Star,
	})
	.fields(({ r }) => ({
		appointmentId: r.relation({
			targetCollection: "appointments",
			type: "single",
			label: { en: "Appointment", sk: "Rezervacia" },
			required: true,
			relationName: "appointment",
		}),
		customerId: r.relation({
			targetCollection: "user",
			type: "single",
			label: { en: "Customer", sk: "Zakaznik" },
			required: true,
			relationName: "customer",
		}),
		barberId: r.relation({
			targetCollection: "barbers",
			type: "single",
			label: { en: "Barber", sk: "Holic" },
			required: true,
			relationName: "barber",
		}),
		rating: r.number({
			label: { en: "Rating", sk: "Hodnotenie" },
			min: 1,
			max: 5,
			required: true,
		}),
		comment: r.textarea({
			label: { en: "Comment", sk: "Komentar" },
		}),
		isApproved: r.switch({
			label: { en: "Approved", sk: "Schvalene" },
			description: {
				en: "Show this review publicly",
				sk: "Zobrazit tuto recenzi verejne",
			},
		}),
	}))
	.list(({ v, f }) =>
		v.table({
			columns: [f.barberId, f.customerId, f.rating, f.isApproved],
		}),
	)
	.form(({ v, f }) =>
		v.form({
			sidebar: {
				position: "right",
				fields: [f.isApproved, f.rating],
			},
			fields: [
				{
					type: "section",
					label: { en: "Review Details", sk: "Detaily recenzie" },
					layout: "grid",
					columns: 3,
					fields: [f.appointmentId, f.customerId, f.barberId],
				},
				{
					type: "section",
					label: { en: "Content", sk: "Obsah" },
					fields: [f.comment],
				},
			],
		}),
	);
