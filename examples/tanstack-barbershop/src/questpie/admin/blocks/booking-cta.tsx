/**
 * Booking CTA Block
 *
 * Specialized call-to-action for booking appointments.
 * Design: Prominent button with optional pre-selected service/barber.
 */

import type { BlockRendererProps } from "@questpie/admin/client";
import { buttonVariants } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";
import { builder } from "../builder";

type BookingCtaValues = {
	title: string;
	description?: string;
	buttonText: string;
	serviceId?: string;
	barberId?: string;
	variant: "default" | "highlight" | "outline";
	size: "default" | "lg";
};

function BookingCtaRenderer({ values }: BlockRendererProps<BookingCtaValues>) {
	// Build booking URL with query params
	const params = new URLSearchParams();
	if (values.serviceId) params.set("service", values.serviceId);
	if (values.barberId) params.set("barber", values.barberId);
	const bookingUrl = `/booking${params.toString() ? `?${params.toString()}` : ""}`;

	const buttonClass = cn(
		buttonVariants({
			size: values.size === "lg" ? "lg" : "default",
			variant: values.variant === "outline" ? "outline" : "default",
		}),
		"text-base font-semibold",
		values.variant === "highlight" &&
			"bg-highlight text-white hover:bg-highlight/90",
		values.variant === "default" &&
			"bg-primary text-primary-foreground hover:bg-primary/90",
		values.variant === "outline" &&
			"border-primary text-primary hover:bg-primary hover:text-primary-foreground",
	);

	return (
		<section className="px-6 py-16">
			<div className="mx-auto max-w-3xl text-center">
				<h2 className="text-3xl font-bold tracking-tight md:text-4xl">
					{values.title || "Book Your Appointment"}
				</h2>
				{values.description && (
					<p className="mt-4 text-lg text-muted-foreground">
						{values.description}
					</p>
				)}
				<div className="mt-8">
					<a href={bookingUrl} className={buttonClass}>
						{values.buttonText || "Book Now"}
					</a>
				</div>
			</div>
		</section>
	);
}

export const bookingCtaBlock = builder
	.block("booking-cta")
	.label({ en: "Booking CTA", sk: "Rezervácia CTA" })
	.description({
		en: "Call-to-action for booking with pre-selection",
		sk: "Výzva na rezerváciu s predvýberom",
	})
	.icon("CalendarPlus")
	.category("call-to-action")
	.fields(({ r }) => ({
		title: r.text({
			label: { en: "Title", sk: "Nadpis" },
			required: true,
			localized: true,
			defaultValue: { en: "Book Your Appointment", sk: "Rezervujte si termín" },
		}),
		description: r.text({
			label: { en: "Description", sk: "Popis" },
			localized: true,
		}),
		buttonText: r.text({
			label: { en: "Button Text", sk: "Text tlačidla" },
			required: true,
			localized: true,
			defaultValue: { en: "Book Now", sk: "Rezervovať" },
		}),
		serviceId: r.relation({
			label: { en: "Pre-select Service", sk: "Predvybrať službu" },
			targetCollection: "services",
			type: "single",
		}),
		barberId: r.relation({
			label: { en: "Pre-select Barber", sk: "Predvybrať holiča" },
			targetCollection: "barbers",
			type: "single",
		}),
		variant: r.select({
			label: { en: "Button Style", sk: "Štýl tlačidla" },
			options: [
				{ value: "default", label: { en: "Default", sk: "Predvolený" } },
				{ value: "highlight", label: { en: "Highlight", sk: "Zvýraznený" } },
				{ value: "outline", label: { en: "Outline", sk: "Obrys" } },
			],
			defaultValue: "default",
		}),
		size: r.select({
			label: { en: "Button Size", sk: "Veľkosť tlačidla" },
			options: [
				{ value: "default", label: { en: "Default", sk: "Predvolená" } },
				{ value: "lg", label: { en: "Large", sk: "Veľká" } },
			],
			defaultValue: "default",
		}),
	}))
	.renderer(BookingCtaRenderer)
	.build();
