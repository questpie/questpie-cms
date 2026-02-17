/**
 * Reactive Field System Types
 *
 * This module defines types for reactive field behaviors including:
 * - Reactive field states (hidden, readOnly, disabled)
 * - Computed values
 * - Dynamic options
 * - Proxy-based dependency tracking
 *
 * All reactive handlers run on the server with access to DB and user context.
 */

import type { I18nText } from "#questpie/shared/i18n/types.js";

// ============================================================================
// Reactive Context
// ============================================================================

/**
 * Server context available to reactive handlers.
 * Provides access to database, user, request, and locale.
 */
export interface ReactiveServerContext {
	/** Database client (Drizzle) */
	db: unknown;

	/** Authenticated user (if any) */
	user: unknown | null;

	/** Current request */
	req: Request;

	/** Current locale */
	locale: string;
}

/**
 * Context provided to reactive handlers (hidden, readOnly, disabled, compute).
 * Includes form data with proxy for automatic dependency tracking.
 *
 * @template T - Form data type (default: Record<string, any>)
 */
export interface ReactiveContext<T = Record<string, any>> {
	/**
	 * Current form values - proxy for dependency tracking.
	 * Accessing properties automatically registers them as dependencies.
	 */
	data: T;

	/**
	 * Sibling values in array/object context - proxy for dependency tracking.
	 * Used when field is inside an array item to access other fields in the same item.
	 */
	sibling: Record<string, any>;

	/**
	 * Previous values for change detection.
	 * Useful for conditional logic based on what changed.
	 */
	prev: {
		data: T;
		sibling: Record<string, any>;
	};

	/** Server context (db, user, req, locale) */
	ctx: ReactiveServerContext;
}

// ============================================================================
// Reactive Config Types
// ============================================================================

/**
 * Reactive handler function type.
 *
 * @template TReturn - Return type of the handler
 */
export type ReactiveHandler<TReturn> = (
	ctx: ReactiveContext,
) => TReturn | Promise<TReturn>;

/**
 * Reactive configuration - can be short or full syntax.
 *
 * Short syntax: just the handler function
 * Full syntax: object with handler, optional deps, optional debounce
 *
 * @template TReturn - Return type of the handler
 *
 * @example Short syntax
 * ```ts
 * hidden: ({ data }) => !data.showAdvanced
 * ```
 *
 * @example Full syntax
 * ```ts
 * compute: {
 *   handler: ({ data }) => slugify(data.title),
 *   deps: ({ data }) => [data.title, data.category],
 *   debounce: 300,
 * }
 * ```
 */
export type ReactiveConfig<TReturn> =
	| ReactiveHandler<TReturn>
	| {
			/** Handler function that computes the value */
			handler: ReactiveHandler<TReturn>;
			/**
			 * Dependencies - optional, auto-detected via proxy.
			 * Can be array of field paths or a function with proxy tracking.
			 */
			deps?: string[] | ((ctx: ReactiveContext) => any[]);
			/** Debounce in ms (only for compute) */
			debounce?: number;
	  };

// ============================================================================
// Options Context (for dynamic options)
// ============================================================================

/**
 * Context provided to dynamic options handlers.
 * Extends reactive context with search and pagination.
 *
 * @template T - Form data type
 */
export interface OptionsContext<T = Record<string, any>> {
	/** Current form values - proxy for dependency tracking */
	data: T;

	/** Sibling values (for array/object context) */
	sibling: Record<string, any>;

	/** Search query (user typing) */
	search: string;

	/** Page number (0-based) */
	page: number;

	/** Items per page */
	limit: number;

	/** Server context */
	ctx: ReactiveServerContext;
}

/**
 * Options handler function type.
 */
export type OptionsHandler<T = Record<string, any>> = (
	ctx: OptionsContext<T>,
) => OptionsResult | Promise<OptionsResult>;

/**
 * Result from options handler.
 */
export interface OptionsResult {
	/** List of options */
	options: Array<{ value: string | number; label: I18nText }>;

