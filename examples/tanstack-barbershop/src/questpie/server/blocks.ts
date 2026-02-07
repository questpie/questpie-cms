import { block } from "@questpie/admin/server";

export const heroBlock = block("hero")
	.label({ en: "Hero Section", sk: "Hero sekcia" })
	.icon("ph:image")
	.category("sections")
	.fields((f) => ({
		title: f.text({
			label: { en: "Title", sk: "Nadpis" },
			localized: true,
			required: true,
		}),
		subtitle: f.textarea({
			label: { en: "Subtitle", sk: "Podnadpis" },
			localized: true,
		}),
		backgroundImage: f.upload({
			label: { en: "Background Image", sk: "Obrázok pozadia" },
		}),
		overlayOpacity: f.number({
			label: { en: "Overlay Opacity", sk: "Priehľadnosť" },
			defaultValue: 60,
		}),
		alignment: f.select({
			label: { en: "Alignment", sk: "Zarovnanie" },
			options: [
				{ value: "left", label: { en: "Left", sk: "Vľavo" } },
				{ value: "center", label: { en: "Center", sk: "Stred" } },
				{ value: "right", label: { en: "Right", sk: "Vpravo" } },
			],
			defaultValue: "center",
		}),
		ctaText: f.text({
			label: { en: "CTA Text", sk: "Text tlačidla" },
			localized: true,
		}),
		ctaLink: f.text({ label: { en: "CTA Link", sk: "Odkaz tlačidla" } }),
		height: f.select({
			label: { en: "Height", sk: "Výška" },
			options: [
				{ value: "small", label: { en: "Small", sk: "Malá" } },
				{ value: "medium", label: { en: "Medium", sk: "Stredná" } },
				{ value: "large", label: { en: "Large", sk: "Veľká" } },
				{ value: "full", label: { en: "Full", sk: "Plná" } },
			],
			defaultValue: "medium",
		}),
	}));

export const textBlock = block("text")
	.label({ en: "Text Block", sk: "Textový blok" })
	.icon("ph:text-t")
	.category("content")
	.fields((f) => ({
		content: f.richText({
			label: { en: "Content", sk: "Obsah" },
			localized: true,
			required: true,
		}),
		maxWidth: f.select({
			label: { en: "Max Width", sk: "Max šírka" },
			options: [
				{ value: "narrow", label: { en: "Narrow", sk: "Úzky" } },
				{ value: "medium", label: { en: "Medium", sk: "Stredný" } },
				{ value: "wide", label: { en: "Wide", sk: "Široký" } },
				{ value: "full", label: { en: "Full", sk: "Plný" } },
			],
			defaultValue: "medium",
		}),
		padding: f.select({
			label: { en: "Padding", sk: "Odsadenie" },
			options: [
				{ value: "none", label: { en: "None", sk: "Žiadne" } },
				{ value: "small", label: { en: "Small", sk: "Malé" } },
				{ value: "medium", label: { en: "Medium", sk: "Stredné" } },
				{ value: "large", label: { en: "Large", sk: "Veľké" } },
			],
			defaultValue: "medium",
		}),
	}));

export const headingBlock = block("heading")
	.label({ en: "Heading", sk: "Nadpis" })
	.icon("ph:text-h-one")
	.category("content")
	.fields((f) => ({
		text: f.text({
			label: { en: "Text", sk: "Text" },
			localized: true,
			required: true,
		}),
		level: f.select({
			label: { en: "Level", sk: "Úroveň" },
			options: [
				{ value: "h1", label: "H1" },
				{ value: "h2", label: "H2" },
				{ value: "h3", label: "H3" },
				{ value: "h4", label: "H4" },
			],
			defaultValue: "h2",
		}),
		align: f.select({
			label: { en: "Alignment", sk: "Zarovnanie" },
			options: [
				{ value: "left", label: { en: "Left", sk: "Vľavo" } },
				{ value: "center", label: { en: "Center", sk: "Stred" } },
				{ value: "right", label: { en: "Right", sk: "Vpravo" } },
			],
			defaultValue: "left",
		}),
		padding: f.select({
			label: { en: "Padding", sk: "Odsadenie" },
			options: [
				{ value: "none", label: { en: "None", sk: "Žiadne" } },
				{ value: "small", label: { en: "Small", sk: "Malé" } },
				{ value: "medium", label: { en: "Medium", sk: "Stredné" } },
				{ value: "large", label: { en: "Large", sk: "Veľké" } },
			],
			defaultValue: "medium",
		}),
	}));

