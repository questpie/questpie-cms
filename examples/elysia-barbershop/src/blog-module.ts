import { q } from "questpie";
import { varchar, timestamp, text, boolean } from "drizzle-orm/pg-core";

const blogCollection = q.collection("blog").fields({
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at"),
  isPublished: boolean("is_published").default(false).notNull(),
});

export const blogModule = q({ name: "blog-module" }).collections({
  blog: blogCollection,
});
