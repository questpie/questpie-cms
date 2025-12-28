import {
	collection,
	defineJob,
	pgBossAdapter,
	QCMS,
} from "#questpie/core/server/index.js";
import { integer, boolean, varchar } from "drizzle-orm/pg-core";
import z from "zod";

const categories = collection("categories")
	.fields({
		name: varchar().notNull(),
		description: varchar(),
		availableProducts: integer().notNull().default(0),
	})
	.relations(({ many }) => ({
		products: many("products", { relationName: "category" }),
	}))
	.access({
		read: () => true,
		create: (ctx) => ctx.user.role === "admin",
		update: (ctx) => ctx.user.role === "admin",
	})
	.build();

const products = collection("products")
	.fields({
		name: varchar().notNull(),
		description: varchar(),
		price: varchar().notNull(),
		isAvailable: boolean().notNull().default(true),
		categoryId: varchar()
			.references(() => categories.table.id)
			.notNull(),
	})
	.relations(({ one }) => ({
		category: one(categories.name, {
			fields: [categories.table.id],
			references: ["categoryId"],
		}),
	}))
	.access({
		read: () => true,
		create: (ctx) => ctx.user.role === "admin",
		update: (ctx) => ctx.user.role === "admin",
	})
	.hooks({
		afterChange: async () => {
			// Enqueue job to update available products count
		},
	})
	.build();

const updateJob = defineJob({
	name: "update-number-of-available-products",
	schema: z.object({
		categoryId: z.string(),
	}),
	handler: async (input) => {
		const availableProductsCount = await cms.api.collections.products.count({
			where: {
				categoryId: input.categoryId,
				isAvailable: true,
			},
		});

		await cms.api.collections.categories.update({
			where: {
				id: { eq: input.categoryId },
			},
			data: {
				availableProducts: availableProductsCount,
			},
		});
	},
});

export const cms = new QCMS({
	app: {
		url: "http://localhost:3000",
	},
	db: {
		connection: {
			url: "postgresql://user:password@localhost:5432/questpie_test",
		},
	},
	collections: [products, categories] as const,
	queue: {
		jobs: [updateJob],
		adapter: pgBossAdapter({
			connectionString:
				"postgresql://user:password@localhost:5432/questpie_test",
		}),
	},
	locale: {
		locales() {
			return [{ code: "en" }];
		},
		defaultLocale: "en",
	},
});

const productsResult = await cms.api.collections.products.find({
	where: {
		isAvailable: true,
	},
	with: {
		category: { columns: { name: true } },
	},
});

console.log("Products with Category:", productsResult.docs);
if (productsResult.docs.length > 0) {
	console.log("Product Name:", productsResult.docs[0].name);
	console.log("Category Name:", productsResult.docs[0].category.name);
}

const categoriesResult = await cms.api.collections.categories.find({
	with: {
		products: {
			columns: { id: true },
			_aggregate: {
				_avg: {
					price: true,
				},
			},
		},
	},
});

console.log("Categories with Product Count:", categoriesResult.docs);
if (categoriesResult.docs.length > 0) {
	console.log("Category Name:", categoriesResult.docs[0].name);
	console.log("Product Count:", categoriesResult.docs[0].products._avg.price);
}
