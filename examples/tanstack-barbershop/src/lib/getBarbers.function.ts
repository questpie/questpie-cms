import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { cms, createServerContext } from "@/lib/server-helpers";

export const getBarber = createServerFn({ method: "GET" })
	.inputValidator((data: { slug: string; locale?: string }) => data)
	.handler(async ({ data }) => {
		const ctx = await createServerContext(data.locale);

		const barber = await cms.api.collections.barbers.findOne(
			{
				where: { slug: data.slug },
				with: {
					avatar: true,
					services: {
						where: { isActive: true },
					},
				},
			},
			ctx,
		);

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
				avatar: (barber.avatar as any)?.url ?? null,
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
		const ctx = await createServerContext(data?.locale);

		const result = await cms.api.collections.barbers.find(
			{
				where: { isActive: true },
				with: { avatar: true },
			},
			ctx,
		);

		return {
			barbers: result.docs.map((b) => ({
				id: b.id,
				name: b.name,
				slug: b.slug,
				bio: b.bio,
				avatar: (b.avatar as any)?.url ?? null,
				specialties: b.specialties,
			})),
		};
	});
