/**
 * Reactive Field RPC Endpoints
 *
 * Provides server-side execution of reactive field handlers:
 * - /reactive: Batch endpoint for compute, hidden, readOnly, disabled
 * - /options: Dynamic options for select/relation fields
 */

import type {
	OptionsContext,
	ReactiveContext,
	ReactiveServerContext,
} from "questpie";
import { fn, type Questpie } from "questpie";
import { z } from "zod";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get typed CMS app from context.
 */
function getApp(ctx: { app: unknown }): Questpie<any> {
	return ctx.app as Questpie<any>;
}

/**
 * Build ReactiveContext from request data.
 */
function buildReactiveContext(
	formData: Record<string, any>,
	siblingData: Record<string, any> | null,
	prevData: Record<string, any> | null,
	prevSiblingData: Record<string, any> | null,
	serverCtx: ReactiveServerContext,
): ReactiveContext {
	return {
		data: formData,
		sibling: siblingData || {},
		prev: {
			data: prevData || formData,
			sibling: prevSiblingData || siblingData || {},
		},
		ctx: serverCtx,
	};
}

/**
 * Build OptionsContext from request data.
 */
function buildOptionsContext(
	formData: Record<string, any>,
	siblingData: Record<string, any> | null,
	search: string,
	page: number,
	limit: number,
	serverCtx: ReactiveServerContext,
): OptionsContext {
	return {
		data: formData,
		sibling: siblingData || {},
		search,
		page,
		limit,
		ctx: serverCtx,
	};
}

/**
 * Get field definition from collection.
 */
function getFieldDefinition(
	cms: Questpie<any>,
	collectionName: string,
	fieldPath: string,
) {
	const collections = cms.getCollections();
	const collection = collections[collectionName];
	if (!collection) {
		throw new Error(`Collection '${collectionName}' not found`);
	}

	const fieldDefinitions = collection.state.fieldDefinitions || {};

	// Handle nested field paths (e.g., "items.0.variant" -> "items.variant")
	const parts = fieldPath.split(".");
	let currentDefs: Record<string, any> = fieldDefinitions;
	let fieldDef: any = null;

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];

		// Skip numeric indices (array positions)
		if (/^\d+$/.test(part)) {
			continue;
		}

		if (currentDefs[part]) {
			fieldDef = currentDefs[part];

			// Check for nested fields (object/array)
			if (fieldDef.getNestedFields) {
				currentDefs = fieldDef.getNestedFields();
			} else if (fieldDef.state?.config?.of) {
				// Array field - get the "of" field's nested fields
				const ofField = fieldDef.state.config.of;
				if (ofField?.getNestedFields) {
					currentDefs = ofField.getNestedFields();
				}
			}
		} else {
			throw new Error(`Field '${part}' not found in path '${fieldPath}'`);
		}
	}

	if (!fieldDef) {
		throw new Error(
			`Field '${fieldPath}' not found in collection '${collectionName}'`,
		);
	}

	return fieldDef;
}

/**
 * Get reactive handler from field config.
 */
function getReactiveHandler(
	fieldDef: any,
	handlerType: "hidden" | "readOnly" | "disabled" | "compute",
): ((ctx: ReactiveContext) => any) | null {
	const config = fieldDef.state?.config;
	const admin = config?.meta?.admin;

	if (!admin) return null;

	const handlerConfig = admin[handlerType];
	if (!handlerConfig) return null;

	// Static boolean - not reactive
	if (typeof handlerConfig === "boolean") return null;

	// Short syntax - just a function
	if (typeof handlerConfig === "function") return handlerConfig;

	// Full syntax - object with handler
	if (typeof handlerConfig === "object" && "handler" in handlerConfig) {
		return handlerConfig.handler;
	}

	return null;
}

/**
 * Get options handler from field config.
 */