export const servicesBlock = block("services")
	.label({ en: "Services Grid", sk: "Prehľad služieb" })
	.icon("ph:scissors")
	.category("sections")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		subtitle: f.textarea({
			label: { en: "Subtitle", sk: "Podnadpis" },
			localized: true,
		}),
		showPrices: f.checkbox({
			label: { en: "Show Prices", sk: "Zobraziť ceny" },
			defaultValue: true,
		}),
		showDuration: f.checkbox({
			label: { en: "Show Duration", sk: "Zobraziť trvanie" },
			defaultValue: true,
		}),
		columns: f.select({
			label: { en: "Columns", sk: "Stĺpce" },
			options: [
				{ value: "2", label: "2" },
				{ value: "3", label: "3" },
				{ value: "4", label: "4" },
			],
			defaultValue: "3",
		}),
		limit: f.number({ label: { en: "Limit", sk: "Limit" }, defaultValue: 6 }),
	}))
	.prefetch(async ({ values, ctx }) => {
		const res = await (ctx.app as any).api.collections.services.find({
			limit: values.limit || 6,
			orderBy: { order: "asc" },
		});
		return { services: res.docs };
	});

export const teamBlock = block("team")
	.label({ en: "Team Grid", sk: "Náš tím" })
	.icon("ph:users")
	.category("sections")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		subtitle: f.textarea({
			label: { en: "Subtitle", sk: "Podnadpis" },
			localized: true,
		}),
		columns: f.select({
			label: { en: "Columns", sk: "Stĺpce" },
			options: [
				{ value: "2", label: "2" },
				{ value: "3", label: "3" },
				{ value: "4", label: "4" },
			],
			defaultValue: "3",
		}),
		limit: f.number({ label: { en: "Limit", sk: "Limit" }, defaultValue: 4 }),
	}))
	.prefetch(async ({ values, ctx }) => {
		const res = await (ctx.app as any).api.collections.barbers.find({
			limit: values.limit || 4,
			where: { isActive: true },
		});
		return { barbers: res.docs };
	});

export const reviewsBlock = block("reviews")
	.label({ en: "Reviews", sk: "Recenzie" })
	.icon("ph:star")
	.category("sections")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		subtitle: f.textarea({
			label: { en: "Subtitle", sk: "Podnadpis" },
			localized: true,
		}),
		limit: f.number({ label: { en: "Limit", sk: "Limit" }, defaultValue: 3 }),
	}))
	.prefetch(async ({ values, ctx }) => {
		const res = await (ctx.app as any).api.collections.reviews.find({
			limit: values.limit || 3,
			where: { rating: { gte: 4 } },
			orderBy: { createdAt: "desc" },
		});
		return { reviews: res.docs };
	});

export const ctaBlock = block("cta")
	.label({ en: "CTA", sk: "Výzva k akcii" })
	.icon("ph:megaphone")
	.category("sections")
	.fields((f) => ({
		title: f.text({
			label: { en: "Title", sk: "Nadpis" },
			localized: true,
			required: true,
		}),
		description: f.textarea({
			label: { en: "Description", sk: "Popis" },
			localized: true,
		}),
		buttonText: f.text({
			label: { en: "Button Text", sk: "Text tlačidla" },
			localized: true,
		}),
		buttonLink: f.text({ label: { en: "Button Link", sk: "Odkaz tlačidla" } }),
		variant: f.select({
			label: { en: "Variant", sk: "Variant" },
			options: [
				{ value: "highlight", label: "Highlight" },
				{ value: "dark", label: "Dark" },
				{ value: "light", label: "Light" },
			],
			defaultValue: "highlight",
		}),
		size: f.select({
			label: { en: "Size", sk: "Veľkosť" },
			options: [
				{ value: "small", label: { en: "Small", sk: "Malá" } },
				{ value: "medium", label: { en: "Medium", sk: "Stredná" } },
				{ value: "large", label: { en: "Large", sk: "Veľká" } },
			],
			defaultValue: "medium",
		}),
	}));

