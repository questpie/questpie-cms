import { defineCollection, defineQCMS } from "#questpie/cms/server/index.js";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { text, varchar } from "drizzle-orm/pg-core";
import { buildMockCMS } from "../utils/mocks/mock-cms-builder";
import { createTestContext } from "../utils/test-context";
import { runTestDbMigrations } from "../utils/test-db";

const testModule = defineQCMS({ name: "test-module" }).collections({
	products: defineCollection("products")
		.fields({
			sku: varchar("sku", { length: 50 }).notNull(),
			name: text("name").notNull(),
			description: text("description"),
		})
		.localized(["name", "description"] as const)
		.title(({ table, i18n }) => sql`${i18n.name} || ' - ' || ${table.sku}`)
		.options({
			timestamps: true,
			softDelete: true,
			versioning: true,
		})
		.build(),
	locked_products: defineCollection("locked_products")
		.fields({
			sku: varchar("sku", { length: 50 }).notNull(),
			name: text("name").notNull(),
		})
		.localized(["name"] as const)
		.title(({ table, i18n }) => sql`${i18n.name} || ' - ' || ${table.sku}`)
		.options({
			timestamps: true,
			softDelete: true,
			versioning: true,
		})
		.access({
			create: () => false,
		})
		.build(),
});

describe("collection CRUD", () => {
	let setup: Awaited<ReturnType<typeof buildMockCMS<typeof testModule>>>;

	beforeEach(async () => {
		setup = await buildMockCMS(testModule);
		await runTestDbMigrations(setup.cms);
	});

	afterEach(async () => {
		await setup.cleanup();
	});

	it("creates, updates localized fields, and falls back to default locale", async () => {
		const ctx = createTestContext();
		// Use cms.api.collections.products directly

		const created = await setup.cms.api.collections.products.create(
			{
				id: crypto.randomUUID(),
				sku: "sku-1",
				name: "Name EN",
				description: "Desc EN",
			},
			ctx,
		);

		await setup.cms.api.collections.products.updateById(
			{
				id: created.id,
				data: { name: "Nazov SK" },
			},
			createTestContext({ locale: "sk" }),
		);

		const skRow = await setup.cms.api.collections.products.findOne(
			{ where: { id: created.id } },
			createTestContext({ locale: "sk" }),
		);
		expect(skRow?.name).toBe("Nazov SK");

		const deRow = await setup.cms.api.collections.products.findOne(
			{ where: { id: created.id } },
			createTestContext({ locale: "de" }),
		);
		expect(deRow?.name).toBe("Name EN");
	});

	it("soft delete hides rows from findMany", async () => {
		const ctx = createTestContext();
		// Use cms.api.collections.products directly

		const created = await setup.cms.api.collections.products.create(
			{
				id: crypto.randomUUID(),
				sku: "sku-2",
				name: "Name EN",
			},
			ctx,
		);

		await setup.cms.api.collections.products.deleteById(
			{ id: created.id },
			ctx,
		);

		const rows = await setup.cms.api.collections.products.find({}, ctx);
		expect(rows.docs.length).toBe(0);
		expect(rows.totalDocs).toBe(0);
	});

	it("system access mode bypasses access rules", async () => {
		const _ctx = createTestContext();
		// Use cms.api.collections.locked_products directly

		await expect(
			setup.cms.api.collections.locked_products.create(
				{
					id: crypto.randomUUID(),
					sku: "sku-3",
					name: "Locked",
				},
				createTestContext({ accessMode: "user" }),
			),
		).rejects.toThrow("Access denied: create");

		const created = await setup.cms.api.collections.locked_products.create(
			{
				id: crypto.randomUUID(),
				sku: "sku-4",
				name: "System",
			},
			createTestContext({ accessMode: "system" }),
		);
		expect(created.sku).toBe("sku-4");
	});

	it("records versions on create, update, and delete", async () => {
		const ctx = createTestContext();
		// Use cms.api.collections.products directly

		const created = await setup.cms.api.collections.products.create(
			{
				id: crypto.randomUUID(),
				sku: "sku-5",
				name: "Name EN",
			},
			ctx,
		);

		await setup.cms.api.collections.products.updateById(
			{
				id: created.id,
				data: { sku: "sku-5b" },
			},
			ctx,
		);

		await setup.cms.api.collections.products.deleteById(
			{ id: created.id },
			ctx,
		);

		const versions = await setup.cms.api.collections.products.findVersions(
			{ id: created.id },
			ctx,
		);
		expect(versions.length).toBe(3);
	});
});
