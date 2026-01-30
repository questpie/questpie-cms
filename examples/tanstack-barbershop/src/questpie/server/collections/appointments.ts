import { getApp, q } from "questpie";
import { varchar, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AppCMS } from "@/questpie/server/cms";

export const appointments = q
  .collection("appointments")
  .fields({
    customerId: varchar("customer_id", { length: 255 }).notNull(),
    barberId: varchar("barber_id", { length: 255 }).notNull(),
    serviceId: varchar("service_id", { length: 255 }).notNull(),
    scheduledAt: timestamp("scheduled_at", { mode: "date" }).notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    // Status: pending, confirmed, completed, cancelled, no-show
    notes: text("notes"),
    cancelledAt: timestamp("cancelled_at", { mode: "date" }),
    cancellationReason: text("cancellation_reason"),
  })
  // Display title as a virtual field that combines customer name and scheduled time
  .virtuals(({ table }) => ({
    displayTitle: sql<string>`(
      SELECT COALESCE(u.name, u.email, u.id::text)
      FROM "user" u
      WHERE u.id = ${table.customerId}
    ) || ' - ' || to_char(${table.scheduledAt}, 'DD.MM.YYYY HH24:MI')`,
  }))
  .title(({ f }) => f.displayTitle)
  .relations(({ one, table }) => ({
    customer: one("user", {
      fields: [table.customerId],
      references: ["id"],
    }),
    barber: one("barbers", {
      fields: [table.barberId],
      references: ["id"],
    }),
    service: one("services", {
      fields: [table.serviceId],
      references: ["id"],
    }),
  }))
  .hooks({
    // Use getApp<AppCMS>() for type-safe access
    afterChange: async ({ data, operation, original, app }) => {
      const cms = getApp<AppCMS>(app);

      if (operation === "create") {
        // Send confirmation email after booking
        await cms.queue.sendAppointmentConfirmation.publish({
          appointmentId: data.id,
          customerId: data.customerId,
        });
      } else if (operation === "update" && original) {
        // Notify customer if appointment is cancelled
        if (data.status === "cancelled" && data.cancelledAt) {
          await cms.queue.sendAppointmentCancellation.publish({
            appointmentId: data.id,
            customerId: data.customerId,
          });
        }
      }
    },
  });