function getOptionsHandler(
	fieldDef: any,
): ((ctx: OptionsContext) => any) | null {
	const config = fieldDef.state?.config;
	const options = config?.options;

	if (!options) return null;

	// Check if it's a dynamic options config
	if (typeof options === "object" && "handler" in options) {
		return options.handler;
	}

	return null;
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Single reactive request in a batch.
 */
const reactiveRequestSchema = z.object({
	/** Field path (supports nested paths like "items.0.variant") */
	field: z.string(),

	/** Type of reactive operation */
	type: z.enum(["hidden", "readOnly", "disabled", "compute"]),

	/** Current form data */
	formData: z.record(z.string(), z.unknown()),

	/** Sibling data (for array items) */
	siblingData: z.record(z.string(), z.unknown()).nullable().optional(),

	/** Previous form data (for change detection) */
	prevData: z.record(z.string(), z.unknown()).nullable().optional(),

	/** Previous sibling data */
	prevSiblingData: z.record(z.string(), z.unknown()).nullable().optional(),
});

/**
 * Batch reactive request.
 */
const batchReactiveInputSchema = z.object({
	/** Collection name */
	collection: z.string(),

	/** Array of reactive requests */
	requests: z.array(reactiveRequestSchema),
});

/**
 * Single reactive result.
 */
const reactiveResultSchema = z.object({
	/** Field path */
	field: z.string(),

	/** Type of reactive operation */
	type: z.enum(["hidden", "readOnly", "disabled", "compute"]),

	/** Computed value */
	value: z.unknown(),

	/** Error message if handler failed */
	error: z.string().optional(),
});

/**
 * Batch reactive response.
 */
const batchReactiveOutputSchema = z.object({
	results: z.array(reactiveResultSchema),
});

/**
 * Options request.
 */
const optionsInputSchema = z.object({
	/** Collection name */
	collection: z.string(),

	/** Field path */
	field: z.string(),

	/** Current form data */
	formData: z.record(z.string(), z.unknown()),

	/** Sibling data (for array items) */
	siblingData: z.record(z.string(), z.unknown()).nullable().optional(),

	/** Search query */
	search: z.string().default(""),

	/** Page number (0-based) */
	page: z.number().int().min(0).default(0),

	/** Items per page */
	limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Options response.
 */
const optionsOutputSchema = z.object({
	options: z.array(
		z.object({
			value: z.union([z.string(), z.number()]),
			label: z.union([z.string(), z.record(z.string(), z.string())]),
		}),
	),
	hasMore: z.boolean().optional(),
	total: z.number().optional(),
});

// ============================================================================
// RPC Functions
// ============================================================================

/**
 * Batch reactive endpoint.
 * Executes multiple reactive handlers in a single request.
 */
export const batchReactive = fn({
	type: "query",
	schema: batchReactiveInputSchema,
	outputSchema: batchReactiveOutputSchema,

	handler: async (ctx) => {
		const cms = getApp(ctx);
		const { collection: collectionName, requests } = ctx.input;

		// Build server context (req is not available in function handlers)
		const serverCtx: ReactiveServerContext = {
			db: ctx.db,
			user: ctx.session?.user ?? null,
			req: new Request("http://localhost"), // Placeholder - not used in handlers
			locale: ctx.locale ?? "en",
		};

		const results: z.infer<typeof reactiveResultSchema>[] = [];

		for (const request of requests) {
			const { field, type, formData, siblingData, prevData, prevSiblingData } =
				request;

			try {
				// Get field definition
				const fieldDef = getFieldDefinition(cms, collectionName, field);

				// Get reactive handler
				const handler = getReactiveHandler(fieldDef, type);

				if (!handler) {
					// No handler found - skip
					results.push({
						field,
						type,
						value: undefined,
						error: `No ${type} handler found for field '${field}'`,
					});
					continue;
				}

				// Build context
				const reactiveCtx = buildReactiveContext(
					formData as Record<string, any>,
					siblingData as Record<string, any> | null,
					prevData as Record<string, any> | null,
					prevSiblingData as Record<string, any> | null,
					serverCtx,
				);

				// Execute handler
				const value = await handler(reactiveCtx);

				results.push({
					field,
					type,
					value,
				});
			} catch (error) {
				// Handler error - return error message
				results.push({
					field,
					type,
					value: undefined,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return { results };
	},
});

/**
 * Dynamic options endpoint.
 * Fetches options for select/relation fields with search and pagination.
 */
export const fieldOptions = fn({
	type: "query",
	schema: optionsInputSchema,
	outputSchema: optionsOutputSchema,

	handler: async (ctx) => {
		const cms = getApp(ctx);
		const {
			collection: collectionName,
			field,
			formData,
			siblingData,
			search,
			page,
			limit,
		} = ctx.input;

		// Build server context (req is not available in function handlers)
		const serverCtx: ReactiveServerContext = {
			db: ctx.db,
			user: ctx.session?.user ?? null,
			req: new Request("http://localhost"), // Placeholder - not used in handlers
			locale: ctx.locale ?? "en",
		};

		try {
			// Get field definition
			const fieldDef = getFieldDefinition(cms, collectionName, field);

			// Get options handler
			const handler = getOptionsHandler(fieldDef);

			if (!handler) {
				// No dynamic handler - check for static options
				const config = fieldDef.state?.config;
				if (Array.isArray(config?.options)) {
					// Static options - filter by search
					let options = config.options as Array<{
						value: string | number;
						label: string | Record<string, string>;
					}>;

					if (search) {
						const searchLower = search.toLowerCase();
						options = options.filter((opt) => {
							const label =
								typeof opt.label === "string"
									? opt.label
									: Object.values(opt.label).join(" ");
							return label.toLowerCase().includes(searchLower);
						});
					}

					// Paginate
					const start = page * limit;
					const paginatedOptions = options.slice(start, start + limit);

					return {
						options: paginatedOptions,
						hasMore: start + limit < options.length,
						total: options.length,
					};
				}

				// No options at all
				return {
					options: [],
					hasMore: false,
				};
			}

			// Build context
			const optionsCtx = buildOptionsContext(
				formData as Record<string, any>,
				siblingData as Record<string, any> | null,
				search,
				page,
				limit,
				serverCtx,
			);

			// Execute handler
			const result = await handler(optionsCtx);

			return {
				options: result.options || [],
				hasMore: result.hasMore,
				total: result.total,
			};
		} catch (error) {
			console.error(
				`Error fetching options for ${collectionName}.${field}:`,
				error,
			);
			return {
				options: [],
				hasMore: false,
			};
		}
	},
});

/**
 * Reactive functions bundle.
 */
export const reactiveFunctions = {
	batchReactive,
	fieldOptions,
} as const;
