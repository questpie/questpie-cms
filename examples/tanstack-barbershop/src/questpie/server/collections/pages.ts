import { boolean, jsonb, text, varchar } from "drizzle-orm/pg-core";
import { q } from "questpie";

/**
 * Pages Collection
 *
 * Demonstrates the Block System from Feature Pack V2.
 * Content is stored as JSONB with $i18n markers for localized block fields.
 *
 * The `content` field stores:
 * - _tree: Block hierarchy (id, type, children)
 * - _values: Block field values indexed by block ID
 */
export const pages = q
	.collection("pages")
	.fields({
		// Basic page info (localized)
		title: varchar("title", { length: 255 }).notNull(),
		slug: varchar("slug", { length: 255 }).notNull().unique(),
		description: text("description"),

		// Block content - stored as JSONB with $i18n markers
		// Structure: { _tree: BlockNode[], _values: Record<string, Record<string, unknown>> }
		content: jsonb("content").$type<{
			_tree: Array<{ id: string; type: string; children: unknown[] }>;
			_values: Record<string, Record<string, unknown>>;
		}>(),

		// SEO fields
		metaTitle: varchar("meta_title", { length: 255 }),
		metaDescription: text("meta_description"),

		// Publishing
		isPublished: boolean("is_published").default(false).notNull(),
	})
	// Localize title, description, and nested content
	// content uses :nested suffix for $i18n markers in block values
	.localized([
		"title",
		"description",
		"content:nested",
		"metaTitle",
		"metaDescription",
	])
	.title(({ f }) => f.title);
