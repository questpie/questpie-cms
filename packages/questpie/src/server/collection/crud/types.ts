// crud/types.ts - Type definitions for CRUD operations (Drizzle RQB v2-like)

import type { SQL } from "drizzle-orm";
import type { RequestContext } from "#questpie/server/config/context.js";
import type {
	ExtractRelationInsert,
	ExtractRelationRelations,
	ExtractRelationSelect,
	Prettify,
} from "#questpie/shared/type-utils.js";

/**
 * File object for upload operations
 * Compatible with Web File API and framework adapters
 * Supports streaming for efficient large file uploads
 */
export interface UploadFile {
	/** Original filename */
	name: string;
	/** MIME type */
	type: string;
	/** Size in bytes */
	size: number;
	/** Get file contents as ArrayBuffer (fallback for non-streaming) */
	arrayBuffer: () => Promise<ArrayBuffer>;
	/**
	 * Get file contents as a ReadableStream (preferred for large files)
	 * When available, this is used instead of arrayBuffer for efficient streaming
	 */
	stream?: () => ReadableStream<Uint8Array>;
}

/**
 * Context passed to CRUD operations
 * Extends RequestContext with CRUD-specific options
 * @default accessMode: 'system' - CMS API is backend-only by default
 */
export type CRUDContext = RequestContext;

/**
 * WHERE clause operators for type-safe filtering
 * These match Drizzle's RQB v2 operators
 */
export interface WhereOperators<T> {
	eq?: T;
	ne?: T;
	gt?: T extends Date ? Date | string : T extends number | string ? T : never;
	gte?: T extends Date ? Date | string : T extends number | string ? T : never;
	lt?: T extends Date ? Date | string : T extends number | string ? T : never;
	lte?: T extends Date ? Date | string : T extends number | string ? T : never;
	in?: T[];
	notIn?: T[];
	like?: T extends string ? string : never;
	ilike?: T extends string ? string : never;
	notLike?: T extends string ? string : never;
	notIlike?: T extends string ? string : never;
	contains?: T extends string ? string : never;
	startsWith?: T extends string ? string : never;
	endsWith?: T extends string ? string : never;
	isNull?: boolean;
	isNotNull?: boolean;
	arrayOverlaps?: T extends any[] ? T : never;
	arrayContained?: T extends any[] ? T : never;
	arrayContains?: T extends any[] ? T : never;
}

/**
 * Helper type to detect if a type is `any`
 * Returns true only if T is the `any` type
 */
type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Helper type to get value type from array or single relation
 */
type RelationValue<T> = T extends (infer U)[] ? U : T;

/**
 * Relation WHERE clause for filtering
 * Supports "some/none/every" for collections and "is/isNot" for single relations
 */
export type RelationFilter<TFields = any, TRelations = any> =
	| Where<TFields, TRelations>
	| {
			some?: Where<TFields, TRelations>;
			none?: Where<TFields, TRelations>;
			every?: Where<TFields, TRelations>;
			is?: Where<TFields, TRelations>;
			isNot?: Where<TFields, TRelations>;
	  };

/**
 * Helper type for extracting relation fields for Where clause
 * Only creates relation filters when TRelations has specific keys (not index signature)
 */
type RelationWhereFields<TRelations> = [TRelations] extends [never]
	? {}
	: IsAny<TRelations> extends true
		? {} // When TRelations is `any`, don't create index signature
		: string extends keyof TRelations
			? {} // TRelations has index signature (e.g., Record<string, ...>), don't add relation fields
			: [TRelations] extends [Record<string, any>]
				? keyof TRelations extends never
					? {} // Empty relations object
					: {
							[K in keyof TRelations]?: RelationFilter<
								ExtractRelationSelect<RelationValue<TRelations[K]>>,
								ExtractRelationRelations<RelationValue<TRelations[K]>>
							>;
						}
				: {};

/**
 * WHERE clause for filtering
 * Supports field conditions, logical operators, and relations
 */
export type Where<TFields = any, TRelations = any> = {
	[K in keyof TFields]?: TFields[K] | WhereOperators<TFields[K]>;
} & {
	AND?: Where<TFields, TRelations>[];
	OR?: Where<TFields, TRelations>[];
	NOT?: Where<TFields, TRelations>;
	// RAW allows custom SQL expressions
	RAW?: (table: any) => SQL;
} & RelationWhereFields<TRelations>;

