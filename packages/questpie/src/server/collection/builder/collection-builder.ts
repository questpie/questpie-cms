import type { SQL } from "drizzle-orm";
import type { PgTableExtraConfigValue } from "drizzle-orm/pg-core";
import type { z } from "zod";
import type {
	CollectionInsert,
	CollectionSelect,
	CollectionUpdate,
} from "#questpie/server/collection/builder/collection.js";
import { Collection } from "#questpie/server/collection/builder/collection.js";
import type {
	CollectionAccess,
	CollectionBuilderIndexesFn,
	CollectionBuilderRelationFn,
	CollectionBuilderState,
	CollectionBuilderTitleFn,
	CollectionBuilderVirtualsFn,
	CollectionFunctionsMap,
	CollectionHooks,
	CollectionOptions,
	EmptyCollectionState,
	RelationConfig,
	TitleExpression,
	UploadOptions,
} from "#questpie/server/collection/builder/types.js";
import {
	createCollectionValidationSchemas,
	type ValidationSchemas,
} from "#questpie/server/collection/builder/validation-helpers.js";
import type { StorageVisibility } from "#questpie/server/config/types.js";
import type { SearchableConfig } from "#questpie/server/integrated/search/index.js";
import type {
	TypeMerge,
	SetProperty,
	UnsetProperty,
} from "#questpie/shared/type-utils.js";
import type { Prettify } from "better-auth";

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
		TypeMerge<
			UnsetProperty<TState, "fields" | "localized">,
			{
				fields: TNewFields;
				localized: []; // Reset localized when fields change
			}
		>
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

		return newBuilder;
	}

	/**
	 * Mark fields as localized (moved to i18n table)
	 * Type safety: only allows keys that exist in fields
	 *
	 * For JSONB fields, you can specify localization mode:
	 * - "fieldName" - whole replacement (entire JSONB per locale) - DEFAULT
	 * - "fieldName:nested" - nested mode (JSONB with { $i18n: value } wrappers)
	 *
	 * @example
	 * .localized(["title", "bio"]) // title and bio use whole replacement
	 * .localized(["title", "content:nested"]) // content uses nested $i18n wrappers
	 */
	localized<
		TKeys extends ReadonlyArray<
			keyof TState["fields"] | `${keyof TState["fields"] & string}:nested`
		>,
	>(keys: TKeys): CollectionBuilder<SetProperty<TState, "localized", TKeys>> {
		const newState = {
			...this.state,
			localized: keys,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Define virtual (computed) fields
	 * Callback receives context object with table, i18n accessor, and context
	 */
	virtuals<TNewVirtuals extends Record<string, SQL>>(
		fn: CollectionBuilderVirtualsFn<TState, TNewVirtuals>,
	): CollectionBuilder<SetProperty<TState, "virtuals", TNewVirtuals>> {
		const newState = {
			...this.state,
			virtuals: {} as TNewVirtuals, // Populated during build()
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy existing callback functions and set new virtualsFn
		newBuilder._virtualsFn = fn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Define relations to other collections
	 */
	relations<TNewRelations extends Record<string, RelationConfig>>(
		fn: CollectionBuilderRelationFn<TState, TNewRelations>,
	): CollectionBuilder<SetProperty<TState, "relations", TNewRelations>> {
		const newState = {
			...this.state,
			relations: {} as TNewRelations,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy existing callback functions and set new relationsFn
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = fn;
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Define indexes and constraints
	 * Callback receives context object with table
	 */
	indexes<TNewIndexes extends PgTableExtraConfigValue[]>(
		fn: CollectionBuilderIndexesFn<TState, TNewIndexes>,
	): CollectionBuilder<SetProperty<TState, "indexes", TNewIndexes>> {
		const newState = {
			...this.state,
			indexes: {} as TNewIndexes,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy existing callback functions and set new indexesFn
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = fn;

		return newBuilder;
	}

	/**
	 * Define title field (used for _title computed column and display)
	 * Callback receives a field proxy where accessing any field returns its name
	 *
	 * @example
	 * // Use a field as title
	 * .title(({ f }) => f.name)
	 *
	 * // Use a virtual as title
	 * .title(({ f }) => f.fullName)
	 */
	title<TNewTitle extends TitleExpression>(
		fn: CollectionBuilderTitleFn<TState, TNewTitle>,
	): CollectionBuilder<SetProperty<TState, "title", TNewTitle>> {
		// Create field proxy that returns key name as string
		const fieldProxy = new Proxy({} as any, {
			get: (_target, prop) => prop as string,
		});

		// Execute fn immediately to get the field name
		const titleFieldName = fn({ f: fieldProxy });

		const newState = {
			...this.state,
			title: titleFieldName,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy existing callback functions (no need to store titleFn anymore)
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Set collection options (timestamps, softDelete, versioning)
	 */
	options<TNewOptions extends CollectionOptions>(
		options: TNewOptions,
	): CollectionBuilder<SetProperty<TState, "options", TNewOptions>> {
		const newState = {
			...this.state,
			options,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Set lifecycle hooks
	 */
	hooks<
		TNewHooks extends CollectionHooks<
			CollectionSelect<TState>,
			CollectionInsert<TState>,
			CollectionUpdate<TState>
		>,
	>(
		hooks: TNewHooks,
	): CollectionBuilder<SetProperty<TState, "hooks", TNewHooks>> {
		const existingHooks = this.state.hooks;
		const mergedHooks: Record<string, any> = { ...(existingHooks || {}) };

		for (const [hookName, hookValue] of Object.entries(hooks)) {
			const current = mergedHooks[hookName];
			if (!current) {
				mergedHooks[hookName] = hookValue;
				continue;
			}

			const currentArray = Array.isArray(current) ? current : [current];
			const nextArray = Array.isArray(hookValue) ? hookValue : [hookValue];
			mergedHooks[hookName] = [...currentArray, ...nextArray];
		}

		const newState = {
			...this.state,
			hooks: mergedHooks,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Set access control rules
	 */
	access<TNewAccess extends CollectionAccess>(
		access: TNewAccess,
	): CollectionBuilder<SetProperty<TState, "access", TNewAccess>> {
		const newState = {
			...this.state,
			access,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Define RPC functions for this collection
	 */
	functions<TNewFunctions extends CollectionFunctionsMap>(
		functions: TNewFunctions,
	): CollectionBuilder<
		SetProperty<
			TState,
			"functions",
			TypeMerge<
				UnsetProperty<TState["functions"], keyof TNewFunctions>,
				TNewFunctions
			>
		>
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
	): CollectionBuilder<SetProperty<TState, "searchable", TNewSearchable>> {
		const newState = {
			...this.state,
			searchable,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;

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
	}): CollectionBuilder<SetProperty<TState, "validation", ValidationSchemas>> {
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

		return newBuilder;
	}

	/**
	 * Define output type extensions - fields that are computed/populated in hooks
	 * but should appear in the select type.
	 *
	 * These are TYPE-ONLY and don't create database columns. Use this when you
	 * populate fields in afterRead hooks that should be typed in the output.
	 *
	 * @example
	 * ```ts
	 * collection("assets")
	 *   .fields({
	 *     key: varchar("key", { length: 255 }).notNull(),
	 *     filename: varchar("filename", { length: 255 }).notNull(),
	 *   })
	 *   .$outputType<{ url: string }>() // url is computed in afterRead hook
	 *   .hooks({
	 *     afterRead: ({ data }) => {
	 *       data.url = `https://cdn.example.com/${data.key}`;
	 *     }
	 *   })
	 * ```
	 */
	$outputType<TOutput extends Record<string, any>>(): CollectionBuilder<
		SetProperty<TState, "output", TOutput>
	> {
		const newState = {
			...this.state,
			output: {} as TOutput,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Configure this collection for file uploads.
	 * Automatically:
	 * - Adds upload fields (key, filename, mimeType, size, visibility)
	 * - Adds $outputType<{ url: string }>() for typed URL access
	 * - Adds afterRead hook for URL generation based on visibility
	 * - Enables upload() and uploadMany() CRUD methods
	 * - Registers HTTP routes: POST /:collection/upload, GET /:collection/files/:key
	 *
	 * @example
	 * ```ts
	 * collection("media")
	 *   .fields({
	 *     alt: varchar("alt", { length: 500 }),
	 *     folder: varchar("folder", { length: 255 }),
	 *   })
	 *   .upload({
	 *     visibility: "public",
	 *     maxSize: 10_000_000,        // 10MB
	 *     allowedTypes: ["image/*"],
	 *   })
	 * ```
	 */
	upload(options: UploadOptions = {}): CollectionBuilder<
		TypeMerge<
			UnsetProperty<TState, "fields" | "output" | "hooks" | "upload">,
			{
				fields: TState["fields"] & ReturnType<typeof Collection.uploadCols>;
				output: TypeMerge<
					TState["output"] extends Record<string, any> ? TState["output"] : {},
					{ url: string }
				>;
				hooks: TState["hooks"];
				upload: UploadOptions;
			}
		>
	> {
		// Create upload fields using Collection static method
		const uploadFields = Collection.uploadCols();

		// Create afterRead hook for URL generation
		const uploadAfterReadHook = async ({ data, app }: any) => {
			if (!app?.storage || !data?.key) return;

			const fileVisibility: StorageVisibility = data.visibility || "public";

			if (fileVisibility === "private") {
				data.url = await app.storage.use().getSignedUrl(data.key);
			} else {
				data.url = await app.storage.use().getUrl(data.key);
			}
		};

		// Create afterChange hook to sync visibility with storage
		const uploadAfterChangeHook = async ({
			data,
			original,
			app,
			operation,
		}: any) => {
			if (operation !== "update") return;
			if (!app?.storage || !data?.key) return;
			if (!original || original.visibility === data.visibility) return;

			await app.storage.use().setVisibility(data.key, data.visibility);
		};

		// Merge existing afterRead hooks with upload hook
		const existingAfterRead = this.state.hooks?.afterRead;
		const mergedAfterRead = existingAfterRead
			? Array.isArray(existingAfterRead)
				? [...existingAfterRead, uploadAfterReadHook]
				: [existingAfterRead, uploadAfterReadHook]
			: uploadAfterReadHook;

		// Merge existing afterChange hooks with upload hook
		const existingAfterChange = this.state.hooks?.afterChange;
		const mergedAfterChange = existingAfterChange
			? Array.isArray(existingAfterChange)
				? [...existingAfterChange, uploadAfterChangeHook]
				: [existingAfterChange, uploadAfterChangeHook]
			: uploadAfterChangeHook;

		const newState = {
			...this.state,
			fields: {
				...this.state.fields,
				...uploadFields,
			},
			output: {
				...(this.state.output || {}),
				url: "" as string,
			},
			hooks: {
				...this.state.hooks,
				afterRead: mergedAfterRead,
				afterChange: mergedAfterChange,
			},
			upload: options,
		} as any;

		const newBuilder = new CollectionBuilder(newState);

		// Copy callback functions
		newBuilder._indexesFn = this._indexesFn;

		return newBuilder;
	}

	/**
	 * Build the final collection
	 * Generates Drizzle tables and sets up all type inference
	 * Can be called explicitly or happens lazily on first property access
	 */
	build(): Collection<Prettify<TState>> {
		if (!this._builtCollection) {
			this._builtCollection = new Collection(
				this.state,
				this._virtualsFn,
				this._relationsFn,
				this._indexesFn,
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
	 * Merge another collection builder into this one
	 * Combines fields, hooks, access control, etc.
	 * Both builders must have the same collection name
	 */
	merge<TOtherState extends CollectionBuilderState & { name: TState["name"] }>(
		other: CollectionBuilder<TOtherState>,
	): CollectionBuilder<
		TypeMerge<
			UnsetProperty<
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
			>,
			{
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
				functions: TypeMerge<
					UnsetProperty<TState["functions"], keyof TOtherState["functions"]>,
					TOtherState["functions"]
				>;
				searchable: TState["searchable"] | TOtherState["searchable"];
			}
		>
	> {
		// Merge hooks - combine arrays
		const mergedHooks = this.mergeHooks<
			CollectionSelect<TState> | CollectionSelect<TOtherState>,
			CollectionInsert<TState> | CollectionInsert<TOtherState>,
			CollectionUpdate<TState> | CollectionUpdate<TOtherState>
		>(this.state.hooks as any, other.state.hooks as any);

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

		return newBuilder;
	}

	/**
	 * Helper to merge hooks - combines hook arrays
	 */
	private mergeHooks<TSelect = any, TInsert = any, TUpdate = any>(
		hooks1: CollectionHooks<TSelect, TInsert, TUpdate>,
		hooks2: CollectionHooks<TSelect, TInsert, TUpdate>,
	): CollectionHooks<TSelect, TInsert, TUpdate> {
		const merged: CollectionHooks<TSelect, TInsert, TUpdate> = {};

		// All possible hook keys
		const hookKeys = Array.from(
			new Set([...Object.keys(hooks1 || {}), ...Object.keys(hooks2 || {})]),
		) as (keyof CollectionHooks)[];

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
 * Factory function to create a new collection builder.
 *
 * @example Basic usage (uses QuestpieApp from module augmentation)
 * ```ts
 * const posts = collection("posts").fields({ ... });
 * ```
 *
 * @example With typed app (recommended for full type safety)
 * ```ts
 * import type { AppCMS } from './cms';
 *
 * const posts = collection<AppCMS>()("posts")
 *   .fields({ ... })
 *   .hooks({
 *     afterChange: ({ app }) => {
 *       app.queue.notify.publish(...); // fully typed!
 *     }
 *   });
 * ```
 */
export function collection<TName extends string>(
	name: TName,
): CollectionBuilder<EmptyCollectionState<TName>>;

/**
 * Factory function with app type parameter for full type safety.
 * Call with no arguments to get a curried function that accepts the name.
 *
 * @example
 * ```ts
 * const posts = collection<AppCMS>()("posts");
 * ```
 */
export function collection<TName extends string>(
	name?: TName,
): CollectionBuilder<EmptyCollectionState<TName>> {
	// Overload 1: collection("posts") - simple name
	return new CollectionBuilder({
		name: name as string,
		fields: {},
		localized: [],
		virtuals: undefined,
		relations: {},
		indexes: {},
		title: undefined,
		options: {},
		hooks: {},
		access: {},
		functions: {},
		searchable: undefined,
		validation: undefined,
		output: undefined,
		upload: undefined,
	}) as any;
}
