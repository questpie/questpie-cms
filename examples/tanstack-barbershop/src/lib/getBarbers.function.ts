import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { client } from "@/lib/cms-client";

function getLocaleFromCookie(cookieHeader?: string): "en" | "sk" {
	if (!cookieHeader) return "en";
	const match = cookieHeader.match(/barbershop-locale=([^;]+)/);
	return match?.[1] === "sk" ? "sk" : "en";
}

export const getBarber = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string; locale?: string }) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const cookie = headers.get("cookie");
		const locale = data.locale || getLocaleFromCookie(cookie || undefined);

		// Find barber by slug (include relations)
		const barber = await client.collections.barbers.findOne({
			where: { slug: data.slug },
			locale,
			with: {
				avatar: true,
				services: {
					where: { isActive: true },
				},
			},
		});

		if (!barber) {
			throw notFound();
		}

		return {
			barber: {
				id: barber.id,
				name: barber.name,
				email: barber.email,
				phone: barber.phone,
				bio: barber.bio,
				avatar: barber.avatar?.url ?? null,
				isActive: barber.isActive,
				specialties: barber.specialties,
				services: barber.services,
				socialLinks: barber.socialLinks,
				workingHours: barber.workingHours,
			},
		};
	});

export const getAllBarbers = createServerFn({ method: "GET" })
	.inputValidator((data: { locale?: string } | undefined) => data)
	.handler(async ({ data }) => {
		const headers = getRequestHeaders();
		const cookie = headers.get("cookie");
		const locale = data?.locale || getLocaleFromCookie(cookie || undefined);
		const result = await client.collections.barbers.find({
			where: { isActive: true },
			locale,
			with: {
				avatar: true,
			},
		});

		return {
			barbers: result.docs.map((b) => ({
				id: b.id,
				name: b.name,
				slug: b.slug,
				bio: b.bio,
				avatar: b.avatar?.url ?? null,
				specialties: b.specialties,
			})),
		};
	});