/**
 * Columns selection for partial field selection
 *
 * Two modes:
 * 1. Inclusion mode: { field1: true, field2: true } - only include specified fields
 * 2. Omission mode: { field1: false, field2: false } - include all fields EXCEPT specified ones
 *
 * Notes:
 * - If any field is set to true, only fields with true are included (inclusion mode)
 * - If all fields are false, all fields except false ones are included (omission mode)
 * - To select all fields, simply omit the columns option entirely
 * - The 'id' field is always included regardless of selection
 */
export type Columns<TFields = any> = {
	[K in keyof TFields]?: boolean;
};

/**
 * Order by direction
 */
export type OrderByDirection = "asc" | "desc";

/**
 * Order by clause
 * - Object syntax: { field: 'asc' | 'desc' }
 * - Function syntax: (table, { asc, desc }) => [asc(table.id), desc(table.name)]
 */
export type OrderBy<TFields = any> =
	| {
			[K in keyof TFields]?: OrderByDirection;
	  }
	| ((
			table: any,
			helpers: { asc: (col: any) => SQL; desc: (col: any) => SQL },
	  ) => SQL[]);

/**
 * Extras for custom SQL fields
 * - Object syntax: { field: sql`...` }
 * - Function syntax: (table, { sql }) => ({ field: sql`...` })
 */
export type Extras<_TResult = any> =
	| Record<string, SQL>
	| ((table: any, helpers: { sql: any }) => Record<string, SQL>);

/**
 * Aggregation options for relations
 */
export interface RelationAggregation<TFields = any> {
	_count?: boolean; // Count related records
	_sum?: {
		[K in keyof TFields]?: boolean; // Sum numeric fields
	};
	_avg?: {
		[K in keyof TFields]?: boolean; // Average numeric fields
	};
	_min?: {
		[K in keyof TFields]?: boolean; // Minimum value
	};
	_max?: {
		[K in keyof TFields]?: boolean; // Maximum value
	};
}

type RelationSelect<T> = ExtractRelationSelect<RelationValue<T>>;

type RelationRelations<T> = ExtractRelationRelations<RelationValue<T>>;

/**
 * WITH clause for including relations
 * Supports nested relations and sub-queries
 */
export type With<TRelations = any> = {
	[K in keyof TRelations]?:
		| boolean
		| {
				columns?: Columns;
				where?: Where;
				orderBy?: OrderBy;
				limit?: number;
				offset?: number;
				with?: With<RelationRelations<TRelations[K]>>;
				// Aggregation: if specified, returns aggregate data instead of full records
				_aggregate?: RelationAggregation;
				// Shorthand for just count
				_count?: boolean;
		  };
};

/**
 * Options for findMany query (Drizzle RQB v2-like)
 */
export interface FindManyOptions<TFields = any, TRelations = any> {
	where?: Where<TFields, TRelations>;
	columns?: Columns<TFields>;
	with?: With<TRelations>;
	orderBy?: OrderBy<TFields>;
	limit?: number;
	offset?: number;
	extras?: Extras;
	/**
	 * Override locale for this request.
	 */
	locale?: string;
	/**
	 * Disable fallback to default locale when translation is missing.
	 */
	localeFallback?: boolean;
	/**
	 * Include soft-deleted records (only applies when softDelete is enabled)
	 */
	includeDeleted?: boolean;
}

/**
 * Options for findOne query (Drizzle RQB v2-like)
 * Same as FindManyOptions but without limit/offset (always limit 1)
 */
export interface FindOneOptions<TFields = any, TRelations = any> {
	where?: Where<TFields, TRelations>;
	columns?: Columns<TFields>;
	with?: With<TRelations>;
	orderBy?: OrderBy<TFields>;
	extras?: Extras;
	/**
	 * Override locale for this request.
	 */
	locale?: string;
	/**
	 * Disable fallback to default locale when translation is missing.
	 */
	localeFallback?: boolean;
	/**
	 * Include soft-deleted records (only applies when softDelete is enabled)
	 */
	includeDeleted?: boolean;
}

/**
 * Nested relation operations for create/update
 */
export interface NestedRelationConnect {
	id: string; // Connect to existing record by ID
}

export interface NestedRelationCreate<TInsert = any> {
	data: TInsert; // Create new record
}

export interface NestedRelationConnectOrCreate<TInsert = any> {
	where: { id: string }; // Check if exists
	create: TInsert; // Create if doesn't exist
}

/**
 * Nested relation mutation options
 */
