import { Collection } from "#questpie/cms/server/collection/builder/collection";
import type {
	CollectionAccess,
	CollectionBuilderIndexesFn,
	CollectionBuilderState,
	CollectionBuilderTitleFn,
	CollectionBuilderVirtualsFn,
	CollectionFunctionsMap,
	CollectionHooks,
	CollectionOptions,
	RelationConfig,
	EmptyCollectionState,
	CollectionBuilderRelationFn,
} from "#questpie/cms/server/collection/builder/types";
import type { SearchableConfig } from "#questpie/cms/server/integrated/search";
import type { PgTableExtraConfigValue } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import {
	createCollectionValidationSchemas,
	type ValidationSchemas,
} from "#questpie/cms/server/collection/builder/validation-helpers";
import type { z } from "zod";

/**
 * Main collection builder class
 * Uses Drizzle-style single generic pattern for better type performance
 */
export class CollectionBuilder<TState extends CollectionBuilderState> {
	private state: TState;
	private _builtCollection?: Collection<TState>;

	// Store callback functions for lazy evaluation
	private _virtualsFn?: CollectionBuilderVirtualsFn<TState, TState["virtuals"]>;
	private _relationsFn?: CollectionBuilderRelationFn<TState, any>;
	private _indexesFn?: CollectionBuilderIndexesFn<TState, TState["indexes"]>;
	private _titleFn?: CollectionBuilderTitleFn<TState, TState["title"]>;

	constructor(state: TState) {
		this.state = state;
	}