export const columnsBlock = block("columns")
	.label({ en: "Columns", sk: "Stĺpce" })
	.icon("ph:columns")
	.category("layout")
	.allowChildren()
	.fields((f) => ({
		columns: f.select({
			label: { en: "Columns", sk: "Počet stĺpcov" },
			options: [
				{ value: "2", label: "2" },
				{ value: "3", label: "3" },
				{ value: "4", label: "4" },
			],
			defaultValue: "2",
		}),
		gap: f.select({
			label: { en: "Gap", sk: "Medzera" },
			options: [
				{ value: "small", label: "Small" },
				{ value: "medium", label: "Medium" },
				{ value: "large", label: "Large" },
			],
			defaultValue: "medium",
		}),
		padding: f.select({
			label: { en: "Padding", sk: "Odsadenie" },
			options: [
				{ value: "none", label: { en: "None", sk: "Žiadne" } },
				{ value: "small", label: { en: "Small", sk: "Malé" } },
				{ value: "medium", label: { en: "Medium", sk: "Stredné" } },
				{ value: "large", label: { en: "Large", sk: "Veľké" } },
			],
			defaultValue: "medium",
		}),
	}));

export const spacerBlock = block("spacer")
	.label({ en: "Spacer", sk: "Medzera" })
	.icon("ph:arrows-out-vertical")
	.category("layout")
	.fields((f) => ({
		size: f.select({
			label: { en: "Size", sk: "Veľkosť" },
			options: [
				{ value: "small", label: "S" },
				{ value: "medium", label: "M" },
				{ value: "large", label: "L" },
				{ value: "xlarge", label: "XL" },
			],
			defaultValue: "medium",
		}),
	}));

export const dividerBlock = block("divider")
	.label({ en: "Divider", sk: "Oddelovač" })
	.icon("ph:minus")
	.category("layout")
	.fields((f) => ({
		style: f.select({
			label: { en: "Style", sk: "Štýl" },
			options: [
				{ value: "solid", label: "Solid" },
				{ value: "dashed", label: "Dashed" },
			],
			defaultValue: "solid",
		}),
		width: f.select({
			label: { en: "Width", sk: "Šírka" },
			options: [
				{ value: "full", label: { en: "Full", sk: "Plná" } },
				{ value: "medium", label: { en: "Medium", sk: "Stredná" } },
				{ value: "small", label: { en: "Small", sk: "Malá" } },
			],
			defaultValue: "full",
		}),
	}));

export const hoursBlock = block("hours")
	.label({ en: "Business Hours", sk: "Otváracie hodiny" })
	.icon("ph:clock")
	.category("content")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		showClosed: f.checkbox({
			label: { en: "Show Closed Days", sk: "Zobraziť zatvorené dni" },
			defaultValue: true,
		}),
	}))
	.prefetch(async ({ ctx }) => {
		const settings = await (ctx.app as any).api.globals.siteSettings.get({});
		return { businessHours: settings?.businessHours };
	});

export const contactInfoBlock = block("contact-info")
	.label({ en: "Contact Info", sk: "Kontaktné údaje" })
	.icon("ph:phone")
	.category("content")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		showMap: f.checkbox({
			label: { en: "Show Map", sk: "Zobraziť mapu" },
			defaultValue: true,
		}),
	}))
	.prefetch(async ({ ctx }) => {
		const settings = await (ctx.app as any).api.globals.siteSettings.get({});
		return {
			shopName: settings?.shopName,
			contactEmail: settings?.contactEmail,
			contactPhone: settings?.contactPhone,
			address: settings?.address,
			city: settings?.city,
			zipCode: settings?.zipCode,
			country: settings?.country,
			mapEmbedUrl: settings?.mapEmbedUrl,
		};
	});