	/** Whether there are more items (for infinite scroll) */
	hasMore?: boolean;

	/** Total count (optional) */
	total?: number;
}

/**
 * Dynamic options configuration.
 *
 * @example
 * ```ts
 * options: {
 *   handler: async ({ data, search, page, limit, ctx }) => {
 *     const cities = await ctx.db.query.cities.findMany({
 *       where: { countryId: data.country },
 *       limit,
 *       offset: page * limit,
 *     });
 *     return {
 *       options: cities.map(c => ({ value: c.id, label: c.name })),
 *       hasMore: cities.length === limit,
 *     };
 *   },
 *   deps: ({ data }) => [data.country],
 * }
 * ```
 */
export interface OptionsConfig<T = Record<string, any>> {
	/** Handler that fetches options */
	handler: OptionsHandler<T>;

	/**
	 * Dependencies - when these change, options are refetched.
	 * Auto-detected via proxy if not provided.
	 */
	deps?: string[] | ((ctx: OptionsContext<T>) => any[]);
}

// ============================================================================
// Reactive Admin Meta Extensions
// ============================================================================

/**
 * Reactive extensions for BaseAdminMeta.
 * These properties can be static (boolean) or reactive (function/config).
 */
export interface ReactiveAdminMeta {
	/**
	 * Hide the field conditionally.
	 * - `true`: Always hidden
	 * - Function: Evaluated on server based on form data
	 */
	hidden?: boolean | ReactiveConfig<boolean>;

	/**
	 * Make field read-only conditionally.
	 * - `true`: Always read-only
	 * - Function: Evaluated on server based on form data
	 */
	readOnly?: boolean | ReactiveConfig<boolean>;

	/**
	 * Disable the field conditionally.
	 * - `true`: Always disabled
	 * - Function: Evaluated on server based on form data
	 */
	disabled?: boolean | ReactiveConfig<boolean>;

	/**
	 * Compute field value automatically.
	 * Handler should return the computed value or undefined to keep current value.
	 * Return null to reset field to null/default.
	 */
	compute?: ReactiveConfig<any>;
}

// ============================================================================
// Dependency Tracking
// ============================================================================

/**
 * Result of dependency tracking.
 */
export interface TrackingResult<T> {
	/** Result of executing the function */
	result: T;

	/** Dependencies detected (field paths) */
	deps: string[];
}

/**
 * Track dependencies accessed by a handler function using Proxy.
 * Runs the function with proxy objects that record property access.
 *
 * @param fn - Handler function to track
 * @returns Object with result and detected dependencies
 *
 * @example
 * ```ts
 * const { result, deps } = trackDependencies(
 *   (ctx) => ctx.data.status === 'draft' && ctx.data.type === 'post'
 * );
 * // deps = ['status', 'type']
 * ```
 */
export function trackDependencies<T>(
	fn: (ctx: ReactiveContext) => T,
): TrackingResult<T | undefined> {
	const deps = new Set<string>();

	const createProxy = (prefix: string): any =>
		new Proxy({} as any, {
			get(_, prop: string | symbol) {
				// Skip internal properties and symbols
				if (typeof prop === "symbol" || prop === "then" || prop === "toJSON") {
					return undefined;
				}

				const path = prefix ? `${prefix}.${prop}` : prop;
				deps.add(path);

				// Return nested proxy for chained access (e.g., data.nested.field)
				return createProxy(path);
			},
		});

	const ctx: ReactiveContext = {
		data: createProxy(""),
		sibling: createProxy("$sibling"),
		prev: {
			data: createProxy("$prev"),
			sibling: createProxy("$prev.$sibling"),
		},
		ctx: {} as any, // Dummy, won't be used during tracking
	};

	let result: T | undefined;
	try {
		result = fn(ctx);
	} catch {
		// Ignore runtime errors during tracking
		// We only want to capture property access
	}

	return { result, deps: [...deps] };
}

