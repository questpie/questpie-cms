import type { DataModel } from "@qcms-convex/_generated/dataModel";
import type {
	FieldConfig,
	FieldsRecord,
	GetFieldConfigFromPath,
	GetFieldRecordsPaths,
	GetShape,
	ServerFieldConfig,
} from "@qcms/core/types/fields";
import type { FieldLabelType } from "@qcms/core/types/mics";
import type { GenericMutationCtx, GenericQueryCtx } from "convex/server";
import type { GenericId } from "convex/values";

/**
 * Collection configuration (shared - can be used on client)
 * This is the minimal config that works on both client and server
 */
export interface CollectionConfig<
	TName extends string = string,
	TFields extends FieldsRecord = FieldsRecord,
> {
	name: TName;
	label: FieldLabelType;
	description?: FieldLabelType;

	// Field definitions
	fields: TFields;

	// Indexes for querying
	indexes?: Array<{
		name: string;
		fields: string[];
	}>;

	// Search indexes for full-text search
	searchIndexes?: Array<{
		name: string;
		searchField: string;
		filterFields?: string[];
	}>;

	// Vector indexes for similarity search
	vectorIndexes?: Array<{
		name: string;
		vectorField: string;
		dimensions: number;
		filterFields?: string[];
	}>;
}

export type ServerHookContexts<T> = {
	beforeCreate: { data: T; ctx: GenericMutationCtx<DataModel> };
	beforeUpdate: {
		id: GenericId<string>;
		data: Partial<T>;
		ctx: GenericMutationCtx<DataModel>;
	};
	beforeDelete: { id: GenericId<string>; ctx: GenericMutationCtx<DataModel> };

	afterCreate: {
		id: GenericId<string>;
		data: T;
		ctx: GenericMutationCtx<DataModel>;
	};
	afterUpdate: {
		id: GenericId<string>;
		data: Partial<T>;
		ctx: GenericMutationCtx<DataModel>;
	};
	afterDelete: { id: GenericId<string>; ctx: GenericMutationCtx<DataModel> };
};

export type AccessControlContext<T> = {
	read: { doc: T; ctx: GenericQueryCtx<DataModel> };
	create: { data: T; ctx: GenericMutationCtx<DataModel> };
	update: {
		id: GenericId<string>;
		data: Partial<T>;
		ctx: GenericMutationCtx<DataModel>;
	};
	delete: { id: GenericId<string>; ctx: GenericMutationCtx<DataModel> };
};

/**
 * Access control configuration
 */
export interface AccessControl<T = any> {
	read?:
		| boolean
		| ((ctx: AccessControlContext<T>["read"]) => Promise<boolean | any>);
	create?:
		| boolean
		| ((ctx: AccessControlContext<T>["create"]) => Promise<boolean>);
	update?:
		| boolean
		| ((ctx: AccessControlContext<T>["update"]) => Promise<boolean>);
	delete?:
		| boolean
		| ((ctx: AccessControlContext<T>["delete"]) => Promise<boolean>);
}

/**
 * Server-only hooks (NOT shared with client)
 */
export interface ServerHooks<T = any> {
	// Before operations
	beforeCreate?: (
		ctx: ServerHookContexts<T>["beforeCreate"],
	) => Promise<T | undefined>;
	beforeUpdate?: (
		ctx: ServerHookContexts<T>["beforeUpdate"],
	) => Promise<Partial<T> | undefined>;
	beforeDelete?: (ctx: ServerHookContexts<T>["beforeDelete"]) => Promise<void>;

	// After operations
	afterCreate?: (ctx: GenericMutationCtx<DataModel>) => Promise<void>;
	afterUpdate?: (ctx: GenericMutationCtx<DataModel>) => Promise<void>;
	afterDelete?: (ctx: ServerHookContexts<T>["afterDelete"]) => Promise<void>;

	// Read hooks
	afterRead?: (ctx: GenericQueryCtx<DataModel>) => Promise<T>;
}

export type ServerCollectionConfig<
	TCollectionConfig extends CollectionConfig = CollectionConfig,
> = {
	// if accessor points towards a relation field, it should return the title of the related item
	titleAccessor:
		| string
		// function that receives the full item and returns the title string
		| ((item: GetShape<TCollectionConfig["fields"]>) => string);

	hooks?: ServerHooks<GetShape<TCollectionConfig["fields"]>>;
	access?: AccessControl<GetShape<TCollectionConfig["fields"]>>;
	fields?: {
		[K in keyof GetFieldRecordsPaths<
			TCollectionConfig["fields"]
		>]?: GetFieldConfigFromPath<
			TCollectionConfig["fields"],
			Extract<K, string>
		> extends FieldConfig
			? ServerFieldConfig<
					GetFieldConfigFromPath<
						TCollectionConfig["fields"],
						Extract<K, string>
					>
				>
			: never;
	};
};