export type NestedRelationMutation<TInsert = any> = {
	connect?: NestedRelationConnect | NestedRelationConnect[]; // Link existing record(s)
	create?: TInsert | TInsert[]; // Create new record(s)
	connectOrCreate?:
		| NestedRelationConnectOrCreate<TInsert>
		| NestedRelationConnectOrCreate<TInsert>[]; // Create if doesn't exist
};

type RelationKeys<TRelations> = [TRelations] extends [never]
	? never
	: [TRelations] extends [Record<string, any>]
		? keyof TRelations & string
		: never;

/**
 * Helper type for extracting relation mutation fields
 * Only creates relation mutations when TRelations has specific keys (not index signature)
 * Uses the same pattern as RelationWhereFields for consistency
 */
type RelationMutations<TRelations> = [TRelations] extends [never]
	? {}
	: IsAny<TRelations> extends true
		? {} // When TRelations is `any`, don't create index signature
		: string extends keyof TRelations
			? {} // TRelations has index signature (e.g., Record<string, ...>), don't add relation fields
			: [TRelations] extends [Record<string, any>]
				? keyof TRelations extends never
					? {} // No relations, return empty object
					: {
							[K in keyof TRelations]?: NestedRelationMutation<
								ExtractRelationInsert<RelationValue<TRelations[K]>>
							>;
						}
				: {}; // Not a record type or unknown, return empty object instead of permissive Record

// With unified field API, FK column key is the same as the relation field name
type RelationIdKey<TInsert, K extends string> = Extract<
	Extract<keyof TInsert, string>,
	K
>;

type RelationForeignKeys<TInsert, TRelations> =
	RelationKeys<TRelations> extends infer K
		? K extends string
			? RelationIdKey<TInsert, K>
			: never
		: never;