/**
 * Track dependencies from a deps function.
 * The deps function can access ctx.data, ctx.sibling, etc.
 *
 * @param depsFn - Deps function that returns array of values
 * @returns Array of dependency paths
 */
export function trackDepsFunction(
	depsFn: (ctx: ReactiveContext) => any[],
): string[] {
	const { deps } = trackDependencies((ctx) => {
		depsFn(ctx);
		return undefined;
	});
	return deps;
}

/**
 * Extract dependencies from a ReactiveConfig.
 * Handles both short syntax (function) and full syntax (object with handler/deps).
 *
 * @param config - Reactive configuration
 * @returns Array of dependency paths
 */
export function extractDependencies(config: ReactiveConfig<any>): string[] {
	if (typeof config === "function") {
		// Short syntax - track from handler
		return trackDependencies(config).deps;
	}

	// Full syntax
	const { handler, deps } = config;

	if (Array.isArray(deps)) {
		// Explicit string array
		return deps;
	}

	if (typeof deps === "function") {
		// Deps function - track from it
		return trackDepsFunction(deps);
	}

	// No deps specified - track from handler
	return trackDependencies(handler).deps;
}

/**
 * Get handler function from ReactiveConfig.
 */
export function getHandler<T>(config: ReactiveConfig<T>): ReactiveHandler<T> {
	return typeof config === "function" ? config : config.handler;
}

/**
 * Get debounce value from ReactiveConfig.
 */
export function getDebounce(config: ReactiveConfig<any>): number | undefined {
	return typeof config === "function" ? undefined : config.debounce;
}

/**
 * Check if a value is a ReactiveConfig (function or config object).
 */
export function isReactiveConfig(value: unknown): value is ReactiveConfig<any> {
	if (typeof value === "function") {
		return true;
	}
	if (typeof value === "object" && value !== null && "handler" in value) {
		return typeof (value as any).handler === "function";
	}
	return false;
}

// ============================================================================
// Introspection Types (for client)
// ============================================================================

/**
 * Serialized reactive config for introspection response.
 * Sent to client so it knows which fields to watch.
 */
export interface SerializedReactiveConfig {
	/** Fields to watch for changes */
	watch: string[];

	/** Debounce in ms (for compute) */
	debounce?: number;
}

/**
 * Serialized options config for introspection response.
 */
export interface SerializedOptionsConfig {
	/** Fields to watch for changes */
	watch: string[];

	/** Options support search */
	searchable: boolean;

	/** Options support pagination */
	paginated: boolean;
}

/**
 * Serialize a ReactiveConfig for introspection response.
 */
export function serializeReactiveConfig(
	config: ReactiveConfig<any>,
): SerializedReactiveConfig {
	return {
		watch: extractDependencies(config),
		debounce: getDebounce(config),
	};
}

/**
 * Serialize an OptionsConfig for introspection response.
 */
export function serializeOptionsConfig(
	config: OptionsConfig<any>,
): SerializedOptionsConfig {
	let watch: string[];

	if (Array.isArray(config.deps)) {
		watch = config.deps;
	} else if (typeof config.deps === "function") {
		watch = trackDepsFunction(config.deps as any);
	} else {
		// Track from handler (create dummy OptionsContext)
		const deps = new Set<string>();

		const createProxy = (prefix: string): any =>
			new Proxy({} as any, {
				get(_, prop: string | symbol) {
					if (typeof prop === "symbol" || prop === "then") {
						return undefined;
					}
					const path = prefix ? `${prefix}.${prop}` : prop;
					deps.add(path);
					return createProxy(path);
				},
			});

		const ctx: OptionsContext = {
			data: createProxy(""),
			sibling: createProxy("$sibling"),
			search: "",
			page: 0,
			limit: 20,
			ctx: {} as any,
		};

		try {
			config.handler(ctx);
		} catch {
			// Ignore
		}

		watch = [...deps];
	}

	return {
		watch,
		searchable: true, // Options handlers always support search
		paginated: true, // Options handlers always support pagination
	};
}
