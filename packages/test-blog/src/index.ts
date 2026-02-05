/**
 * Test Blog Module
 *
 * Minimal module to test if TS7056 occurs with simple collections.
 */

import { q, starterModule } from "questpie";

// Simple blog post collection
export const postsCollection = q
	.collection("posts")
	.fields((f) => ({
		title: f.text({ required: true, maxLength: 255 }),
		slug: f.text({ required: true, maxLength: 255 }),
		content: f.textarea(),
		publishedAt: f.datetime(),
		author: f.relation({ to: "user" }),
	}))
	.options({
		timestamps: true,
	});

// Simple categories collection
export const categoriesCollection = q.collection("categories").fields((f) => ({
	name: f.text({ required: true, maxLength: 100 }),
	slug: f.text({ required: true, maxLength: 100 }),
}));

// Blog module - uses starterModule + adds blog collections
export const blogModule = q({ name: "blog-module" })
	.use(starterModule)
	.collections({
		posts: postsCollection,
		categories: categoriesCollection,
	});