type OptionalKeys<T> = {
	[K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;

type IsRequiredKey<T, K extends keyof T> = K extends RequiredKeys<T>
	? true
	: false;

type OptionalizeKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

type OptionalizeRelationForeignKeys<TInsert, TRelations> =
	RelationForeignKeys<TInsert, TRelations> extends keyof TInsert
		? OptionalizeKeys<TInsert, RelationForeignKeys<TInsert, TRelations>>
		: TInsert;

type UnionToIntersection<U> = (
	U extends any
		? (value: U) => void
		: never
) extends (value: infer I) => void
	? I
	: never;

type RequireRelationForMissingFk<TInsert, TRelations, TInput> = [
	TRelations,
] extends [never]
	? {} // Never type, nothing to require
	: IsAny<TRelations> extends true
		? {} // Any type, don't enforce anything
		: string extends keyof TRelations
			? {} // TRelations has index signature, don't enforce anything
			: [TRelations] extends [Record<string, any>]
				? keyof TRelations extends never
					? {} // No relations, nothing to require
					: RelationKeys<TRelations> extends infer K
						? K extends string
							? RelationIdKey<TInsert, K> extends never
								? {}
								: RelationIdKey<TInsert, K> extends keyof TInsert
									? IsRequiredKey<
											TInsert,
											RelationIdKey<TInsert, K>
										> extends true
										? RelationIdKey<TInsert, K> extends keyof TInput
											? {}
											: K extends keyof TRelations
												? K extends keyof RelationMutations<TRelations>
													? Required<Pick<RelationMutations<TRelations>, K>>
													: {}
												: {}
										: {}
									: {}
							: {}
						: {}
				: {};

type EnforceRelationForMissingFk<TInsert, TRelations, TInput> = [
	TRelations,
] extends [never]
	? {}
	: IsAny<TRelations> extends true
		? {} // Any type, don't enforce anything
		: string extends keyof TRelations
			? {} // TRelations has index signature, don't enforce anything
			: [TRelations] extends [Record<string, any>]
				? keyof TRelations extends never
					? {}
					: UnionToIntersection<
							RequireRelationForMissingFk<TInsert, TRelations, TInput>
						>
				: {};

/**
 * Create input with optional nested relations
 */
export type CreateInputBase<
	TInsert = any,
	TRelations = any,
> = OptionalizeRelationForeignKeys<TInsert, TRelations> &
	Omit<RelationMutations<TRelations>, keyof TInsert>;

export type CreateInputWithRelations<
	TInsert = any,
	TRelations = any,
	TInput extends CreateInputBase<TInsert, TRelations> = CreateInputBase<
		TInsert,
		TRelations
	>,
> = TInput & EnforceRelationForMissingFk<TInsert, TRelations, TInput>;

export type CreateInput<TInsert = any, TRelations = any> = CreateInputBase<
	TInsert,
	TRelations
>;

/**
 * Update input with optional nested relation mutations
 */
export type UpdateInput<TUpdate = any, TRelations = any> = Prettify<
	Partial<TUpdate> & RelationMutations<TRelations>
>;

/**
 * Extract ID type from select type (defaults to string for UUID)
 */
export type ExtractIdType<T> = T extends { id: infer I } ? I : string;

/**
 * Update single record params
 */
export interface UpdateParams<TUpdate = any, TRelations = any, TId = string> {
	id: TId;
	data: UpdateInput<TUpdate, TRelations>;
}

/**
 * Update many records params
 */
export interface UpdateManyParams<
	TUpdate = any,
	TFields = any,
	TRelations = any,
> {
	where: Where<TFields, TRelations>;
	data: UpdateInput<TUpdate, TRelations>;
}

/**
 * Delete single record params
 */
export interface DeleteParams<TId = string> {
	id: TId;
}

/**
 * Restore soft-deleted record params
 */
export interface RestoreParams<TId = string> {
	id: TId;
}

/**
 * Delete many records params
 */
export interface DeleteManyParams<TFields = any, TRelations = any> {
	where: Where<TFields, TRelations>;
}

export interface FindVersionsOptions<TId = string> {
	id: TId;
	limit?: number;
	offset?: number;
}

export interface RevertVersionOptions<TId = string> {
	id: TId;
	version?: number;
	versionId?: string;
}

export interface VersionRecord<TId = string> {
	id: TId;
	versionId: string;
	versionNumber: number;
	versionOperation: string;
	versionUserId: string | null;
	versionCreatedAt: Date;
	[key: string]: any;
}

export interface PaginatedResult<T> {
	docs: T[];
	totalDocs: number;
	limit: number;
	totalPages: number;
	page: number;
	pagingCounter: number;
	hasPrevPage: boolean;
	hasNextPage: boolean;
	prevPage: number | null;
	nextPage: number | null;
}

/**
 * Type Helper for Partial Selection
 * Picks fields based on 'columns' option. Always includes 'id'.
 */
export type SelectResult<TSelect, TQuery> = [TQuery] extends [never]
	? TSelect
	: TQuery extends { columns: Record<string, boolean> }
		? Pick<
				TSelect,
				| Extract<keyof TQuery["columns"], keyof TSelect>
				| ("id" extends keyof TSelect ? "id" : never)
			>
		: TSelect;

/**
 * Helper type for Aggregation Result
 */
export type AggregationResult<TAgg extends RelationAggregation> =
	(TAgg["_count"] extends true ? { _count: number } : {}) &
		(TAgg["_sum"] extends object
			? { _sum: { [K in keyof TAgg["_sum"]]: number } }
			: {}) &
		(TAgg["_avg"] extends object
			? { _avg: { [K in keyof TAgg["_avg"]]: number } }
			: {}) &
		(TAgg["_min"] extends object
			? { _min: { [K in keyof TAgg["_min"]]: any } }
			: {}) &
		(TAgg["_max"] extends object
			? { _max: { [K in keyof TAgg["_max"]]: any } }
			: {});

/**
 * Type Helper for Relations Inclusion
 * Adds keys based on 'with' option.
 * Uses the inferred relation types from TRelations.
 * Handles Array vs Single relations and Aggregations.
 */
export type RelationResult<TRelations, TQuery> = [TQuery] extends [never]
	? {}
	: TQuery extends { with?: any }
		? TQuery["with"] extends Record<string, any>
			? {
					[K in keyof TQuery["with"]]: K extends keyof TRelations
						? TRelations[K] extends (infer S)[]
							? TQuery["with"][K] extends
									| { _count: true }
									| {
											_aggregate: any;
									  }
								? (TQuery["with"][K] extends { _count: true }
										? { _count: number }
										: Record<never, never>) &
										(TQuery["with"][K] extends { _aggregate: infer Agg }
											? Agg extends RelationAggregation
												? AggregationResult<Agg>
												: Record<never, never>
											: Record<never, never>)
								: ApplyQuery<
										RelationSelect<S>,
										RelationRelations<S>,
										TQuery["with"][K]
									>[]
							: ApplyQuery<
									RelationSelect<TRelations[K]>,
									RelationRelations<TRelations[K]>,
									TQuery["with"][K]
								>
						: never;
				}
			: Record<never, never>
		: Record<never, never>;

type QueryOptions<TSelect, TRelations, TQuery> = Extract<
	TQuery,
	FindManyOptions<TSelect, TRelations>
>;

/**
 * Combined Result Type
 * Merges partial selection and included relations.
 */
export type ApplyQuery<
	TSelect,
	TRelations,
	TQuery extends FindManyOptions<TSelect, TRelations> | undefined | boolean,
> = Prettify<
	TQuery extends undefined | true
		? TSelect
		: TQuery extends false
			? never
			: SelectResult<TSelect, QueryOptions<TSelect, TRelations, TQuery>> &
					RelationResult<TRelations, QueryOptions<TSelect, TRelations, TQuery>>
>;

/**
 * CRUD operations interface
 * Clear naming: find/findOne for reads, updateById/update for updates, deleteById/delete for deletes
 */
export interface CRUD<
	TSelect = any,
	TInsert = any,
	TUpdate = any,
	TRelations = any,
	TId = ExtractIdType<TSelect>,
> {
	/**
	 * Find many records (paginated)
	 * Returns type-safe result based on columns and with options
	 */
	find<TQuery extends FindManyOptions<TSelect, TRelations>>(
		options?: TQuery,
		context?: CRUDContext,
	): Promise<PaginatedResult<ApplyQuery<TSelect, TRelations, TQuery>>>;

	/**
	 * Find single record matching query
	 * Returns type-safe result based on columns and with options
	 */
	findOne<TQuery extends FindOneOptions<TSelect, TRelations>>(
		options?: TQuery,
		context?: CRUDContext,
	): Promise<ApplyQuery<TSelect, TRelations, TQuery> | null>;

	/**
	 * Count records matching query
	 */
	count(
		options?: Pick<
			FindManyOptions<TSelect, TRelations>,
			"where" | "includeDeleted"
		>,
		context?: CRUDContext,
	): Promise<number>;

	/**
	 * Create a new record
	 */
	create<TInput extends CreateInputBase<TInsert, TRelations>>(
		input: CreateInputWithRelations<TInsert, TRelations, TInput>,
		context?: CRUDContext,
	): Promise<TSelect>;

	/**
	 * Update a single record by ID
	 */
	updateById(
		params: UpdateParams<TUpdate, TRelations, TId>,
		context?: CRUDContext,
	): Promise<TSelect>;

	/**
	 * Update multiple records matching where clause
	 * Uses batched SQL operation for efficiency
	 */
	update(
		params: UpdateManyParams<TUpdate, TSelect, TRelations>,
		context?: CRUDContext,
	): Promise<TSelect[]>;

	/**
	 * Delete a single record by ID (supports soft delete)
	 */
	deleteById(
		params: DeleteParams<TId>,
		context?: CRUDContext,
	): Promise<{ success: boolean }>;

	/**
	 * Restore a single soft-deleted record by ID
	 */
	restoreById(
		params: RestoreParams<TId>,
		context?: CRUDContext,
	): Promise<TSelect>;

	/**
	 * Delete multiple records matching where clause
	 * Uses batched SQL operation for efficiency
	 */
	delete(
		params: DeleteManyParams<TSelect, TRelations>,
		context?: CRUDContext,
	): Promise<{ success: boolean; count: number }>;

	/**
	 * Find versions of a record
	 */
	findVersions(
		options: FindVersionsOptions<TId>,
		context?: CRUDContext,
	): Promise<VersionRecord<TId>[]>;

	/**
	 * Revert to a specific version
	 */
	revertToVersion(
		options: RevertVersionOptions<TId>,
		context?: CRUDContext,
	): Promise<TSelect>;

	/**
	 * Upload a single file
	 * Only available on collections configured with .upload()
	 *
	 * @example
	 * ```ts
	 * const asset = await cms.api.collections.media.upload(file, context);
	 * console.log(asset.url); // Typed URL
	 * ```
	 */
	upload?(
		file: UploadFile,
		context?: CRUDContext,
		/** Additional fields to set on the created record */
		additionalData?: Partial<TInsert>,
	): Promise<TSelect>;

	/**
	 * Upload multiple files
	 * Only available on collections configured with .upload()
	 *
	 * @example
	 * ```ts
	 * const assets = await cms.api.collections.media.uploadMany(files, context);
	 * ```
	 */
	uploadMany?(
		files: UploadFile[],
		context?: CRUDContext,
		/** Additional fields to set on each created record */
		additionalData?: Partial<TInsert>,
	): Promise<TSelect[]>;

	// Internal properties (not part of public API)
	"~internalState"?: any;
	"~internalRelatedTable"?: any;
	"~internalI18nTable"?: any;
}
