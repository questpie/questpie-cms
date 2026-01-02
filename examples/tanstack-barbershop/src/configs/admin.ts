/**
 * Admin Configuration
 *
 * UI generation with explicit field config overrides
 */

import { defineAdminConfig } from "@questpie/admin/config";
import type { AppCMS } from "@/server/cms";

export const adminConfig = defineAdminConfig<AppCMS>()({
	app: {
		brand: {
			name: "Barbershop Admin",
			homeRoute: "/admin",
		},
		debug: {
			showQueryDevtools: true,
			showRouterDevtools: true,
		},
	},
	collections: {
		// Most UI is auto-generated; field types are explicit in config.

		barbers: {
			label: "Barbers",
			icon: "user",

			// List view config
			list: {
				defaultColumns: ["name", "email", "phone", "isActive"],
				defaultSort: { field: "name", direction: "asc" },
			},

			// Edit/Create form config
			edit: {
				// Field order (auto-detected if not specified)
				fields: ["name", "email", "phone", "bio", "avatar", "isActive"],

				// Optional: Organize into sections
				sections: [
					{
						title: "Basic Information",
						fields: ["name", "email", "phone"],
					},
					{
						title: "Profile",
						fields: ["bio", "avatar"],
					},
					{
						title: "Settings",
						fields: ["isActive"],
					},
				],
			},

			// Field-level overrides
			fields: {
				name: {
					label: "Full Name",
					type: "text",
					required: true,
				},
				email: {
					label: "Email Address",
					type: "email",
					required: true,
				},
				phone: {
					label: "Phone Number",
					type: "text",
					placeholder: "+1 (555) 123-4567",
				},
				bio: {
					label: "Biography",
					type: "richText",
					placeholder: "Tell us about this barber...",
					richText: {
						outputFormat: "html",
						showCharacterCount: true,
						maxCharacters: 2000,
					},
				},
				avatar: {
					label: "Avatar URL",
					type: "text",
					placeholder: "https://...",
				},
				isActive: {
					label: "Active Status",
					type: "switch",
					list: {
						renderCell: "StatusBadge", // Custom cell renderer
					},
				},
			},
		},

		services: {
			label: "Services",
			icon: "scissors",
			list: {
				defaultColumns: ["name", "duration", "price", "isActive"],
			},
			fields: {
				name: {
					type: "text",
				},
				description: {
					type: "textarea",
				},
				duration: {
					type: "number",
				},
				price: {
					label: "Price (USD)",
					type: "number",
					list: {
						renderCell: "PriceCell", // Format as $XX.XX
					},
				},
				isActive: {
					type: "switch",
				},
			},
		},

		appointments: {
			label: "Appointments",
			icon: "calendar",

			// Enable versioning and audit logging
			versioned: true,
			auditLog: {
				fields: ["status", "scheduledAt", "cancelledAt", "cancellationReason"],
				trackUser: true,
				retentionDays: 365,
			},

			list: {
				defaultColumns: ["scheduledAt", "barber", "service", "status"],
				defaultSort: { field: "scheduledAt", direction: "desc" },
				with: ["barber", "service", "customer"],
			},

			edit: {
				// Show version history in edit form
				showVersionHistory: true,
				layout: "with-sidebar",
				fields: [
					"customerId",
					"barberId",
					"serviceId",
					"scheduledAt",
					"status",
					"notes",
					"cancelledAt",
					"cancellationReason",
				],

				sections: [
					{
						title: "Appointment Details",
						layout: "grid",
						grid: { columns: 2, gap: 4 },
						fields: [
							{ field: "customerId", span: 1 },
							{ field: "barberId", span: 1 },
							{ field: "serviceId", span: 1 },
							{ field: "scheduledAt", span: 1 },
						],
					},
					{
						title: "Notes",
						fields: ["notes"],
					},
					{
						title: "Cancellation",
						description: "Only shown when status is cancelled",
						visible: (values) => values.status === "cancelled",
						fields: ["cancelledAt", "cancellationReason"],
					},
				],
				sidebar: {
					position: "right",
					width: "320px",
					fields: ["status"],
				},
			},

			fields: {
				customerId: {
					label: "Customer",
					required: true,
					relation: {
						targetCollection: "customers",
						mode: "inline",
					},
				},
				barberId: {
					label: "Barber",
					required: true,
					relation: {
						targetCollection: "barbers",
						mode: "inline",
					},
				},
				serviceId: {
					label: "Service",
					required: true,
					relation: {
						targetCollection: "services",
						mode: "inline",
					},
				},
				scheduledAt: {
					label: "Scheduled Date & Time",
					type: "datetime",
					required: true,
				},
				status: {
					label: "Status",
					type: "select",
					options: [
						{ label: "Pending", value: "pending" },
						{ label: "Confirmed", value: "confirmed" },
						{ label: "Completed", value: "completed" },
						{ label: "Cancelled", value: "cancelled" },
						{ label: "No Show", value: "no-show" },
					],
					list: {
						renderCell: "StatusBadge",
					},
				},
				notes: {
					label: "Notes",
					type: "textarea",
					placeholder: "Special requests or instructions...",
				},
				cancelledAt: {
					label: "Cancellation Date",
					type: "datetime",
					// Only visible when status is "cancelled"
					visible: (values) => values.status === "cancelled",
					readOnly: true, // Auto-set by backend
				},
				cancellationReason: {
					label: "Cancellation Reason",
					type: "textarea",
					placeholder: "Why was this appointment cancelled?",
					// Only visible and required when status is "cancelled"
					visible: (values) => values.status === "cancelled",
					required: (values) => values.status === "cancelled",
				},
			},
		},

		reviews: {
			label: "Reviews",
			icon: "star",
			list: {
				defaultColumns: ["rating", "customer", "barber", "createdAt"],
				with: ["customer", "barber", "appointment"],
			},
			fields: {
				appointmentId: {
					label: "Appointment",
					relation: {
						targetCollection: "appointments",
						mode: "inline",
					},
				},
				customerId: {
					label: "Customer",
					relation: {
						targetCollection: "customers",
						mode: "inline",
					},
				},
				barberId: {
					label: "Barber",
					relation: {
						targetCollection: "barbers",
						mode: "inline",
					},
				},
				rating: {
					label: "Rating",
					type: "number",
				},
				comment: {
					label: "Comment",
					type: "textarea",
				},
			},
		},
	},
});

export type AdminConfig = typeof adminConfig;