	/**
	 * Define fields using Drizzle column definitions
	 * This carries forward the exact Drizzle types for full type safety
	 * Accepts column builders - Drizzle will convert them when creating the table
	 */
	fields<TNewFields extends Record<string, any>>(
		fields: TNewFields,
	): CollectionBuilder<
		Omit<TState, "fields" | "localized"> & {
			fields: TNewFields;
			localized: []; // Reset localized when fields change
		}
	> {
		const newState = {
			...this.state,
			fields,
			localized: [] as any,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Mark fields as localized (moved to i18n table)
	 * Type safety: only allows keys that exist in fields
	 */
	localized<TKeys extends ReadonlyArray<keyof TState["fields"]>>(
		keys: TKeys,
	): CollectionBuilder<
		Omit<TState, "localized"> & {
			localized: TKeys;
		}
	> {
		const newState = {
			...this.state,
			localized: keys,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Define virtual (computed) fields
	 * Callback receives context object with table, i18n accessor, and context
	 */
	virtuals<TNewVirtuals extends Record<string, SQL>>(
		fn: CollectionBuilderVirtualsFn<TState, TNewVirtuals>,
	): CollectionBuilder<
		Omit<TState, "virtuals"> & {
			virtuals: TNewVirtuals;
		}
	> {
		const newState = {
			...this.state,
			virtuals: {} as TNewVirtuals, // Populated during build()
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy existing callback functions and set new virtualsFn
		newBuilder._virtualsFn = fn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Define relations to other collections
	 */
	relations<TNewRelations extends Record<string, RelationConfig>>(
		fn: CollectionBuilderRelationFn<TState, TNewRelations>,
	): CollectionBuilder<
		Omit<TState, "relations"> & {
			relations: TNewRelations;
		}
	> {
		const newState = {
			...this.state,
			relations: {} as TNewRelations,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy existing callback functions and set new relationsFn
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = fn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Define indexes and constraints
	 * Callback receives context object with table
	 */
	indexes<TNewIndexes extends PgTableExtraConfigValue[]>(
		fn: CollectionBuilderIndexesFn<TState, TNewIndexes>,
	): CollectionBuilder<
		Omit<TState, "indexes"> & {
			indexes: TNewIndexes;
		}
	> {
		const newState = {
			...this.state,
			indexes: {} as TNewIndexes,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy existing callback functions and set new indexesFn
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = fn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Define title expression (creates searchable _title column)
	 * Callback receives context object with table, i18n accessor, and context
	 */
	title<TNewTitle extends SQL>(
		fn: CollectionBuilderTitleFn<TState, TNewTitle>,
	): CollectionBuilder<
		Omit<TState, "title"> & {
			title: TNewTitle;
		}
	> {
		const newState = {
			...this.state,
			title: undefined as any,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy existing callback functions and set new titleFn
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = fn;

		return newBuilder;
	}

	/**
	 * Set collection options (timestamps, softDelete, versioning)
	 */
	options<TNewOptions extends CollectionOptions>(
		options: TNewOptions,
	): CollectionBuilder<
		Omit<TState, "options"> & {
			options: TNewOptions;
		}
	> {
		const newState = {
			...this.state,
			options,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Set lifecycle hooks
	 */
	hooks<TNewHooks extends CollectionHooks>(
		hooks: TNewHooks,
	): CollectionBuilder<
		Omit<TState, "hooks"> & {
			hooks: TNewHooks;
		}
	> {
		const newState = {
			...this.state,
			hooks,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Set access control rules
	 */
	access<TNewAccess extends CollectionAccess>(
		access: TNewAccess,
	): CollectionBuilder<
		Omit<TState, "access"> & {
			access: TNewAccess;
		}
	> {
		const newState = {
			...this.state,
			access,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Define RPC functions for this collection
	 */
	functions<TNewFunctions extends CollectionFunctionsMap>(
		functions: TNewFunctions,
	): CollectionBuilder<
		Omit<TState, "functions"> & {
			functions: Omit<TState["functions"], keyof TNewFunctions> & TNewFunctions;
		}
	> {
		const newState = {
			...this.state,
			functions: {
				...this.state.functions,
				...functions,
			},
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Configure search indexing for this collection
	 * Enables full-text search with BM25 ranking, trigrams, and optional embeddings
	 *
	 * @example
	 * .searchable({
	 *   content: (record) => extractTextFromJson(record.content),
	 *   metadata: (record) => ({ status: record.status }),
	 *   embeddings: async (record, ctx) => await ctx.cms.embeddings.generate(text)
	 * })
	 */
	searchable<TNewSearchable extends SearchableConfig>(
		searchable: TNewSearchable,
	): CollectionBuilder<
		Omit<TState, "searchable"> & {
			searchable: TNewSearchable;
		}
	> {
		const newState = {
			...this.state,
			searchable,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Configure runtime validation schemas for create/update operations
	 * Automatically merges main table fields with localized fields
	 * Schemas are generated once and reused for all validations
	 *
	 * @example
	 * .validation({
	 *   exclude: { id: true, createdAt: true, updatedAt: true },
	 *   refine: {
	 *     email: (s) => s.email("Invalid email"),
	 *     age: (s) => s.min(0, "Age must be positive")
	 *   }
	 * })
	 */
	validation(options?: {
		/** Fields to exclude from validation (e.g., id, timestamps) */
		exclude?: Record<string, true>;
		/** Custom refinements per field */
		refine?: Record<string, (schema: z.ZodTypeAny) => z.ZodTypeAny>;
	}): CollectionBuilder<
		Omit<TState, "validation"> & {
			validation: ValidationSchemas;
		}
	> {
		// Extract localized and non-localized fields
		const localizedFieldNames = new Set(this.state.localized);
		const mainFields: Record<string, any> = {};
		const localizedFields: Record<string, any> = {};

		for (const [key, column] of Object.entries(this.state.fields)) {
			if (localizedFieldNames.has(key)) {
				localizedFields[key] = column;
			} else {
				mainFields[key] = column;
			}
		}

		// Generate validation schemas
		const validationSchemas = createCollectionValidationSchemas(
			this.state.name,
			mainFields,
			localizedFields,
			options,
		);

		const newState = {
			...this.state,
			validation: validationSchemas,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;
		newBuilder._titleFn = this._titleFn;

		return newBuilder;
	}

	/**
	 * Build the final collection
	 * Generates Drizzle tables and sets up all type inference
	 * Can be called explicitly or happens lazily on first property access
	 */
	build(): Collection<TState> {
		if (!this._builtCollection) {
			this._builtCollection = new Collection(
				this.state,
				this._virtualsFn,
				this._relationsFn,
				this._indexesFn,
				this._titleFn,
			);
		}
		return this._builtCollection;
	}

	/**
	 * Lazy build getters - automatically build on first access
	 */
	get table() {
		return this.build().table;
	}

	get i18nTable() {
		return this.build().i18nTable;
	}

	get versionsTable() {
		return this.build().versionsTable;
	}

	get i18nVersionsTable() {
		return this.build().i18nVersionsTable;
	}
	get name(): TState["name"] {
		return this.state.name as TState["name"];
	}

	get $infer() {
		return this.build().$infer;
	}

	/**
	 * Proxy methods to built collection
	 */
	generateCRUD(db: any, cms?: any) {
		return this.build().generateCRUD(db, cms);
	}

	getMeta() {
		return this.build().getMeta();
	}

	getVirtuals(context: any) {
		return this.build().getVirtuals(context);
	}

	getTitle(context: any) {
		return this.build().getTitle(context);
	}

	getRawTitle(context: any) {
		return this.build().getRawTitle(context);
	}

	/**
	 * Merge another collection builder into this one
	 * Combines fields, hooks, access control, etc.
	 * Both builders must have the same collection name
	 */
	merge<TOtherState extends CollectionBuilderState & { name: TState["name"] }>(
		other: CollectionBuilder<TOtherState>,
	): CollectionBuilder<
		Omit<
			TState,
			| "fields"
			| "localized"
			| "virtuals"
			| "relations"
			| "indexes"
			| "title"
			| "options"
			| "hooks"
			| "access"
			| "functions"
			| "searchable"
		> & {
			name: TState["name"];
			fields: TState["fields"] & TOtherState["fields"];
			localized: TState["localized"] | TOtherState["localized"];
			virtuals: TState["virtuals"] & TOtherState["virtuals"];
			relations: TState["relations"] & TOtherState["relations"];
			indexes: TState["indexes"] & TOtherState["indexes"];
			title: TOtherState["title"] extends undefined
				? TState["title"]
				: TOtherState["title"];
			options: TState["options"] & TOtherState["options"];
			hooks: CollectionHooks;
			access: CollectionAccess;
			functions: Omit<TState["functions"], keyof TOtherState["functions"]> &
				TOtherState["functions"];
			searchable: TState["searchable"] | TOtherState["searchable"];
		}
	> {
		// Merge hooks - combine arrays
		const mergedHooks = this.mergeHooks(this.state.hooks, other.state.hooks);

		// Merge access control - other's access overrides this
		const mergedAccess = {
			...this.state.access,
			...other.state.access,
			fields: {
				...this.state.access?.fields,
				...other.state.access?.fields,
			},
		};

		const mergedState = {
			name: this.state.name,
			fields: { ...this.state.fields, ...other.state.fields },
			localized: [...this.state.localized, ...other.state.localized] as any,
			virtuals: { ...this.state.virtuals, ...other.state.virtuals },
			relations: { ...this.state.relations, ...other.state.relations },
			indexes: { ...this.state.indexes, ...other.state.indexes },
			title:
				other.state.title !== undefined ? other.state.title : this.state.title,
			options: { ...this.state.options, ...other.state.options },
			hooks: mergedHooks,
			access: mergedAccess,
			functions: {
				...this.state.functions,
				...other.state.functions,
			},
			searchable: other.state.searchable ?? this.state.searchable,
		} as any;

		const newBuilder = new CollectionBuilder(mergedState);

		// Merge callback functions - prefer other's if exists, otherwise use this
		newBuilder._virtualsFn = other._virtualsFn || this._virtualsFn;
		newBuilder._relationsFn = other._relationsFn || this._relationsFn;
		newBuilder._indexesFn = other._indexesFn || this._indexesFn;
		newBuilder._titleFn = other._titleFn || this._titleFn;

		return newBuilder;
	}

	/**
	 * Helper to merge hooks - combines hook arrays
	 */
	private mergeHooks(
		hooks1: CollectionHooks,
		hooks2: CollectionHooks,
	): CollectionHooks {
		const merged: CollectionHooks = {};

		// All possible hook keys
		const hookKeys = new Set([
			...Object.keys(hooks1 || {}),
			...Object.keys(hooks2 || {}),
		]) as Set<keyof CollectionHooks>;

		for (const key of hookKeys) {
			const hook1 = hooks1?.[key];
			const hook2 = hooks2?.[key];

			if (!hook1 && !hook2) continue;
			if (!hook1) {
				merged[key] = hook2 as any;
				continue;
			}
			if (!hook2) {
				merged[key] = hook1 as any;
				continue;
			}

			// Both exist - combine into array
			const arr1 = Array.isArray(hook1) ? hook1 : [hook1];
			const arr2 = Array.isArray(hook2) ? hook2 : [hook2];
			merged[key] = [...arr1, ...arr2] as any;
		}

		return merged;
	}
}

/**
 * Factory function to create a new collection builder
 */
export function defineCollection<TName extends string>(
	name: TName,
): CollectionBuilder<EmptyCollectionState<TName>> {
	return new CollectionBuilder({
		name,
		fields: {},
		localized: [],
		virtuals: {},
		relations: {},
		indexes: {},
		title: undefined,
		options: {},
		hooks: {},
		access: {},
		functions: {},
		searchable: undefined,
		validation: undefined,
	});
}
