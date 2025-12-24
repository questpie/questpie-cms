import { collection } from "../builder/collection-builder";
import { fields } from "../fields";
import { sql } from "drizzle-orm";

export const assetsCollection = collection("questpie_assets")
	.options({
		timestamps: true,
	})
	.fields({
		// Storage Key (e.g. "uuid-image.png")
		key: fields.text("key").notNull(),

		// Public URL
		url: fields.text("url").notNull(),

		// Original Filename
		filename: fields.text("filename").notNull(),

		// MIME Type
		mimeType: fields.text("mime_type").notNull(),

		// Size in bytes
		size: fields.number("size").notNull(),

		// Image dimensions (optional)
		width: fields.number("width"),
		height: fields.number("height"),

		// Descriptive metadata
		alt: fields.text("alt"),
		caption: fields.textarea("caption"),
	})
	.title((t) => sql`${t.filename}`);
