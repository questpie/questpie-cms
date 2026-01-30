/**
 * Pages Admin Configuration
 *
 * Demonstrates Feature Pack V2:
 * - Block editor field (r.blocks)
 * - Preview system with live updates
 * - Localized block content
 */

import { FileTextIcon } from "@phosphor-icons/react";
import { blocksBuilder } from "@/questpie/admin/blocks-builder";

export const pagesAdmin = blocksBuilder
	.collection("pages")
	.meta({
		label: { en: "Pages", sk: "Stránky" },
		icon: FileTextIcon,
	})
	// Live preview configuration
	.preview({
		url: (values, _locale) => {
			const slug = values.slug || "untitled";
			return `/pages/${slug}?preview=true`;
		},
		enabled: true,
		position: "right",
		defaultWidth: 50,
	})
	// Autosave configuration
	.autoSave({
		enabled: true,
		debounce: 500, // 0.5s as specified
		indicator: true,
		preventNavigation: true,
	})
	.fields(({ r }) => ({
		title: r.text({
			label: { en: "Title", sk: "Názov" },
			required: true,
			localized: true,
		}),
		slug: r.text({
			label: { en: "URL Slug", sk: "URL slug" },
			required: true,
			description: {
				en: "URL-friendly identifier",
				sk: "URL-friendly identifikátor",
			},
		}),
		description: r.textarea({
			label: { en: "Description", sk: "Popis" },
			localized: true,
			description: {
				en: "Short page description for SEO",
				sk: "Krátky popis stránky pre SEO",
			},
		}),
		// Block editor field - visual page builder
		content: r.blocks({
			label: { en: "Content", sk: "Obsah" },
			// Allowed block types for this field (optional, defaults to all)
			allowedBlocks: [
				// Sections
				"hero",
				"services",
				"services-featured",
				"team",
				"barbers-featured",
				"reviews",
				"reviews-grid",
				"cta",
				"booking-cta",
				// Content
				"text",
				"heading",
				"image-text",
				"gallery",
				"stats",
				"hours",
				"contact-info",
				// Layout
				"columns",
				"spacer",
				"divider",
			],
		}),
		// SEO section
		metaTitle: r.text({
			label: { en: "Meta Title", sk: "Meta titulok" },
			localized: true,
			description: {
				en: "Override page title for search engines",
				sk: "Prepísať titulok pre vyhľadávače",
			},
		}),
		metaDescription: r.textarea({
			label: { en: "Meta Description", sk: "Meta popis" },
			localized: true,
			maxLength: 160,
		}),
		isPublished: r.switch({
			label: { en: "Published", sk: "Publikované" },
		}),
	}))
	.list(({ v, f }) =>
		v.table({
			columns: [f.title, f.slug, f.isPublished],
		}),
	)
	.form(({ v, f }) =>
		v.form({
			// Sidebar for publishing status
			sidebar: {
				position: "right",
				fields: [f.isPublished],
			},
			fields: [
				// Page info section
				{
					type: "section",
					label: { en: "Page Info", sk: "Info o stránke" },
					layout: "grid",
					columns: 2,
					fields: [f.title, f.slug],
				},
				{
					type: "section",
					fields: [f.description],
				},
				// Main content - block editor
				{
					type: "section",
					label: { en: "Page Content", sk: "Obsah stránky" },
					fields: [f.content],
				},
				// SEO section
				{
					type: "section",
					label: { en: "SEO Settings", sk: "SEO nastavenia" },
					fields: [f.metaTitle, f.metaDescription],
				},
			],
		}),
	);
