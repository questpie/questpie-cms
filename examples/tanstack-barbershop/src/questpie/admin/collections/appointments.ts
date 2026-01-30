/**
 * Appointments Admin Configuration
 *
 * Demonstrates:
 * - Relation fields with targetCollection
 * - Tabs layout with sections
 * - Sidebar for status field
 */

import { CalendarCheck } from "@phosphor-icons/react";
import { builder } from "@/questpie/admin/builder";

export const appointmentsAdmin = builder
	.collection("appointments")
	.meta({
		label: { en: "Appointments", sk: "Rezervácie" },
		icon: CalendarCheck,
	})
	.fields(({ r }) => ({
		customerId: r.relation({
			targetCollection: "user",
			label: { en: "Customer", sk: "Zakaznik" },
			type: "single",
			required: true,
			relationName: "customer", // Backend relation name for auto-expand
		}),
		barberId: r.relation({
			targetCollection: "barbers",
			type: "single",
			required: true,
			label: { en: "Barber", sk: "Holic" },
			relationName: "barber", // Backend relation name for auto-expand
		}),
		serviceId: r.relation({
			targetCollection: "services",
			type: "single",
			label: { en: "Service", sk: "Sluzba" },
			required: true,
			relationName: "service", // Backend relation name for auto-expand
		}),
		scheduledAt: r.datetime({
			required: true,
			label: { en: "Scheduled At", sk: "Termin" },
		}),
		status: r.select({
			label: { en: "Status", sk: "Stav" },
			options: [
				{ label: "Pending", value: "pending" },
				{ label: "Confirmed", value: "confirmed" },
				{ label: "Completed", value: "completed" },
				{ label: "Cancelled", value: "cancelled" },
			],
		}),
		notes: r.textarea({
			label: { en: "Notes", sk: "Poznamky" },
		}),
	}))
	.list(({ v, f }) =>
		v.table({
			columns: [f.customerId, f.barberId, f.serviceId, f.scheduledAt, f.status],
		}),
	)
	.form(({ v, f }) =>
		v.form({
			// Sidebar for status
			sidebar: {
				position: "right",
				fields: [f.status],
			},
			// Main content with tabs
			fields: [
				{
					type: "tabs",
					tabs: [
						{
							id: "details",
							label: { en: "Appointment Details", sk: "Detaily rezervacie" },
							fields: [
								{
									type: "section",
									label: {
										en: "Customer & Service",
										sk: "Zakaznik a sluzba",
									},
									layout: "grid",
									columns: 2,
									fields: [f.customerId, f.serviceId],
								},
								{
									type: "section",
									label: { en: "Scheduling", sk: "Planovanie" },
									layout: "grid",
									columns: 2,
									fields: [f.barberId, f.scheduledAt],
								},
							],
						},
						{
							id: "notes",
							label: { en: "Notes", sk: "Poznamky" },
							fields: [f.notes],
						},
					],
				},
			],
		}),
	);
