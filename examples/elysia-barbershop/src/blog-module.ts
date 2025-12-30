import { defineCollection, defineQCMS } from "@questpie/cms/server";
import { varchar, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const blogCollection = defineCollection("blog")
	.fields({
		title: varchar("title", { length: 255 }).notNull(),
		content: text("content").notNull(),
		publishedAt: timestamp("published_at"),
		isPublished: boolean("is_published").default(false).notNull(),
	})
	.title(({ table }) => sql`${table.title}`);

export const blogModule = defineQCMS({ name: "blog-module" }).collections({
	blog: blogCollection,
});
