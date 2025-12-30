import type {
	CRUDContext,
	With,
} from "#questpie/cms/server/collection/crud/types";

export interface GlobalGetOptions<TRelations = any> {
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

export interface GlobalCRUD<
	TSelect = any,
	TInsert = any,
	TUpdate = any,
	TRelations = any,
> {
	get(
		options?: GlobalGetOptions<TRelations>,
		context?: CRUDContext,
	): Promise<TSelect | null>;
	update(data: TUpdate, context?: CRUDContext): Promise<TSelect>;
	findVersions(
		options?: GlobalFindVersionsOptions,
		context?: CRUDContext,
	): Promise<GlobalVersionRecord[]>;
	revertToVersion(
		options: GlobalRevertVersionOptions,
		context?: CRUDContext,
	): Promise<TSelect>;
}
