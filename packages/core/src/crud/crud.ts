import { mutation, query } from "../../convex/_generated/server";
import { v } from "convex/values";
import type { QcmsServerConfig } from "../types/config";
import {
	generateArgsValidator,
	fieldToValidator,
} from "../collection/utils/schema";

function createUnion(validators: any[]) {
	if (validators.length === 0) return v.any();
	if (validators.length === 1) return validators[0];
	return v.union(...validators);
}

/**
 * Generate CRUD operations for a collection
 */
export function generateCrud<TConfig extends QcmsServerConfig>(
	config: TConfig,
) {
	const collections = config.collections;

	const getCollection = (name: string) => {
		const col = collections.find((c) => c.name === name);
		if (!col) throw new Error(`Collection ${name} not found`);
		return col;
	};

	/**
	 * List all documents (with soft delete support)
	 */
	const list = query({
		args: createUnion(
			collections.map((col) => {
				const indexValidators = (col.indexes || []).map((idx) => {
					const fields = idx.fields.reduce(
						(acc, fieldName) => {
							const fieldConfig = col.fields[fieldName];
							if (fieldConfig) {
								acc[fieldName] = fieldToValidator(fieldConfig);
							}
							return acc;
						},
						{} as Record<string, any>,
					);

					return v.object({
						index: v.literal(idx.name),
						...fields,
					});
				});

				const filterValidator =
					indexValidators.length > 0
						? indexValidators.length === 1
							? indexValidators[0]
							: v.union(...indexValidators)
						: v.null();

				return v.object({
					collection: v.literal(col.name),
					limit: v.optional(v.number()),
					cursor: v.optional(v.string()),
					filter: v.optional(filterValidator),
				});
			}),
		),
		handler: async (ctx, args) => {
			const col = getCollection(args.collection);
			const tableName = col.name;
			const hooks = col.$server.hooks;
			const access = col.$server.access;

			// Basic read access check (if boolean false)
			if (access?.read === false) {
				throw new Error("Unauthorized");
			}

			let q = ctx.db.query(tableName as any);

			if (args.filter) {
				// @ts-expect-error
				const { index, ...filterFields } = args.filter;
				q = q.withIndex(index, (q) => {
					let res = q;
					for (const [key, val] of Object.entries(filterFields)) {
						res = res.eq(key, val as any);
					}
					return res;
				});
			}

			const result = await q.paginate({
				cursor: args.cursor || null,
				numItems: args.limit || 100,
			});

			let page = result.page;

			// Filter by access control if function
			if (typeof access?.read === "function") {
				const allowedMask = await Promise.all(
					page.map((doc) => access.read?.({ doc, ctx })),
				);
				page = page.filter((_, i) => allowedMask[i]);
			}

			// Apply afterRead hook
			if (hooks?.afterRead) {
				page = await Promise.all(
					page.map((doc) => hooks.afterRead?.({ ...ctx, doc } as any)),
				);
			}

			return {
				...result,
				page,
			};
		},
	});

	const get = query({
		args: createUnion(
			collections.map((col) =>
				v.object({
					collection: v.literal(col.name),
					id: v.id(col.name),
				}),
			),
		),
		handler: async (ctx, args) => {
			const col = getCollection(args.collection);
			const access = col.$server.access;
			const hooks = col.$server.hooks;

			const doc = await ctx.db.get(args.id);
			if (!doc) return null;

			if (access?.read) {
				const allowed =
					typeof access.read === "function"
						? await access.read({ doc, ctx })
						: access.read;
				if (!allowed) throw new Error("Unauthorized");
			}

			if (hooks?.afterRead) {
				return hooks.afterRead({ ...ctx, doc } as any);
			}

			return doc;
		},
	});

	const create = mutation({
		args: createUnion(
			collections.map((col) =>
				v.object({
					collection: v.literal(col.name),
					data: v.object(generateArgsValidator(col, "create")),
				}),
			),
		),
		handler: async (ctx, args) => {
			const col = getCollection(args.collection);
			const access = col.$server.access;
			const hooks = col.$server.hooks;

			let data = args.data;

			if (access?.create) {
				const allowed =
					typeof access.create === "function"
						? await access.create({ data, ctx })
						: access.create;
				if (!allowed) throw new Error("Unauthorized");
			}

			if (hooks?.beforeCreate) {
				const newData = await hooks.beforeCreate({ data, ctx });
				if (newData) data = newData;
			}

			const id = await ctx.db.insert(args.collection as any, data);

			if (hooks?.afterCreate) {
				await hooks.afterCreate({ ...ctx, id, data } as any);
			}

			return id;
		},
	});

	const update = mutation({
		args: createUnion(
			collections.map((col) =>
				v.object({
					collection: v.literal(col.name),
					id: v.id(col.name),
					data: v.object(generateArgsValidator(col, "update")),
				}),
			),
		),
		handler: async (ctx, args) => {
			const col = getCollection(args.collection);
			const access = col.$server.access;
			const hooks = col.$server.hooks;

			let data = args.data;

			if (access?.update) {
				const allowed =
					typeof access.update === "function"
						? await access.update({ id: args.id, data, ctx })
						: access.update;
				if (!allowed) throw new Error("Unauthorized");
			}

			if (hooks?.beforeUpdate) {
				const newData = await hooks.beforeUpdate({ id: args.id, data, ctx });
				if (newData) data = newData;
			}

			await ctx.db.patch(args.id, data);

			if (hooks?.afterUpdate) {
				await hooks.afterUpdate({ ...ctx, id: args.id, data } as any);
			}
		},
	});

	const remove = mutation({
		args: createUnion(
			collections.map((col) =>
				v.object({
					collection: v.literal(col.name),
					id: v.id(col.name),
				}),
			),
		),
		handler: async (ctx, args) => {
			const col = getCollection(args.collection);
			const access = col.$server.access;
			const hooks = col.$server.hooks;

			if (access?.delete) {
				const allowed =
					typeof access.delete === "function"
						? await access.delete({ id: args.id, ctx })
						: access.delete;
				if (!allowed) throw new Error("Unauthorized");
			}

			if (hooks?.beforeDelete) {
				await hooks.beforeDelete({ id: args.id, ctx });
			}

			await ctx.db.delete(args.id);

			if (hooks?.afterDelete) {
				await hooks.afterDelete({ ...ctx, id: args.id } as any);
			}
		},
	});

	const createMany = mutation({
		args: createUnion(
			collections.map((col) =>
				v.object({
					collection: v.literal(col.name),
					data: v.array(v.object(generateArgsValidator(col, "create"))),
				}),
			),
		),
		handler: async (ctx, args) => {
			const col = getCollection(args.collection);
			const access = col.$server.access;
			const hooks = col.$server.hooks;

			return await Promise.all(
				args.data.map(async (item) => {
					let data = item;

					if (access?.create) {
						const allowed =
							typeof access.create === "function"
								? await access.create({ data, ctx })
								: access.create;
						if (!allowed) throw new Error("Unauthorized");
					}

					if (hooks?.beforeCreate) {
						const newData = await hooks.beforeCreate({ data, ctx });
						if (newData) data = newData;
					}

					const id = await ctx.db.insert(args.collection as any, data);

					if (hooks?.afterCreate) {
						await hooks.afterCreate({ ...ctx, id, data } as any);
					}

					return id;
				}),
			);
		},
	});

	const removeMany = mutation({
		args: createUnion(
			collections.map((col) =>
				v.object({
					collection: v.literal(col.name),
					ids: v.array(v.id(col.name)),
				}),
			),
		),
		handler: async (ctx, args) => {
			const col = getCollection(args.collection);
			const access = col.$server.access;
			const hooks = col.$server.hooks;

			await Promise.all(
				args.ids.map(async (id) => {
					if (access?.delete) {
						const allowed =
							typeof access.delete === "function"
								? await access.delete({ id, ctx })
								: access.delete;
						if (!allowed) throw new Error("Unauthorized");
					}

					if (hooks?.beforeDelete) {
						await hooks.beforeDelete({ id, ctx });
					}

					await ctx.db.delete(id);

					if (hooks?.afterDelete) {
						await hooks.afterDelete({ ...ctx, id } as any);
					}
				}),
			);
		},
	});

	return {
		list,
		get,
		create,
		update,
		remove,
		createMany,
		removeMany,
	};
}
