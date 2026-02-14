import { createServerFn } from "@tanstack/react-start";
import { cms, createServerContext } from "@/lib/server-helpers";

export const getAllServices = createServerFn({ method: "GET" })
	.inputValidator((data: { locale?: string } | undefined) => data)
	.handler(async ({ data }) => {
		const ctx = await createServerContext(data?.locale);

		const result = await cms.api.collections.services.find(
			{
				where: { isActive: true },
				orderBy: { price: "asc" },
				with: { image: true },
			},
			ctx,
		);

		return {
			services: result.docs.map((s) => ({
				id: s.id,
				name: s.name,
				description: s.description,
				price: s.price,
				duration: s.duration,
				image: s.image,
			})),
		};
	});
