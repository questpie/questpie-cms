import { defineCollection } from "#questpie/cms/exports/server.js";
import { sql } from "drizzle-orm";
import { varchar, text, integer } from "drizzle-orm/pg-core";

export const assetsCollection = defineCollection("questpie_assets")
	.options({
		timestamps: true,
	})
	.fields({
		// Storage Key (e.g. "uuid-image.png")
		key: varchar("key", { length: 255 }).notNull(),

		// Public URL
		url: text("url").notNull(),

		// Original Filename
		filename: varchar("filename", { length: 255 }).notNull(),

		// MIME Type
		mimeType: varchar("mime_type", { length: 100 }).notNull(),

		// Size in bytes
		size: integer("size").notNull(),

		// Image dimensions (optional)
		width: integer("width"),
		height: integer("height"),

		// Descriptive metadata
		alt: varchar("alt", { length: 500 }),
		caption: text("caption"),
	})
	.hooks({
		afterDelete: async ({ data, cms }) => {
			if (!cms?.storage || !data?.key) return;

			try {
				await cms.storage.use().delete(data.key);
			} catch (error) {
				cms.logger?.warn?.("Failed to delete asset file from storage", {
					key: data.key,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
	})
	.title(({ table }) => sql`${table.filename}`);