export const bookingCtaBlock = block("booking-cta")
	.label({ en: "Booking CTA", sk: "Rezervačná výzva" })
	.icon("ph:calendar-plus")
	.category("sections")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		description: f.textarea({
			label: { en: "Description", sk: "Popis" },
			localized: true,
		}),
		buttonText: f.text({
			label: { en: "Button Text", sk: "Text tlačidla" },
			localized: true,
		}),
		serviceId: f.text({
			label: { en: "Pre-select Service ID", sk: "Predvybraná služba" },
		}),
		barberId: f.text({
			label: { en: "Pre-select Barber ID", sk: "Predvybraný holič" },
		}),
		variant: f.select({
			label: { en: "Variant", sk: "Variant" },
			options: [
				{ value: "default", label: "Default" },
				{ value: "highlight", label: "Highlight" },
				{ value: "outline", label: "Outline" },
			],
			defaultValue: "highlight",
		}),
		size: f.select({
			label: { en: "Size", sk: "Veľkosť" },
			options: [
				{ value: "default", label: "Default" },
				{ value: "lg", label: "Large" },
			],
			defaultValue: "default",
		}),
	}));

export const galleryBlock = block("gallery")
	.label({ en: "Gallery", sk: "Galéria" })
	.icon("ph:images")
	.category("content")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		images: f.json({ label: { en: "Images", sk: "Obrázky" } }),
		columns: f.select({
			label: { en: "Columns", sk: "Stĺpce" },
			options: [
				{ value: "2", label: "2" },
				{ value: "3", label: "3" },
				{ value: "4", label: "4" },
			],
			defaultValue: "3",
		}),
		gap: f.select({
			label: { en: "Gap", sk: "Medzera" },
			options: [
				{ value: "small", label: "Small" },
				{ value: "medium", label: "Medium" },
				{ value: "large", label: "Large" },
			],
			defaultValue: "medium",
		}),
	}))
	.prefetch(async ({ values, ctx }) => {
		const imageIds =
			(values.images as any[])
				?.map((img: any) => img.id)
				.filter(Boolean) || [];
		if (imageIds.length === 0) return { imageUrls: {} };
		const res = await (ctx.app as any).api.collections.uploads.find({
			where: { id: { in: imageIds } },
			limit: imageIds.length,
		});
		const imageUrls: Record<string, string> = {};
		for (const doc of res.docs) {
			imageUrls[doc.id] = doc.url;
		}
		return { imageUrls };
	});

export const imageTextBlock = block("image-text")
	.label({ en: "Image + Text", sk: "Obrázok + Text" })
	.icon("ph:layout")
	.category("content")
	.fields((f) => ({
		image: f.upload({ label: { en: "Image", sk: "Obrázok" } }),
		imagePosition: f.select({
			label: { en: "Image Position", sk: "Pozícia obrázka" },
			options: [
				{ value: "left", label: { en: "Left", sk: "Vľavo" } },
				{ value: "right", label: { en: "Right", sk: "Vpravo" } },
			],
			defaultValue: "left",
		}),
		title: f.text({
			label: { en: "Title", sk: "Nadpis" },
			localized: true,
			required: true,
		}),
		content: f.richText({
			label: { en: "Content", sk: "Obsah" },
			localized: true,
		}),
		ctaText: f.text({
			label: { en: "CTA Text", sk: "Text tlačidla" },
			localized: true,
		}),
		ctaLink: f.text({ label: { en: "CTA Link", sk: "Odkaz" } }),
		imageAspect: f.select({
			label: { en: "Image Aspect", sk: "Pomer strán" },
			options: [
				{ value: "square", label: "Square" },
				{ value: "portrait", label: "Portrait" },
				{ value: "landscape", label: "Landscape" },
			],
			defaultValue: "square",
		}),
	}));

export const statsBlock = block("stats")
	.label({ en: "Stats", sk: "Štatistiky" })
	.icon("ph:chart-bar")
	.category("content")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		stats: f.json({ label: { en: "Stats", sk: "Štatistiky" } }),
		columns: f.select({
			label: { en: "Columns", sk: "Stĺpce" },
			options: [
				{ value: "2", label: "2" },
				{ value: "3", label: "3" },
				{ value: "4", label: "4" },
			],
			defaultValue: "3",
		}),
	}));

