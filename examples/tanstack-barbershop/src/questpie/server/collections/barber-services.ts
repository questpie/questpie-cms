import { q } from "questpie";
import { text } from "drizzle-orm/pg-core";
import { barbers } from "@/questpie/server/collections/barbers";
import { services } from "@/questpie/server/collections/services";

export const barberServices = q.collection("barber_services").fields({
  barberId: text("barber_id")
    .notNull()
    .references(() => barbers.table.id, { onDelete: "cascade" }),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.table.id, { onDelete: "cascade" }),
});
