// crud/types.ts - Type definitions for CRUD operations (Drizzle RQB v2-like)

import type { SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * Context passed to CRUD operations
 * Contains user, locale, and other contextual information
 */
export interface CRUDContext {
	user?: any;
	locale?: string;
	defaultLocale?: string; // Add default locale to context
	[key: string]: any;
}

/**
 * WHERE clause operators for type-safe filtering
 * These match Drizzle's RQB v2 operators
 */
export interface WhereOperators<T> {
	eq?: T;
	ne?: T;
	gt?: T extends number ? number : never;
	gte?: T extends number ? number : never;
	lt?: T extends number ? number : never;
	lte?: T extends number ? number : never;
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
 * WHERE clause for filtering
 * Supports field conditions, logical operators, and relations
 */
export type Where<TFields = any> = {
	[K in keyof TFields]?: TFields[K] | WhereOperators<TFields[K]>;
} & {
	AND?: Where<TFields>[];
	OR?: Where<TFields>[];
	NOT?: Where<TFields>;
	// RAW allows custom SQL expressions
	RAW?: (table: any) => SQL;
};

/**
 * Columns selection for partial field selection
 * - true: include field
 * - false: exclude field (ignored if any true is present)
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
	| ((table: any, helpers: { asc: (col: any) => SQL; desc: (col: any) => SQL }) => SQL[]);

/**
 * Extras for custom SQL fields
 * - Object syntax: { field: sql`...` }
 * - Function syntax: (table, { sql }) => ({ field: sql`...` })
 */
export type Extras<TResult = any> =
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
				with?: With;
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
	where?: Where<TFields>;
	columns?: Columns<TFields>;
	with?: With<TRelations>;
	orderBy?: OrderBy<TFields>;
	limit?: number;
	offset?: number;
	extras?: Extras;
}

/**
 * Options for findFirst query (Drizzle RQB v2-like)
 * Same as FindManyOptions but without limit/offset (always limit 1)
 */
export interface FindFirstOptions<TFields = any, TRelations = any> {
	where?: Where<TFields>;
	columns?: Columns<TFields>;
	with?: With<TRelations>;
	orderBy?: OrderBy<TFields>;
	extras?: Extras;
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
	connectOrCreate?: NestedRelationConnectOrCreate<TInsert> | NestedRelationConnectOrCreate<TInsert>[]; // Create if doesn't exist
};

/**
 * Create input with optional nested relations
 */
export type CreateInput<TInsert = any, TRelations = any> = TInsert & {
	[K in keyof TRelations]?: NestedRelationMutation<any>;
};

/**
 * Update params
 */
export interface UpdateParams<TUpdate = any> {
	id: string; // UUID
	data: Partial<TUpdate>;
}

/**
 * Delete params
 */
export interface DeleteParams {
	id: string; // UUID
}

export interface FindVersionsOptions {
    id: string;
    limit?: number;
    offset?: number;
}

export interface FindVersionOptions {
    id: string;
    version: number;
}

export interface RevertVersionOptions {
    id: string;
    version: number;
}

export interface VersionRecord {
    id: string;
    parentId: string;
    version: number;
    operation: string;
    data: any;
    userId: string | null;
    createdAt: Date;
}

/**
 * CRUD operations interface
 * Mirrors Drizzle RQB v2 API with added context support
 */
export interface CRUD<TSelect = any, TInsert = any, TUpdate = any, TRelations = any> {
	/**
	 * Find many records (like db.query.table.findMany)
	 */
	findMany(
		options?: FindManyOptions<TSelect, TRelations>,
		context?: CRUDContext,
	): Promise<TSelect[]>;

	/**
	 * Find first record (like db.query.table.findFirst)
	 */
	findFirst(
		options?: FindFirstOptions<TSelect, TRelations>,
		context?: CRUDContext,
	): Promise<TSelect | null>;

	/**
	 * Create a new record
	 */
	create(input: CreateInput<TInsert>, context?: CRUDContext): Promise<TSelect>;

	/**
	 * Update a record
	 */
	update(params: UpdateParams<TUpdate>, context?: CRUDContext): Promise<TSelect>;

	/**
	 * Delete a record (supports soft delete)
	 */
	delete(params: DeleteParams, context?: CRUDContext): Promise<{ success: boolean }>;

    /**
     * Find versions of a record
     */
    findVersions(options: FindVersionsOptions, context?: CRUDContext): Promise<VersionRecord[]>;

    /**
     * Find a specific version
     */
    findVersion(options: FindVersionOptions, context?: CRUDContext): Promise<VersionRecord | null>;

    /**
     * Revert to a specific version
     */
    revertToVersion(options: RevertVersionOptions, context?: CRUDContext): Promise<TSelect>;
}
