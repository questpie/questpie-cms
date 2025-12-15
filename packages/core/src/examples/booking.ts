import { defineCollection } from "@qcms/core/collection/define-collection";
import { defineServerCollection } from "@qcms/core/collection/define-collection.server";

export const BookingCollectionExample = defineCollection({
	name: "bookings",
	label: "Bookings",
	description: "Customer bookings for services",
	fields: {
		customerName: { type: "text", label: "Customer Name", required: true },
		service: {
			type: "select",
			label: "Service",
			required: true,
			// Example options for select field
			options: [
				{ value: "haircut", label: "Haircut" },
				{ value: "massage", label: "Massage" },
				{ value: "manicure", label: "Manicure" },
			],
		},
		appointmentDate: {
			type: "dateTime",
			label: "Appointment Date",
			required: true,
		},
		guests: {
			type: "array",
			label: "Guests",
			required: true,
			fields: {
				name: { type: "text", label: "Guest Name", required: true },
				age: { type: "number", label: "Guest Age" },
			},
			min: 1,
			max: 5,
		},
		notes: { type: "textarea", label: "Additional Notes" },
		confirmed: { type: "boolean", label: "Confirmed", defaultValue: false },
	},
});

const BookingServerExample = defineServerCollection(BookingCollectionExample, {
	hooks: {
		beforeCreate: async ({ data, ctx }) => {
			// Example: Automatically set confirmed to false on creation
			return {
				...data,
				confirmed: false,
			};
		},
	},
	titleAccessor: (item) => `${item.customerName} - ${item.service}`,
	fields: {
		guests: {},
	},
});

console.log(
	"Booking collection and server config defined.",
	BookingServerExample,
);
