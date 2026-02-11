import { getApp } from "questpie";
import { qb } from "@/questpie/server/builder";
import type { AppCMS } from "@/questpie/server/cms";

export const appointments = qb
	.collection("appointments")
	.fields((f) => ({
		customer: f.relation({
			to: "user",
			required: true,
			label: { en: "Customer", sk: "Zákazník" },
		}),
		barber: f.relation({
			to: "barbers",
			required: true,
			label: { en: "Barber", sk: "Holič" },
		}),
		service: f.relation({
			to: "services",
			required: true,
			label: { en: "Service", sk: "Služba" },
		}),
		scheduledAt: f.datetime({
			required: true,
			label: { en: "Scheduled At", sk: "Naplánované na" },
		}),
		status: f.select({
			required: true,
			default: "pending",
			label: { en: "Status", sk: "Stav" },
			options: [
				{ value: "pending", label: { en: "Pending", sk: "Čakajúce" } },
				{ value: "confirmed", label: { en: "Confirmed", sk: "Potvrdené" } },
				{ value: "completed", label: { en: "Completed", sk: "Dokončené" } },
				{ value: "cancelled", label: { en: "Cancelled", sk: "Zrušené" } },
				{ value: "no-show", label: { en: "No Show", sk: "Neprišiel" } },
			],
		}),
		notes: f.textarea({
			label: { en: "Notes", sk: "Poznámky" },
		}),
		// Cancellation fields
		cancelledAt: f.datetime({
			label: { en: "Cancelled At", sk: "Zrušené dňa" },
		}),
		// Cancellation reason - only shown when status is "cancelled"
		cancellationReason: f.textarea({
			label: { en: "Cancellation Reason", sk: "Dôvod zrušenia" },
			meta: {
				admin: {
					// Only show when appointment is cancelled
					hidden: ({ data }: { data: Record<string, unknown> }) =>
						data.status !== "cancelled",
				},
			},
		}),
		displayTitle: f.text({ virtual: true }),
	}))
	.title(({ f }) => f.displayTitle)
	.admin(({ c }) => ({
		label: { en: "Appointments", sk: "Rezervácie" },
		icon: c.icon("ph:calendar"),
	}))
	.list(({ v }) => v.table({}))
	.form(({ v, f }) =>
		v.form({
			sidebar: {
				position: "right",
				fields: [f.status],
			},
			fields: [
				{
					type: "section",
					label: { en: "Booking Details", sk: "Detaily rezervácie" },
					layout: "grid",
					columns: 2,
					fields: [f.customer, f.barber, f.service, f.scheduledAt],
				},
				{
					type: "section",
					label: { en: "Notes", sk: "Poznámky" },
					fields: [f.notes],
				},
				{
					type: "section",
					label: { en: "Cancellation", sk: "Zrušenie" },
					fields: [f.cancelledAt, f.cancellationReason],
				},
			],
		}),
	)
	.hooks({
		afterRead: ({ data }) => {
			if (!data) return;
			const scheduledAt = (data as any).scheduledAt as Date | undefined;
			const dateLabel = scheduledAt
				? scheduledAt.toISOString().replace("T", " ").slice(0, 16)
				: "";
			(data as any).displayTitle =
				`${(data as any).customer ?? "Customer"} - ${dateLabel}`.trim();
		},
		afterChange: async ({ data, operation, original, app }) => {
			const cms = getApp<AppCMS>(app);

			if (operation === "create") {
				await cms.queue.sendAppointmentConfirmation.publish({
					appointmentId: (data as any).id,
					customerId: (data as any).customer,
				});
			} else if (operation === "update" && original) {
				if ((data as any).status === "cancelled" && (data as any).cancelledAt) {
					await cms.queue.sendAppointmentCancellation.publish({
						appointmentId: (data as any).id,
						customerId: (data as any).customer,
					});
				}
			}
		},
	});
