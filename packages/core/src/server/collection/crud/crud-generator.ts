import { eq, and, or, not, sql, inArray, count, sum, avg, min, max, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type {
	CollectionBuilderState,
	CollectionHooks,
	CollectionAccess,
	CollectionOptions,
	HookFunction,
	AccessWhere,
	HookContext,
} from "#questpie/core/server/collection/builder/types";
import type {
	CRUD,
	FindManyOptions,
	CRUDContext,
	FindFirstOptions,
	With,
	CreateInput,
	UpdateParams,
	DeleteParams,
	Where,
} from "#questpie/core/exports/server";
import type {
	FindVersionsOptions,
	FindVersionOptions,
	RevertVersionOptions,
	Columns,
	Extras,
	OrderBy,
} from "#questpie/core/server/collection/crud/types";

export class CRUDGenerator<
	TName extends string,
	TFields extends Record<string, any>,
	TLocalized extends ReadonlyArray<keyof TFields>,
	TVirtuals extends Record<string, SQL>,
	TRelations extends Record<string, any>,
	TOptions extends CollectionOptions, // Use CollectionOptions
	THooks extends CollectionHooks,
	TAccess extends CollectionAccess,
> {
	// Public accessors for internal use by relation resolution
	public get relatedTable() {
		return this.table;
	}

	constructor(
		public state: CollectionBuilderState<
			TName,
			TFields,
			TLocalized,
			TVirtuals,
			TRelations,
			any,
			any,
			TOptions,
			THooks,
			TAccess
		>,
		private table: PgTable,
		private i18nTable: PgTable | null,
		private versionsTable: PgTable | null,
		private db: any,
		private getVirtuals?: (context: any) => TVirtuals,
		private getTitle?: (context: any) => SQL | undefined,
		private getRawTitle?: (context: any) => SQL | undefined,
		private cms?: any,
	) {}

	/**
	 * Generate CRUD operations
	 */
	generate(): CRUD {
		return {
			findMany: this.createFindMany(),
			findFirst: this.createFindFirst(),
			create: this.createCreate(),
			update: this.createUpdate(),
			delete: this.createDelete(),
			findVersions: this.createFindVersions(),
			findVersion: this.createFindVersion(),
			revertToVersion: this.createRevertToVersion(),
		};
	}

	/**
	 * Create findMany operation (like db.query.table.findMany)
	 * Uses Drizzle's core query builder directly
	 */
	private createFindMany() {
		return async (options: FindManyOptions = {}, context: CRUDContext = {}) => {
			// Enforce access control
			const accessWhere = await this.enforceAccessControl(
				"read",
				context,
				null,
			);

			// Execute beforeRead hooks
			await this.executeHooks(this.state.hooks?.beforeRead, {
				db: this.db,
				input: options,
				locale: context.locale,
				user: context.user,
			});

			const mergedWhere = this.mergeWhere(options.where, accessWhere);

			// Determine if we are using i18n (i18n table exists)
			const useI18n = !!this.i18nTable;

			// Build SELECT object
			const selectObj = this.buildSelectObject(
				options.columns,
				options.extras,
				context,
			);

			// Start building query
			let query = this.db.select(selectObj).from(this.table);

			// Add i18n join if locale provided and localized fields exist
			if (useI18n) {
				query = query.leftJoin(
					this.i18nTable,
					and(
						eq((this.i18nTable as any).parentId, (this.table as any).id),
						eq((this.i18nTable as any).locale, context.locale!),
					),
				);
			}

			// WHERE clause
			if (mergedWhere) {
				const whereClause = this.buildWhereClause(mergedWhere, useI18n);
				if (whereClause) {
					query = query.where(whereClause);
				}
			}

			// Soft delete filter
			if (this.state.options.softDelete) {
				const softDeleteFilter = sql`${(this.table as any).deletedAt} IS NULL`;
				query = query.where(softDeleteFilter);
			}

			// ORDER BY
			if (options.orderBy) {
				const orderClauses = this.buildOrderByClauses(options.orderBy, useI18n);
				for (const clause of orderClauses) {
					query = query.orderBy(clause);
				}
			}

			// LIMIT
			if (options.limit !== undefined) {
				query = query.limit(options.limit);
			}

			// OFFSET
			if (options.offset !== undefined) {
				query = query.offset(options.offset);
			}

			// Execute query
			const rows = await query;

			// Handle relations
			if (options.with && this.cms) {
				await this.resolveRelations(rows, options.with, context);
			}

			// Execute afterRead hooks
			if (this.state.hooks?.afterRead) {
				for (const row of rows) {
					await this.executeHooks(this.state.hooks.afterRead, {
						db: this.db,
						row,
						locale: context.locale,
						user: context.user,
					});
				}
			}

			return rows;
		};
	}

	/**
	 * Create findFirst operation (like db.query.table.findFirst)
	 * Uses Drizzle's core query builder directly
	 */
	private createFindFirst() {
		return async (
			options: FindFirstOptions = {},
			context: CRUDContext = {},
		) => {
			// Execute beforeRead hooks
			await this.executeHooks(this.state.hooks?.beforeRead, {
				db: this.db,
				input: options,
				locale: context.locale,
				user: context.user,
			});

			// Enforce access control
			const accessWhere = await this.enforceAccessControl(
				"read",
				context,
				null,
			);
			const mergedWhere = this.mergeWhere(options.where, accessWhere);

			// Determine if we are using i18n
			const useI18n = !!(this.i18nTable && context.locale);

			// Build SELECT object
			const selectObj = this.buildSelectObject(
				options.columns,
				options.extras,
				context,
			);

			// Start building query
			let query = this.db.select(selectObj).from(this.table);

			// Add i18n join if locale provided and localized fields exist
			if (useI18n) {
				query = query.leftJoin(
					this.i18nTable,
					and(
						eq((this.i18nTable as any).parentId, (this.table as any).id),
						eq((this.i18nTable as any).locale, context.locale!),
					),
				);
			}

			// WHERE clause
			if (mergedWhere) {
				const whereClause = this.buildWhereClause(mergedWhere, useI18n);
				if (whereClause) {
					query = query.where(whereClause);
				}
			}

			// Soft delete filter
			if (this.state.options.softDelete) {
				const softDeleteFilter = sql`${(this.table as any).deletedAt} IS NULL`;
				query = query.where(softDeleteFilter);
			}

			// ORDER BY
			if (options.orderBy) {
				const orderClauses = this.buildOrderByClauses(options.orderBy, useI18n);
				for (const clause of orderClauses) {
					query = query.orderBy(clause);
				}
			}
			// LIMIT 1 (findFirst always returns single result)
			query = query.limit(1);

			// Execute query
			const rows = await query;
			const row = rows[0] || null;

			// Handle relations
			if (row && options.with && this.cms) {
				await this.resolveRelations([row], options.with, context);
			}

			// Execute afterRead hooks
			if (row && this.state.hooks?.afterRead) {
				await this.executeHooks(this.state.hooks.afterRead, {
					db: this.db,
					row,
					locale: context.locale,
					user: context.user,
				});
			}

			return row;
		};
	}

	/**
	 * Resolve relations recursively
	 */
	private async resolveRelations(
		rows: any[],
		withConfig: With,
		context: CRUDContext,
	) {
		if (!rows.length || !withConfig || !this.cms) return;

		for (const [relationName, relationOptions] of Object.entries(withConfig)) {
			if (!relationOptions) continue;

			const relation = this.state.relations[relationName];
			if (!relation) continue;

			const relatedCrud = this.cms.crud(relation.collection, context);

			// Handle BelongsTo (One-to-One / Many-to-One)
			if (relation.fields && relation.fields.length > 0) {
				const sourceField = relation.fields[0];
				const targetFieldName = relation.references[0];

				// Get the actual column name in the DB
				const sourceColName = sourceField.name;

				// 1. Collect IDs
				const sourceIds = new Set(
					rows
						.map((r) => r[sourceColName])
						.filter((id) => id !== null && id !== undefined),
				);
				if (sourceIds.size === 0) continue;

				// 2. Query related
				const nestedOptions =
					typeof relationOptions === "object" ? relationOptions : {};

				const relatedWhere: any = {
					[targetFieldName]: { in: Array.from(sourceIds) },
				};

				if (nestedOptions.where) {
					relatedWhere.AND = [nestedOptions.where];
				}

				const relatedRows = await relatedCrud.findMany(
					{
						...nestedOptions,
						where: relatedWhere,
					},
					context,
				);

				// 3. Map back
				const relatedMap = new Map();
				for (const row of relatedRows) {
					relatedMap.set(row[targetFieldName], row);
				}

				for (const row of rows) {
					const sourceId = row[sourceColName];
					if (sourceId !== null && sourceId !== undefined) {
						row[relationName] = relatedMap.get(sourceId) || null;
					} else {
						row[relationName] = null;
					}
				}
			}
			// Handle HasMany (One-to-Many)
			else if (relation.type === "many" && !relation.fields) {
				const reverseRelationName = relation.relationName;
				if (!reverseRelationName) continue;

				const reverseRelation = relatedCrud.state.relations?.[reverseRelationName];
				if (!reverseRelation?.fields || reverseRelation.fields.length === 0) continue;

				const foreignKeyField = reverseRelation.fields[0].name;
				const primaryKeyField = reverseRelation.references?.[0] || "id";

				// 1. Collect parent IDs
				const parentIds = new Set(
					rows
						.map((r) => r[primaryKeyField])
						.filter((id) => id !== null && id !== undefined),
				);
				if (parentIds.size === 0) continue;

				const nestedOptions =
					typeof relationOptions === "object" ? relationOptions : {};

				// Check if aggregation is requested
				if (nestedOptions._count || nestedOptions._aggregate) {
					// Perform aggregation query
					const relatedTable = relatedCrud.relatedTable;
					const foreignKeyCol = relatedTable[foreignKeyField];

					// Build SELECT clause with aggregations
					const selectClause: Record<string, any> = {
						[foreignKeyField]: foreignKeyCol,
					};

					if (nestedOptions._count) {
						selectClause._count = count().as("_count");
					}

					if (nestedOptions._aggregate) {
						const agg = nestedOptions._aggregate;
						if (agg._count) {
							selectClause._count = count().as("_count");
						}
						if (agg._sum) {
							for (const [field, enabled] of Object.entries(agg._sum)) {
								if (enabled && relatedTable[field]) {
									selectClause[`_sum_${field}`] = sum(relatedTable[field]).as(
										`_sum_${field}`,
									);
								}
							}
						}
						if (agg._avg) {
							for (const [field, enabled] of Object.entries(agg._avg)) {
								if (enabled && relatedTable[field]) {
									selectClause[`_avg_${field}`] = avg(relatedTable[field]).as(
										`_avg_${field}`,
									);
								}
							}
						}
						if (agg._min) {
							for (const [field, enabled] of Object.entries(agg._min)) {
								if (enabled && relatedTable[field]) {
									selectClause[`_min_${field}`] = min(relatedTable[field]).as(
										`_min_${field}`,
									);
								}
							}
						}
						if (agg._max) {
							for (const [field, enabled] of Object.entries(agg._max)) {
								if (enabled && relatedTable[field]) {
									selectClause[`_max_${field}`] = max(relatedTable[field]).as(
										`_max_${field}`,
									);
								}
							}
						}
					}

					// Build WHERE clause
					const whereConditions = [inArray(foreignKeyCol, Array.from(parentIds))];

					if (nestedOptions.where) {
						const additionalWhere = this.buildWhereClause(
							nestedOptions.where,
							false,
							relatedTable,
						);
						if (additionalWhere) {
							whereConditions.push(additionalWhere);
						}
					}

					// Execute aggregation query
					const aggregateResults = await this.db
						.select(selectClause)
						.from(relatedTable)
						.where(and(...whereConditions))
						.groupBy(foreignKeyCol);

					// Map results back to rows
					const aggregateMap = new Map();
					for (const result of aggregateResults) {
						const parentId = result[foreignKeyField];
						const aggData: Record<string, any> = {};

						// Extract aggregate results
						if (result._count !== undefined) {
							aggData._count = Number(result._count);
						}

						// Extract _sum, _avg, _min, _max
						for (const key of Object.keys(result)) {
							if (key.startsWith("_sum_")) {
								if (!aggData._sum) aggData._sum = {};
								aggData._sum[key.replace("_sum_", "")] = Number(result[key]) || 0;
							} else if (key.startsWith("_avg_")) {
								if (!aggData._avg) aggData._avg = {};
								aggData._avg[key.replace("_avg_", "")] = Number(result[key]) || 0;
							} else if (key.startsWith("_min_")) {
								if (!aggData._min) aggData._min = {};
								aggData._min[key.replace("_min_", "")] = result[key];
							} else if (key.startsWith("_max_")) {
								if (!aggData._max) aggData._max = {};
								aggData._max[key.replace("_max_", "")] = result[key];
							}
						}

						aggregateMap.set(parentId, aggData);
					}

					// Attach aggregate data to rows
					for (const row of rows) {
						const parentId = row[primaryKeyField];
						row[relationName] = aggregateMap.get(parentId) || { _count: 0 };
					}
				} else {
					// Normal relation loading (non-aggregated)
					const relatedWhere: any = {
						[foreignKeyField]: { in: Array.from(parentIds) },
					};

					if (nestedOptions.where) {
						relatedWhere.AND = [nestedOptions.where];
					}

					const relatedRows = await relatedCrud.findMany(
						{
							...nestedOptions,
							where: relatedWhere,
						},
						context,
					);

					// 3. Group by parent ID
					const relatedMap = new Map<any, any[]>();
					for (const relatedRow of relatedRows) {
						const parentId = relatedRow[foreignKeyField];
						if (!relatedMap.has(parentId)) {
							relatedMap.set(parentId, []);
						}
						relatedMap.get(parentId)!.push(relatedRow);
					}

					// 4. Attach to rows as arrays
					for (const row of rows) {
						const parentId = row[primaryKeyField];
						row[relationName] = relatedMap.get(parentId) || [];
					}
				}
			}
			// Handle ManyToMany
			else if (relation.type === "manyToMany" && relation.through) {
				const sourceKey = relation.sourceKey || "id";
				const targetKey = relation.targetKey || "id";
				const sourceField = relation.sourceField;
				const targetField = relation.targetField;

				if (!sourceField || !targetField) continue;

				const junctionCrud = this.cms.crud(relation.through, context);

				// 1. Collect source IDs
				const sourceIds = new Set(
					rows
						.map((r) => r[sourceKey])
						.filter((id) => id !== null && id !== undefined),
				);
				if (sourceIds.size === 0) continue;

				// 2. Query junction table to get all links
				const junctionRows = await junctionCrud.findMany(
					{
						where: { [sourceField]: { in: Array.from(sourceIds) } },
					},
					context,
				);

				if (!junctionRows.length) {
					// No links found, attach empty arrays
					for (const row of rows) {
						row[relationName] = [];
					}
					continue;
				}

				// 3. Collect target IDs from junction
				const targetIds = [
					...new Set(
						junctionRows
							.map((j: any) => j[targetField])
							.filter((id: any) => id !== null && id !== undefined),
					),
				];

				if (!targetIds.length) {
					// No target IDs found, attach empty arrays
					for (const row of rows) {
						row[relationName] = [];
					}
					continue;
				}

				// 4. Query related records
				const nestedOptions =
					typeof relationOptions === "object" ? relationOptions : {};

				const relatedWhere: any = {
					[targetKey]: { in: targetIds },
				};

				if (nestedOptions.where) {
					relatedWhere.AND = [nestedOptions.where];
				}

				const relatedRows = await relatedCrud.findMany(
					{
						...nestedOptions,
						where: relatedWhere,
					},
					context,
				);

				// 5. Build mapping: sourceId -> targetIds[]
				const junctionMap = new Map<any, any[]>();
				for (const j of junctionRows) {
					const sid = j[sourceField];
					if (!junctionMap.has(sid)) {
						junctionMap.set(sid, []);
					}
					junctionMap.get(sid)!.push(j[targetField]);
				}

				// 6. Build related map: targetId -> row
				const relatedMap = new Map();
				for (const r of relatedRows) {
					relatedMap.set(r[targetKey], r);
				}

				// 7. Attach to rows as arrays
				for (const row of rows) {
					const sourceId = row[sourceKey];
					const targetIds = junctionMap.get(sourceId) || [];
					row[relationName] = targetIds
						.map((tid) => relatedMap.get(tid))
						.filter((r) => r !== undefined);
				}
			}
			// Handle Polymorphic relations
			else if (relation.type === "polymorphic" && relation.typeField && relation.idField) {
				const typeFieldName = relation.typeField.name;
				const idFieldName = relation.idField.name;
				const collectionsMap = relation.collections || {};

				const typeGroups = new Map<string, any[]>();
				for (const row of rows) {
					const typeValue = row[typeFieldName];
					if (!typeValue) continue;

					if (!typeGroups.has(typeValue)) {
						typeGroups.set(typeValue, []);
					}
					typeGroups.get(typeValue)!.push(row);
				}

				const allRelatedData = new Map<string, any>();

				for (const [typeValue, rowsOfType] of typeGroups.entries()) {
					const collectionName = collectionsMap[typeValue];
					if (!collectionName) continue;

					const relatedCrud = this.cms.crud(collectionName, context);

					const ids = rowsOfType
						.map((r) => r[idFieldName])
						.filter((id) => id !== null && id !== undefined);

					if (ids.length === 0) continue;

					const nestedOptions =
						typeof relationOptions === "object" ? relationOptions : {};

					const relatedRecords = await relatedCrud.findMany(
						{
							...nestedOptions,
							where: {
								id: { in: ids },
								...(nestedOptions.where && { AND: [nestedOptions.where] }),
							},
						},
						context,
					);

					for (const record of relatedRecords) {
						const key = `${typeValue}:${record.id}`;
						allRelatedData.set(key, record);
					}
				}

				// Attach related data to rows
				for (const row of rows) {
					const typeValue = row[typeFieldName];
					const idValue = row[idFieldName];

					if (typeValue && idValue) {
						const key = `${typeValue}:${idValue}`;
						row[relationName] = allRelatedData.get(key) || null;
					} else {
						row[relationName] = null;
					}
				}
			}
		}
	}

	/**
	 * Handle cascade delete operations for relations
	 */
	private async handleCascadeDelete(
		id: string,
		record: any,
		context: CRUDContext,
	): Promise<void> {
		if (!this.cms || !this.state.relations) return;

		for (const [relationName, relation] of Object.entries(this.state.relations)) {
			const onDelete = relation.onDelete;
			if (!onDelete || onDelete === "no action") continue;

			// Handle HasMany relations
			if (relation.type === "many" && !relation.fields) {
				const reverseRelationName = relation.relationName;
				if (!reverseRelationName) continue;

				const relatedCrud = this.cms.crud(relation.collection, context);
				const reverseRelation = relatedCrud.state.relations?.[reverseRelationName];
				if (!reverseRelation?.fields || reverseRelation.fields.length === 0) continue;

				const foreignKeyField = reverseRelation.fields[0].name;
				const primaryKeyField = reverseRelation.references?.[0] || "id";

				const relatedRecords = await relatedCrud.findMany(
					{
						where: { [foreignKeyField]: { eq: record[primaryKeyField] } },
					},
					context,
				);

				if (relatedRecords.length === 0) continue;

				if (onDelete === "cascade") {
					for (const relatedRecord of relatedRecords) {
						await relatedCrud.delete({ id: relatedRecord.id }, context);
					}
				} else if (onDelete === "set null") {
					for (const relatedRecord of relatedRecords) {
						await relatedCrud.update(
							{
								id: relatedRecord.id,
								data: { [foreignKeyField]: null },
							},
							context,
						);
					}
				} else if (onDelete === "restrict") {
					throw new Error(
						`Cannot delete: ${relatedRecords.length} related ${relation.collection} record(s) exist`,
					);
				}
			}

			// Handle ManyToMany relations
			else if (relation.type === "manyToMany" && relation.through) {
				const sourceField = relation.sourceField;
				const sourceKey = relation.sourceKey || "id";

				if (!sourceField) continue;

				const junctionCrud = this.cms.crud(relation.through, context);

				const junctionRecords = await junctionCrud.findMany(
					{
						where: { [sourceField]: { eq: record[sourceKey] } },
					},
					context,
				);

				if (junctionRecords.length === 0) continue;

				if (onDelete === "cascade" || onDelete === "set null") {
					for (const junctionRecord of junctionRecords) {
						await junctionCrud.delete({ id: junctionRecord.id }, context);
					}
				} else if (onDelete === "restrict") {
					throw new Error(
						`Cannot delete: ${junctionRecords.length} related ${relation.collection} link(s) exist`,
					);
				}
			}
		}
	}

	/**
	 * Separate nested relation operations from regular fields
	 */
	private separateNestedRelations(input: any): {
		regularFields: any;
		nestedRelations: Record<string, any>;
	} {
		const regularFields: any = {};
		const nestedRelations: Record<string, any> = {};

		const relationNames = new Set(Object.keys(this.state.relations || {}));

		for (const [key, value] of Object.entries(input)) {
			if (relationNames.has(key) && typeof value === "object" && value !== null) {
				// This is a nested relation operation
				nestedRelations[key] = value;
			} else {
				// Regular field
				regularFields[key] = value;
			}
		}

		return { regularFields, nestedRelations };
	}

	/**
	 * Process nested relation operations (create, connect, connectOrCreate)
	 */
	private async processNestedRelations(
		parentRecord: any,
		nestedRelations: Record<string, any>,
		context: CRUDContext,
		tx: any,
	): Promise<void> {
		if (!this.cms || !this.state.relations) return;

		for (const [relationName, operations] of Object.entries(nestedRelations)) {
			const relation = this.state.relations[relationName];
			if (!relation) continue;

			// Handle BelongsTo (one) relations - skip nested operations
			if (relation.type === "one" && relation.fields && relation.fields.length > 0) {
				continue;
			}

			// Handle HasMany (many) relations
			else if (relation.type === "many" && !relation.fields) {
				const reverseRelationName = relation.relationName;
				if (!reverseRelationName) continue;

				const relatedCrud = this.cms.crud(relation.collection, context);
				const reverseRelation = relatedCrud.state.relations?.[reverseRelationName];
				if (!reverseRelation?.fields || reverseRelation.fields.length === 0) continue;

				const foreignKeyField = reverseRelation.fields[0].name;
				const primaryKeyField = reverseRelation.references?.[0] || "id";

				if (operations.create) {
					const createInputs = Array.isArray(operations.create)
						? operations.create
						: [operations.create];

					for (const createInput of createInputs) {
						await relatedCrud.create(
							{
								...createInput,
								[foreignKeyField]: parentRecord[primaryKeyField],
							},
							{ ...context, db: tx },
						);
					}
				}

				if (operations.connect) {
					const connectInputs = Array.isArray(operations.connect)
						? operations.connect
						: [operations.connect];

					for (const connectInput of connectInputs) {
						await relatedCrud.update(
							{
								id: connectInput.id,
								data: { [foreignKeyField]: parentRecord[primaryKeyField] },
							},
							{ ...context, db: tx },
						);
					}
				}

				if (operations.connectOrCreate) {
					const connectOrCreateInputs = Array.isArray(operations.connectOrCreate)
						? operations.connectOrCreate
						: [operations.connectOrCreate];

					for (const connectOrCreateInput of connectOrCreateInputs) {
						const existing = await relatedCrud.findFirst(
							{ where: { id: connectOrCreateInput.where.id } },
							{ ...context, db: tx },
						);

						if (existing) {
							await relatedCrud.update(
								{
									id: existing.id,
									data: { [foreignKeyField]: parentRecord[primaryKeyField] },
								},
								{ ...context, db: tx },
							);
						} else {
							await relatedCrud.create(
								{
									...connectOrCreateInput.create,
									[foreignKeyField]: parentRecord[primaryKeyField],
								},
								{ ...context, db: tx },
							);
						}
					}
				}
			}

			// Handle ManyToMany relations
			else if (relation.type === "manyToMany" && relation.through) {
				const sourceField = relation.sourceField;
				const targetField = relation.targetField;
				const sourceKey = relation.sourceKey || "id";

				if (!sourceField || !targetField) continue;

				const junctionCrud = this.cms.crud(relation.through, context);
				const relatedCrud = this.cms.crud(relation.collection, context);

				if (operations.create) {
					const createInputs = Array.isArray(operations.create)
						? operations.create
						: [operations.create];

					for (const createInput of createInputs) {
						const relatedRecord = await relatedCrud.create(
							createInput,
							{ ...context, db: tx },
						);

						await junctionCrud.create(
							{
								[sourceField]: parentRecord[sourceKey],
								[targetField]: relatedRecord.id,
							},
							{ ...context, db: tx },
						);
					}
				}

				if (operations.connect) {
					const connectInputs = Array.isArray(operations.connect)
						? operations.connect
						: [operations.connect];

					for (const connectInput of connectInputs) {
						await junctionCrud.create(
							{
								[sourceField]: parentRecord[sourceKey],
								[targetField]: connectInput.id,
							},
							{ ...context, db: tx },
						);
					}
				}

				if (operations.connectOrCreate) {
					const connectOrCreateInputs = Array.isArray(operations.connectOrCreate)
						? operations.connectOrCreate
						: [operations.connectOrCreate];

					for (const connectOrCreateInput of connectOrCreateInputs) {
						const existing = await relatedCrud.findFirst(
							{ where: { id: connectOrCreateInput.where.id } },
							{ ...context, db: tx },
						);

						const targetId = existing
							? existing.id
							: (
									await relatedCrud.create(
										connectOrCreateInput.create,
										{ ...context, db: tx },
									)
								).id;

						await junctionCrud.create(
							{
								[sourceField]: parentRecord[sourceKey],
								[targetField]: targetId,
							},
							{ ...context, db: tx },
						);
					}
				}
			}
		}
	}

	/**
	 * Create create operation
	 */
	private createCreate() {
		return async (input: CreateInput, context: CRUDContext = {}) => {
			// Enforce access control
			const canCreate = await this.enforceAccessControl(
				"create",
				context,
				input,
			);
			if (canCreate === false) {
				throw new Error("Access denied: create");
			}

			// Execute beforeCreate hooks
			await this.executeHooks(this.state.hooks?.beforeCreate, {
				db: this.db,
				input,
				locale: context.locale,
				user: context.user,
			});

			// Execute beforeChange hooks
			await this.executeHooks(this.state.hooks?.beforeChange, {
				db: this.db,
				input,
				locale: context.locale,
				user: context.user,
			});

			// Execute in transaction
			return this.db.transaction(async (tx: any) => {
				// Separate nested relation operations from regular fields
				const { regularFields, nestedRelations } = this.separateNestedRelations(input);

				// Split localized vs non-localized fields
				const { localized, nonLocalized } = this.splitLocalizedFields(regularFields);

				// Insert main record
				const [record] = await tx
					.insert(this.table)
					.values(nonLocalized)
					.returning();

				// Insert localized fields if any
				if (
					this.i18nTable &&
					context.locale &&
					Object.keys(localized).length > 0
				) {
					await tx.insert(this.i18nTable).values({
						parentId: record.id,
						locale: context.locale,
						...localized,
					});

					// Update _title for this locale
					await this.updateI18nTitle(tx, record.id, context);
				}

				// Process nested relation operations (create, connect, connectOrCreate)
				await this.processNestedRelations(
					record,
					nestedRelations,
					context,
					tx,
				);

				// Create version
				await this.createVersion(tx, record, "create", context);

				// Execute afterCreate hooks
				await this.executeHooks(this.state.hooks?.afterCreate, {
					db: tx,
					row: record,
					input,
					locale: context.locale,
					user: context.user,
				});

				// Execute afterChange hooks
				await this.executeHooks(this.state.hooks?.afterChange, {
					db: tx,
					row: record,
					input,
					locale: context.locale,
					user: context.user,
				});

				return record;
			});
		};
	}

	/**
	 * Create update operation
	 */
	private createUpdate() {
		return async (params: UpdateParams, context: CRUDContext = {}) => {
			const { id, data } = params;

			// Load existing record using core query builder
			const existingRows = await this.db
				.select()
				.from(this.table)
				.where(eq((this.table as any).id, id))
				.limit(1);
			const existing = existingRows[0];

			if (!existing) {
				throw new Error(`Record not found: ${id}`);
			}

			// Enforce access control
			const canUpdate = await this.enforceAccessControl(
				"update",
				context,
				existing,
			);
			if (canUpdate === false) {
				throw new Error("Access denied: update");
			}
			if (typeof canUpdate === "object") {
				// Check if existing record matches access conditions
				const matchesConditions = await this.checkAccessConditions(
					canUpdate,
					existing,
				);
				if (!matchesConditions) {
					throw new Error("Access denied: update (conditions not met)");
				}
			}

			// Execute beforeUpdate hooks
			await this.executeHooks(this.state.hooks?.beforeUpdate, {
				db: this.db,
				row: existing,
				input: data,
				locale: context.locale,
				user: context.user,
			});

			// Execute beforeChange hooks
			await this.executeHooks(this.state.hooks?.beforeChange, {
				db: this.db,
				row: existing,
				input: data,
				locale: context.locale,
				user: context.user,
			});

			// Execute in transaction
			return this.db.transaction(async (tx: any) => {
				const { localized, nonLocalized } = this.splitLocalizedFields(data);

				// Update main table
				if (Object.keys(nonLocalized).length > 0) {
					await tx
						.update(this.table)
						.set({
							...nonLocalized,
							...(this.state.options.timestamps !== false
								? { updatedAt: new Date() }
								: {}),
						})
						.where(eq((this.table as any).id, id));

					// Update ALL i18n titles because parent fields might have changed
					await this.updateI18nTitle(tx, id, { ...context, locale: undefined });
				}

				// Upsert localized fields
				if (
					this.i18nTable &&
					context.locale &&
					Object.keys(localized).length > 0
				) {
					await tx
						.insert(this.i18nTable)
						.values({
							parentId: id,
							locale: context.locale,
							...localized,
						})
						.onConflictDoUpdate({
							target: [
								(this.i18nTable as any).parentId,
								(this.i18nTable as any).locale,
							],
							set: localized,
						});

					// Update _title for this locale
					await this.updateI18nTitle(tx, id, context);
				}

				// Fetch updated record
				const updatedRows = await tx
					.select()
					.from(this.table)
					.where(eq((this.table as any).id, id))
					.limit(1);
				const updated = updatedRows[0];

				// Create version
				await this.createVersion(tx, updated, "update", context);

				// Execute afterUpdate hooks
				await this.executeHooks(this.state.hooks?.afterUpdate, {
					db: tx,
					row: updated,
					input: data,
					locale: context.locale,
					user: context.user,
				});

				// Execute afterChange hooks
				await this.executeHooks(this.state.hooks?.afterChange, {
					db: tx,
					row: updated,
					input: data,
					locale: context.locale,
					user: context.user,
				});

				return updated;
			});
		};
	}

	/**
	 * Create delete operation (supports soft delete)
	 */
	private createDelete() {
		return async (params: DeleteParams, context: CRUDContext = {}) => {
			const { id } = params;

			// Load existing record
			// Use select instead of query to avoid dependency on query builder structure which might not exist if collection not registered in db.query
			const existingRows = await this.db
				.select()
				.from(this.table)
				.where(eq((this.table as any).id, id))
				.limit(1);
			const existing = existingRows[0];

			if (!existing) {
				throw new Error(`Record not found: ${id}`);
			}

			// Enforce access control
			const canDelete = await this.enforceAccessControl(
				"delete",
				context,
				existing,
			);
			if (canDelete === false) {
				throw new Error("Access denied: delete");
			}
			if (typeof canDelete === "object") {
				// Check if existing record matches access conditions
				const matchesConditions = await this.checkAccessConditions(
					canDelete,
					existing,
				);
				if (!matchesConditions) {
					throw new Error("Access denied: delete (conditions not met)");
				}
			}

			// Execute beforeDelete hooks
			await this.executeHooks(this.state.hooks?.beforeDelete, {
				db: this.db,
				row: existing,
				user: context.user,
			});

			// Handle cascade operations BEFORE delete
			await this.handleCascadeDelete(id, existing, context);

			// Use transaction for delete + version
			await this.db.transaction(async (tx: any) => {
				// Create version BEFORE delete
				await this.createVersion(tx, existing, "delete", context);

				// Soft delete or hard delete
				if (this.state.options.softDelete) {
					await tx
						.update(this.table)
						.set({ deletedAt: new Date() })
						.where(eq((this.table as any).id, id));
				} else {
					await tx.delete(this.table).where(eq((this.table as any).id, id));
				}
			});

			// Execute afterDelete hooks
			await this.executeHooks(this.state.hooks?.afterDelete, {
				db: this.db,
				row: existing,
				user: context.user,
			});

			return { success: true };
		};
	}

	/**
	 * Find versions of a record
	 */
	private createFindVersions() {
		return async (options: FindVersionsOptions, context: CRUDContext = {}) => {
			if (!this.versionsTable) return [];

			// Enforce read access
			const canRead = await this.enforceAccessControl("read", context, null);
			if (!canRead) throw new Error("Access denied: read versions");

			let query = this.db
				.select()
				.from(this.versionsTable)
				.where(eq((this.versionsTable as any).parentId, options.id))
				.orderBy(sql`${(this.versionsTable as any).version} DESC`);

			if (options.limit) {
				query = query.limit(options.limit);
			}
			if (options.offset) {
				query = query.offset(options.offset);
			}

			return await query;
		};
	}

	/**
	 * Find a specific version
	 */
	private createFindVersion() {
		return async (options: FindVersionOptions, context: CRUDContext = {}) => {
			if (!this.versionsTable) return null;

			// Enforce read access
			const canRead = await this.enforceAccessControl("read", context, null);
			if (!canRead) throw new Error("Access denied: read version");

			const rows = await this.db
				.select()
				.from(this.versionsTable)
				.where(
					and(
						eq((this.versionsTable as any).parentId, options.id),
						eq((this.versionsTable as any).version, options.version),
					),
				)
				.limit(1);

			return rows[0] || null;
		};
	}

	/**
	 * Revert to a specific version
	 */
	private createRevertToVersion() {
		return async (options: RevertVersionOptions, context: CRUDContext = {}) => {
			if (!this.versionsTable) throw new Error("Versioning not enabled");

			// 1. Get version data
			// We call the internal function directly to avoid double access check if we want,
			// but for simplicity calling the generated one (which is a closure) is harder here
			// because `this.createFindVersion()` creates a NEW closure.
			// So we just duplicate logic or call the query.

			const rows = await this.db
				.select()
				.from(this.versionsTable)
				.where(
					and(
						eq((this.versionsTable as any).parentId, options.id),
						eq((this.versionsTable as any).version, options.version),
					),
				)
				.limit(1);
			const version = rows[0];

			if (!version) throw new Error("Version not found");

			// 2. Restore data
			const dataToRestore = version.data; // This is jsonb

			// Remove system fields from data
			const { id, createdAt, updatedAt, deletedAt, ...rest } = dataToRestore;

			// Call update
			// We use `this.createUpdate()` which returns the update function.
			const updateFn = this.createUpdate();
			return await updateFn(
				{
					id: options.id,
					data: rest,
				},
				context,
			);
		};
	}

	/**
	 * Create a new version of the record
	 */
	private async createVersion(
		tx: any,
		row: any,
		operation: "create" | "update" | "delete",
		context: CRUDContext,
	) {
		if (!this.versionsTable) return;

		// Get max version
		const maxVersionQuery = await tx
			.select({ max: sql<number>`MAX(${(this.versionsTable as any).version})` })
			.from(this.versionsTable)
			.where(eq((this.versionsTable as any).parentId, row.id));

		const currentVersion = maxVersionQuery[0]?.max || 0;
		const newVersion = Number(currentVersion) + 1;

		// Insert new version
		await tx.insert(this.versionsTable).values({
			parentId: row.id,
			version: newVersion,
			operation,
			data: row,
			userId: context.user?.id ? String(context.user.id) : null,
			createdAt: new Date(),
		});

		// Cleanup if max versions reached
		const options = this.state.options.versioning;
		if (typeof options === "object" && options.maxVersions) {
			// Find IDs to delete (all versions older than top N)
			const idsToDelete = await tx
				.select({ id: (this.versionsTable as any).id })
				.from(this.versionsTable)
				.where(eq((this.versionsTable as any).parentId, row.id))
				.orderBy(sql`${(this.versionsTable as any).version} DESC`)
				.offset(options.maxVersions);

			if (idsToDelete.length > 0) {
				await tx.delete(this.versionsTable).where(
					inArray(
						(this.versionsTable as any).id,
						idsToDelete.map((v: any) => v.id),
					),
				);
			}
		}
	}

	/**
	 * Execute hooks (supports arrays)
	 */
	private async executeHooks(
		hooks: HookFunction | HookFunction[] | undefined,
		ctx: HookContext,
	) {
		if (!hooks) return;

		const hookArray = Array.isArray(hooks) ? hooks : [hooks];
		for (const hook of hookArray) {
			await hook(ctx);
		}
	}

	/**
	 * Enforce access control
	 * Returns: boolean (allowed/denied) OR AccessWhere (query conditions)
	 */
	private async enforceAccessControl(
		operation: "read" | "create" | "update" | "delete",
		context: CRUDContext,
		row: any,
	): Promise<boolean | AccessWhere> {
		const accessRule = this.state.access?.[operation];
		if (!accessRule) return true; // No access rule = allow

		// Boolean rule
		if (typeof accessRule === "boolean") {
			return accessRule;
		}

		// Role string rule
		if (typeof accessRule === "string") {
			return context.user?.role === accessRule;
		}

		// Function rule
		if (typeof accessRule === "function") {
			const result = await accessRule({
				user: context.user,
				row,
				input: context,
				db: this.db,
			});

			return result;
		}

		return true;
	}

	/**
	 * Check if a row matches access conditions
	 */
	private async checkAccessConditions(
		conditions: AccessWhere,
		row: any,
	): Promise<boolean> {
		// Simple implementation: check each condition
		for (const [key, value] of Object.entries(conditions)) {
			if (key === "AND") {
				// All conditions must match
				for (const cond of value as AccessWhere[]) {
					if (!(await this.checkAccessConditions(cond, row))) {
						return false;
					}
				}
			} else if (key === "OR") {
				// At least one condition must match
				let anyMatch = false;
				for (const cond of value as AccessWhere[]) {
					if (await this.checkAccessConditions(cond, row)) {
						anyMatch = true;
						break;
					}
				}
				if (!anyMatch) return false;
			} else if (key === "NOT") {
				// Condition must NOT match
				if (await this.checkAccessConditions(value as AccessWhere, row)) {
					return false;
				}
			} else {
				// Simple field equality check
				if (row[key] !== value) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Merge user WHERE with access control WHERE
	 */
	private mergeWhere(
		userWhere?: Where,
		accessWhere?: boolean | AccessWhere,
	): Where | undefined {
		if (accessWhere === true || accessWhere === false || !accessWhere) {
			return userWhere;
		}

		// Merge access conditions with user conditions
		if (!userWhere) {
			return accessWhere as Where;
		}

		// Combine with AND
		return {
			AND: [userWhere, accessWhere as Where],
		};
	}

	/**
	 * Build WHERE clause from WHERE object
	 */
	private buildWhereClause(
		where: Where,
		useI18n: boolean = false,
		customTable?: any,
	): SQL | undefined {
		const conditions: SQL[] = [];
		const targetTable = customTable || this.table;

		for (const [key, value] of Object.entries(where)) {
			if (key === "AND" && Array.isArray(value)) {
				const subClauses = value
					.map((w) => this.buildWhereClause(w, useI18n, customTable))
					.filter(Boolean) as SQL[];
				if (subClauses.length > 0) {
					conditions.push(and(...subClauses)!);
				}
			} else if (key === "OR" && Array.isArray(value)) {
				const subClauses = value
					.map((w) => this.buildWhereClause(w, useI18n, customTable))
					.filter(Boolean) as SQL[];
				if (subClauses.length > 0) {
					conditions.push(or(...subClauses)!);
				}
			} else if (key === "NOT" && typeof value === "object") {
				const subClause = this.buildWhereClause(value as Where, useI18n, customTable);
				if (subClause) {
					conditions.push(not(subClause));
				}
			} else if (key === "RAW" && typeof value === "function") {
				conditions.push(value(targetTable));
			} else if (
				typeof value === "object" &&
				value !== null &&
				!Array.isArray(value)
			) {
				// Field operators
				let column = (targetTable as any)[key];
				if (
					key === "_title" &&
					useI18n &&
					this.i18nTable &&
					(this.i18nTable as any)._title
				) {
					column = (this.i18nTable as any)._title;
				}

				if (!column) continue;

				for (const [op, val] of Object.entries(value)) {
					const condition = this.buildOperatorCondition(column, op, val);
					if (condition) conditions.push(condition);
				}
			} else {
				// Simple equality
				let column = (targetTable as any)[key];
				if (
					key === "_title" &&
					useI18n &&
					this.i18nTable &&
					(this.i18nTable as any)._title
				) {
					column = (this.i18nTable as any)._title;
				}

				if (column) {
					conditions.push(eq(column, value));
				}
			}
		}

		return conditions.length > 0 ? and(...conditions) : undefined;
	}

	/**
	 * Build operator condition
	 */
	private buildOperatorCondition(
		column: any,
		op: string,
		value: any,
	): SQL | undefined {
		switch (op) {
			case "eq":
				return eq(column, value);
			case "ne":
				return sql`${column} != ${value}`;
			case "gt":
				return sql`${column} > ${value}`;
			case "gte":
				return sql`${column} >= ${value}`;
			case "lt":
				return sql`${column} < ${value}`;
			case "lte":
				return sql`${column} <= ${value}`;
			case "in":
				return sql`${column} IN ${value}`;
			case "notIn":
				return sql`${column} NOT IN ${value}`;
			case "like":
				return sql`${column} LIKE ${value}`;
			case "ilike":
				return sql`${column} ILIKE ${value}`;
			case "notLike":
				return sql`${column} NOT LIKE ${value}`;
			case "notIlike":
				return sql`${column} NOT ILIKE ${value}`;
			case "contains":
				return sql`${column} ILIKE ${`%${value}%`}`;
			case "startsWith":
				return sql`${column} ILIKE ${`${value}%`}`;
			case "endsWith":
				return sql`${column} ILIKE ${`%${value}`}`;
			case "isNull":
				return value ? sql`${column} IS NULL` : sql`${column} IS NOT NULL`;
			case "isNotNull":
				return value ? sql`${column} IS NOT NULL` : sql`${column} IS NULL`;
			case "arrayOverlaps":
				return sql`${column} && ${value}`;
			case "arrayContained":
				return sql`${column} <@ ${value}`;
			case "arrayContains":
				return sql`${column} @> ${value}`;
			default:
				return undefined;
		}
	}

	/**
	 * Build SELECT object for query
	 * Includes: regular fields, localized fields (with COALESCE), virtual fields, timestamps, _title
	 */
	private buildSelectObject(
		columns?: Columns,
		extras?: Extras,
		context?: CRUDContext,
	): any {
		const select: any = {
			id: (this.table as any).id,
		};

		const locale = context?.locale;
		const defaultLocale = context?.defaultLocale || "en";

		// Determine which fields to include based on columns option
		const includedFields = this.getIncludedFields(columns);

		// Regular and localized fields
		for (const [name, _column] of Object.entries(this.state.fields)) {
			// Skip if not in included fields
			if (!includedFields.has(name)) continue;

			// Localized field: COALESCE with i18n table (fallback to default locale)
			if (
				this.state.localized.includes(name as any) &&
				this.i18nTable &&
				locale
			) {
				const i18nTable = this.i18nTable as any;
				// COALESCE(current_locale_value, default_locale_value)
				select[name] = sql`COALESCE(
					${i18nTable[name]},
					(SELECT ${i18nTable[name]} FROM ${this.i18nTable}
					 WHERE ${i18nTable.parentId} = ${(this.table as any).id}
					 AND ${i18nTable.locale} = ${defaultLocale} LIMIT 1)
				)`;
			}
			// Regular field: direct column reference
			else {
				select[name] = (this.table as any)[name];
			}
		}

		// Virtual fields (computed SQL expressions)
		const virtuals = this.getVirtuals
			? this.getVirtuals(context)
			: this.state.virtuals;

		for (const [name, sqlExpr] of Object.entries(virtuals)) {
			if (!includedFields.has(name)) continue;
			select[name] = sqlExpr;
		}

		// _title field
		if (this.state.title && includedFields.has("_title")) {
			// Use dynamic title if available, otherwise use static (though static might not exist if we removed column)
			const titleExpr = this.getTitle
				? this.getTitle(context)
				: this.state.title;
			if (titleExpr) {
				select._title = titleExpr;
			} else if ((this.table as any)._title) {
				// Fallback to column if it exists (legacy or manual)
				select._title = (this.table as any)._title;
			}
		}

		// Timestamps
		if (this.state.options.timestamps !== false) {
			if (includedFields.has("createdAt")) {
				select.createdAt = (this.table as any).createdAt;
			}
			if (includedFields.has("updatedAt")) {
				select.updatedAt = (this.table as any).updatedAt;
			}
		}

		// Soft delete
		if (this.state.options.softDelete && includedFields.has("deletedAt")) {
			select.deletedAt = (this.table as any).deletedAt;
		}

		// Extras (custom SQL fields)
		if (extras) {
			const extrasObj =
				typeof extras === "function" ? extras(this.table, { sql }) : extras;
			Object.assign(select, extrasObj);
		}

		return select;
	}

	/**
	 * Get included fields based on columns option
	 */
	private getIncludedFields(columns?: Columns): Set<string> {
		if (!columns) {
			// Include all fields
			return new Set([
				...Object.keys(this.state.fields),
				...Object.keys(this.state.virtuals),
				"_title",
				"createdAt",
				"updatedAt",
				"deletedAt",
			]);
		}

		const included = new Set<string>();
		const hasTrueValues = Object.values(columns).some((v) => v === true);

		for (const [key, value] of Object.entries(columns)) {
			if (hasTrueValues) {
				// If we have 'true' values, only include those
				if (value === true) {
					included.add(key);
				}
			} else {
				// Otherwise, include everything except 'false' values
				if (value !== false) {
					included.add(key);
				}
			}
		}

		// If no 'true' values, include all except 'false' ones
		if (!hasTrueValues) {
			for (const key of [
				...Object.keys(this.state.fields),
				...Object.keys(this.state.virtuals),
				"_title",
				"createdAt",
				"updatedAt",
				"deletedAt",
			]) {
				if (columns[key] !== false) {
					included.add(key);
				}
			}
		}

		// Always include 'id'
		included.add("id");

		return included;
	}

	/**
	 * Build order by clauses
	 */
	private buildOrderByClauses(
		orderBy: OrderBy,
		useI18n: boolean = false,
	): SQL[] {
		if (typeof orderBy === "function") {
			return orderBy(this.table, {
				asc: (col: any) => sql`${col} ASC`,
				desc: (col: any) => sql`${col} DESC`,
			});
		}

		// Object syntax
		const clauses: SQL[] = [];
		for (const [field, direction] of Object.entries(orderBy)) {
			let column = (this.table as any)[field];
			if (
				field === "_title" &&
				useI18n &&
				this.i18nTable &&
				(this.i18nTable as any)._title
			) {
				column = (this.i18nTable as any)._title;
			}

			if (column) {
				clauses.push(
					direction === "desc" ? sql`${column} DESC` : sql`${column} ASC`,
				);
			}
		}

		return clauses;
	}

	/**
	 * Split localized and non-localized fields
	 */
	private splitLocalizedFields(input: any) {
		const localized: any = {};
		const nonLocalized: any = {};

		for (const [key, value] of Object.entries(input)) {
			if (this.state.localized.includes(key as any)) {
				localized[key] = value;
			} else {
				nonLocalized[key] = value;
			}
		}

		return { localized, nonLocalized };
	}

	/**
	 * Update i18n _title column using defined title expression
	 */
	private async updateI18nTitle(tx: any, parentId: any, context: CRUDContext) {
		if (!this.i18nTable || !this.getRawTitle) return;

		// Get raw title expression (using direct columns, no COALESCE)
		const titleExpr = this.getRawTitle(context);
		if (!titleExpr) return;

		// Use .from() to allow referencing the main table in the expression
		const qb = tx.update(this.i18nTable).set({ _title: titleExpr });

		const whereConditions: SQL[] = [
			eq((this.i18nTable as any).parentId, parentId),
		];

		if (context.locale) {
			whereConditions.push(eq((this.i18nTable as any).locale, context.locale!));
		}

		// Check if .from is supported (it should be in Drizzle PG)
		if (typeof qb.from === "function") {
			await qb
				.from(this.table)
				.where(
					and(
						eq((this.i18nTable as any).parentId, (this.table as any).id),
						...whereConditions,
					),
				);
		} else {
			// Fallback: Simple update without join (only works if titleExpr doesn't use main table)
			await qb.where(and(...whereConditions));
		}
	}
}
