import { boolean, integer, jsonb, varchar } from "drizzle-orm/pg-core";
import { q } from "questpie";

/**
 * Services Collection
 *
 * Demonstrates localized fields - name and description are stored
 * in a separate _i18n table for multi-language support.
 */
export const services = q
	.collection("services")
	.fields({
		// These fields will be localized (stored in services_i18n table)
		name: varchar("name", { length: 255 }).notNull(),
		description: jsonb("description"), // Rich text content
		// Non-localized fields (stored in services table)
		image: varchar("image", { length: 255 }), // Asset ID for service image
		duration: integer("duration").notNull(), // in minutes
		price: integer("price").notNull(), // in cents
		isActive: boolean("is_active").default(true).notNull(),
	})
	// Mark which fields should be localized
	.localized(["name", "description"])
	.relations(({ one, table, manyToMany }) => ({
		// Relation to assets collection for service image
		image: one("assets", {
			fields: [table.image],
			references: ["id"],
		}),
		// M:N relation to barbers (through barberServices junction)
		barbers: manyToMany("barbers", {
			through: "barber_services",
			sourceField: "serviceId",
			targetField: "barberId",
		}),
	}))
	.title(({ f }) => f.name);
