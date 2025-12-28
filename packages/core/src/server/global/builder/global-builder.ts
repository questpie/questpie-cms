import { Global } from "#questpie/core/server/global/builder/global";
import type {
	GlobalAccess,
	GlobalBuilderState,
	GlobalHooks,
	GlobalOptions,
	EmptyGlobalState,
	GlobalBuilderRelationFn,
} from "#questpie/core/server/global/builder/types";
import type {
	I18nFieldAccessor,
	InferTableWithColumns,
	NonLocalizedFields,
	RelationConfig,
} from "#questpie/core/server/collection/builder/types";
import type { SQL } from "drizzle-orm";

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
		GlobalBuilderState<
			TState["name"],
			TNewFields,
			[], // Reset localized when fields change
			TState["virtuals"],
			TState["relations"],
			TState["options"],
			TState["hooks"],
			TState["access"]
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
	): GlobalBuilder<
		GlobalBuilderState<
			TState["name"],
			TState["fields"],
			TKeys,
			TState["virtuals"],
			TState["relations"],
			TState["options"],
			TState["hooks"],
			TState["access"]
		>
	> {
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
	): GlobalBuilder<
		GlobalBuilderState<
			TState["name"],
			TState["fields"],
			TState["localized"],
			TNewVirtuals,
			TState["relations"],
			TState["options"],
			TState["hooks"],
			TState["access"]
		>
	> {
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
	): GlobalBuilder<
		GlobalBuilderState<
			TState["name"],
			TState["fields"],
			TState["localized"],
			TState["virtuals"],
			TNewRelations,
			TState["options"],
			TState["hooks"],
			TState["access"]
		>
	> {
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
	): GlobalBuilder<
		GlobalBuilderState<
			TState["name"],
			TState["fields"],
			TState["localized"],
			TState["virtuals"],
			TState["relations"],
			TNewOptions,
			TState["hooks"],
			TState["access"]
		>
	> {
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
	): GlobalBuilder<
		GlobalBuilderState<
			TState["name"],
			TState["fields"],
			TState["localized"],
			TState["virtuals"],
			TState["relations"],
			TState["options"],
			TNewHooks,
			TState["access"]
		>
	> {
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
	): GlobalBuilder<
		GlobalBuilderState<
			TState["name"],
			TState["fields"],
			TState["localized"],
			TState["virtuals"],
			TState["relations"],
			TState["options"],
			TState["hooks"],
			TNewAccess
		>
	> {
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
	 * Build the final global
	 */
	build(): Global<TState> {
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

	get name() {
		return this.state.name;
	}

	get $infer() {
		return this.build().$infer;
	}
}

/**
 * Factory function to create a new global builder
 */
export function defineGlobal<TName extends string>(
	name: TName,
): GlobalBuilder<EmptyGlobalState<TName>> {
	return new GlobalBuilder({
		name,
		fields: {},
		localized: [],
		virtuals: {},
		relations: {},
		options: {},
		hooks: {},
		access: {},
	});
}
