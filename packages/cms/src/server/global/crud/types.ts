import type {
	CRUDContext,
	With,
	Columns,
	ApplyQuery,
} from "#questpie/cms/server/collection/crud/types";

/**
 * Options for getting a global record
 * Type-safe with support for partial selection and relation loading
 */
export interface GlobalGetOptions<TFields = any, TRelations = any> {
	/**
	 * Load relations
	 */
	with?: With<TRelations>;

	/**
	 * Select specific columns only (partial selection)
	 */
	columns?: Columns<TFields>;
}

/**
 * Options for updating a global record
 * Type-safe with support for relation loading in response
 */
export interface GlobalUpdateOptions<TRelations = any> {
	/**
	 * Load relations in the response
	 */
	with?: With<TRelations>;
}

export interface GlobalFindVersionsOptions {
	id?: string;
	limit?: number;
	offset?: number;
}

export interface GlobalRevertVersionOptions {
	id?: string;
	version?: number;
	versionId?: string;
}

export interface GlobalVersionRecord {
	id: string;
	versionId: string;
	versionNumber: number;
	versionOperation: string;
	versionUserId: string | null;
	versionCreatedAt: Date;
	[key: string]: any;
}

/**
 * Type-safe Global CRUD interface
 * Similar to Collection CRUD but adapted for singleton pattern
 */
export interface GlobalCRUD<
	TSelect = any,
	TInsert = any,
	TUpdate = any,
	TRelations = any,
> {
	/**
	 * Get the global record (singleton)
	 * Supports partial selection and relation loading
	 */
	get<TQuery extends GlobalGetOptions<TSelect, TRelations>>(
		options?: TQuery,
		context?: CRUDContext,
	): Promise<ApplyQuery<TSelect, TRelations, TQuery> | null>;

	/**
	 * Update the global record
	 * Supports loading relations in response
	 */
	update<TQuery extends GlobalUpdateOptions<TRelations>>(
		data: TUpdate,
		context?: CRUDContext,
		options?: TQuery,
	): Promise<ApplyQuery<TSelect, TRelations, TQuery>>;

	findVersions(
		options?: GlobalFindVersionsOptions,
		context?: CRUDContext,
	): Promise<GlobalVersionRecord[]>;

	revertToVersion(
		options: GlobalRevertVersionOptions,
		context?: CRUDContext,
	): Promise<TSelect>;
}
