import { boolean, integer, text, varchar } from "drizzle-orm/pg-core";
import { q } from "questpie";

/**
 * Reviews Collection
 *
 * Customer reviews and testimonials.
 * Features:
 * - Rating (1-5 stars)
 * - Localized comment field
 * - Moderation (isApproved)
 * - Featured reviews for homepage
 */
export const reviews = q
	.collection("reviews")
	.fields({
		// Customer info (can be from user or anonymous)
		customerId: varchar("customer_id", { length: 255 }),
		customerName: varchar("customer_name", { length: 255 }).notNull(),
		customerEmail: varchar("customer_email", { length: 255 }),

		// Review target
		barberId: varchar("barber_id", { length: 255 }).notNull(),
		appointmentId: varchar("appointment_id", { length: 255 }),

		// Review content
		rating: integer("rating").notNull(), // 1-5
		comment: text("comment"),

		// Moderation
		isApproved: boolean("is_approved").default(false).notNull(),
		isFeatured: boolean("is_featured").default(false).notNull(),
	})
	.localized(["comment"] as const)
	.relations(({ one, table }) => ({
		customer: one("user", {
			fields: [table.customerId],
			references: ["id"],
		}),
		barber: one("barbers", {
			fields: [table.barberId],
			references: ["id"],
		}),
		appointment: one("appointments", {
			fields: [table.appointmentId],
			references: ["id"],
		}),
	}))
	.title(({ f }) => f.customerName);
