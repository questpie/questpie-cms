import type { SQL } from "drizzle-orm";
import type {
	I18nFieldAccessor,
	InferTableWithColumns,
	NonLocalizedFields,
	RelationConfig,
} from "#questpie/server/collection/builder/types.js";
import type { FunctionDefinition } from "#questpie/server/functions/types.js";
import { Global } from "#questpie/server/global/builder/global.js";
import type {
	Prettify,
	SetProperty,
	TypeMerge,
	UnsetProperty,
} from "#questpie/shared/type-utils.js";
import type {
	EmptyGlobalState,
	GlobalAccess,
	GlobalBuilderRelationFn,
	GlobalBuilderState,
	GlobalHooks,
	GlobalOptions,
} from "#questpie/server/global/builder/types.js";

/**
 * Main global builder class
 */
export class GlobalBuilder<TState extends GlobalBuilderState> {
	private state: TState;
	private _builtGlobal?: Global<TState>;

	// Store callback functions for lazy evaluation
	private _virtualsFn?: (
		table: any,
		i18n: any,
		context: any,
	) => TState["virtuals"];
	private _relationsFn?: GlobalBuilderRelationFn<TState, any>;
	constructor(state: TState) {
		this.state = state;
	}

	/**
	 * Define fields using Drizzle column definitions
	 */
	fields<TNewFields extends Record<string, any>>(
		fields: TNewFields,
	): GlobalBuilder<
		TypeMerge<
			UnsetProperty<TState, "fields" | "localized">,
			{
				fields: TNewFields;
				localized: [];
			}
		>
	> {
		const newState = {
			...this.state,
			fields,
			localized: [] as any,
		} as any;

		const newBuilder = new GlobalBuilder(newState);
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		return newBuilder;
	}

	/**
	 * Mark fields as localized
	 */
	localized<TKeys extends ReadonlyArray<keyof TState["fields"]>>(
		keys: TKeys,
	): GlobalBuilder<SetProperty<TState, "localized", TKeys>> {
		const newState = {
			...this.state,
			localized: keys,
		} as any;

		const newBuilder = new GlobalBuilder(newState);
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		return newBuilder;
	}

	/**
	 * Define virtual (computed) fields
	 */
	virtuals<TNewVirtuals extends Record<string, SQL>>(
		fn: (
			table: InferTableWithColumns<
				TState["name"],
				NonLocalizedFields<TState["fields"], TState["localized"]>,
				undefined,
				any // Options type mismatch hack, but works for inference
			>,
			i18n: I18nFieldAccessor<TState["fields"], TState["localized"]>,
			context: any,
		) => TNewVirtuals,
	): GlobalBuilder<SetProperty<TState, "virtuals", TNewVirtuals>> {
		const newState = {
			...this.state,
			virtuals: {} as TNewVirtuals,
		} as any;

		const newBuilder = new GlobalBuilder(newState);
		newBuilder._virtualsFn = fn;
		newBuilder._relationsFn = this._relationsFn;
		return newBuilder;
	}

	/**
	 * Define relations to other collections
	 */
	relations<TNewRelations extends Record<string, RelationConfig>>(
		fn: GlobalBuilderRelationFn<TState, TNewRelations>,
	): GlobalBuilder<SetProperty<TState, "relations", TNewRelations>> {
		const newState = {
			...this.state,
			relations: {} as TNewRelations,
		} as any;

		const newBuilder = new GlobalBuilder(newState);
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = fn;
		return newBuilder;
	}

	/**
	 * Set global options
	 */
	options<TNewOptions extends GlobalOptions>(
		options: TNewOptions,
	): GlobalBuilder<SetProperty<TState, "options", TNewOptions>> {
		const newState = {
			...this.state,
			options,
		} as any;

		const newBuilder = new GlobalBuilder(newState);
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		return newBuilder;
	}

	/**
	 * Set lifecycle hooks
	 */
	hooks<TNewHooks extends GlobalHooks>(
		hooks: TNewHooks,
	): GlobalBuilder<SetProperty<TState, "hooks", TNewHooks>> {
		const newState = {
			...this.state,
			hooks,
		} as any;

		const newBuilder = new GlobalBuilder(newState);
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		return newBuilder;
	}

	/**
	 * Set access control rules
	 */
	access<TNewAccess extends GlobalAccess>(
		access: TNewAccess,
	): GlobalBuilder<SetProperty<TState, "access", TNewAccess>> {
		const newState = {
			...this.state,
			access,
		} as any;

		const newBuilder = new GlobalBuilder(newState);
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		return newBuilder;
	}

	/**
	 * Define RPC functions for this global
	 */
	functions<TNewFunctions extends Record<string, FunctionDefinition>>(
		functions: TNewFunctions,
	): GlobalBuilder<
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

		const newBuilder = new GlobalBuilder(newState);
		newBuilder._virtualsFn = this._virtualsFn;
		newBuilder._relationsFn = this._relationsFn;
		return newBuilder;
	}

	/**
	 * Build the final global
	 */
	build(): Global<Prettify<TState>> {
		if (!this._builtGlobal) {
			this._builtGlobal = new Global(
				this.state,
				this._virtualsFn,
				this._relationsFn,
			);
		}
		return this._builtGlobal;
	}

	/**
	 * Lazy build getters
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

	get name() {
		return this.state.name;
	}

	get $infer() {
		return this.build().$infer;
	}
}

/**
 * Factory function to create a new global builder.
 *
 * @example Basic usage (uses QuestpieApp from module augmentation)
 * ```ts
 * const settings = global("settings").fields({ ... });
 * ```
 *
 * @example With typed app (recommended for full type safety)
 * ```ts
 * import type { AppCMS } from './cms';
 *
 * const settings = global<AppCMS>()("settings")
 *   .fields({ ... })
 *   .hooks({
 *     afterUpdate: ({ app }) => {
 *       app.kv.set('cache', ...); // fully typed!
 *     }
 *   });
 * ```
 */
export function global<TName extends string>(
	name?: TName,
): GlobalBuilder<EmptyGlobalState<TName>> {
	// Overload 1: global("settings") - simple name
	return new GlobalBuilder({
		name: name as string,
		fields: {},
		localized: [],
		virtuals: {},
		relations: {},
		options: {},
		hooks: {},
		access: {},
		functions: {},
	}) as any;
}