export const barbersFeaturedBlock = block("barbers-featured")
	.label({ en: "Featured Barbers", sk: "Vybraní holiči" })
	.icon("ph:users-three")
	.category("sections")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		subtitle: f.textarea({
			label: { en: "Subtitle", sk: "Podnadpis" },
			localized: true,
		}),
		barberIds: f.json({ label: { en: "Barber IDs", sk: "ID holičov" } }),
		columns: f.select({
			label: { en: "Columns", sk: "Stĺpce" },
			options: [
				{ value: "2", label: "2" },
				{ value: "3", label: "3" },
				{ value: "4", label: "4" },
			],
			defaultValue: "3",
		}),
	}))
	.prefetch(async ({ values, ctx }) => {
		const ids = (values.barberIds as string[]) || [];
		if (ids.length === 0) return { barbers: [] };
		const res = await (ctx.app as any).api.collections.barbers.find({
			where: { id: { in: ids } },
			limit: ids.length,
		});
		return { barbers: res.docs };
	});

export const servicesFeaturedBlock = block("services-featured")
	.label({ en: "Featured Services", sk: "Vybrané služby" })
	.icon("ph:star")
	.category("sections")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		subtitle: f.textarea({
			label: { en: "Subtitle", sk: "Podnadpis" },
			localized: true,
		}),
		serviceIds: f.json({ label: { en: "Service IDs", sk: "ID služieb" } }),
		columns: f.select({
			label: { en: "Columns", sk: "Stĺpce" },
			options: [
				{ value: "2", label: "2" },
				{ value: "3", label: "3" },
				{ value: "4", label: "4" },
			],
			defaultValue: "3",
		}),
	}))
	.prefetch(async ({ values, ctx }) => {
		const ids = (values.serviceIds as string[]) || [];
		if (ids.length === 0) return { services: [] };
		const res = await (ctx.app as any).api.collections.services.find({
			where: { id: { in: ids } },
			limit: ids.length,
		});
		return { services: res.docs };
	});

export const reviewsGridBlock = block("reviews-grid")
	.label({ en: "Reviews Grid", sk: "Mriežka recenzií" })
	.icon("ph:star-half")
	.category("sections")
	.fields((f) => ({
		title: f.text({ label: { en: "Title", sk: "Nadpis" }, localized: true }),
		subtitle: f.textarea({
			label: { en: "Subtitle", sk: "Podnadpis" },
			localized: true,
		}),
		filter: f.select({
			label: { en: "Filter", sk: "Filter" },
			options: [
				{ value: "featured", label: "Featured" },
				{ value: "recent", label: "Recent" },
				{ value: "all", label: "All" },
			],
			defaultValue: "recent",
		}),
		limit: f.number({ label: { en: "Limit", sk: "Limit" }, defaultValue: 6 }),
		columns: f.select({
			label: { en: "Columns", sk: "Stĺpce" },
			options: [
				{ value: "2", label: "2" },
				{ value: "3", label: "3" },
				{ value: "4", label: "4" },
			],
			defaultValue: "3",
		}),
	}))
	.prefetch(async ({ values, ctx }) => {
		const where: Record<string, any> = {};
		if (values.filter === "featured") {
			where.rating = { gte: 4 };
		}
		const res = await (ctx.app as any).api.collections.reviews.find({
			limit: values.limit || 6,
			where,
			orderBy: { createdAt: "desc" },
		});
		return { reviews: res.docs };
	});

export const serverBlocks = {
	hero: heroBlock,
	text: textBlock,
	heading: headingBlock,
	services: servicesBlock,
	team: teamBlock,
	reviews: reviewsBlock,
	cta: ctaBlock,
	columns: columnsBlock,
	spacer: spacerBlock,
	divider: dividerBlock,
	hours: hoursBlock,
	"contact-info": contactInfoBlock,
	"booking-cta": bookingCtaBlock,
	gallery: galleryBlock,
	"image-text": imageTextBlock,
	stats: statsBlock,
	"barbers-featured": barbersFeaturedBlock,
	"services-featured": servicesFeaturedBlock,
	"reviews-grid": reviewsGridBlock,
};
