/**
 * RPC Routes
 *
 * Remote procedure call route handlers.
 */

import type { Questpie } from "../../config/cms.js";
import type { QuestpieConfig } from "../../config/types.js";
import { ApiError } from "../../errors/index.js";
import { executeJsonFunction } from "../../functions/execute.js";
import type {
	FunctionAccess,
	FunctionAccessRule,
	FunctionDefinition,
} from "../../functions/types.js";
import type { RpcRouterTree } from "../../rpc/types.js";
import type { AdapterConfig, AdapterContext } from "../types.js";
import { resolveContext } from "../utils/context.js";
import { parseRpcBody } from "../utils/request.js";
import { handleError, smartResponse } from "../utils/response.js";

const isFunctionDefinition = (value: unknown): value is FunctionDefinition => {
	return (
		typeof value === "object" &&
		value !== null &&
		"handler" in value &&
		typeof (value as { handler?: unknown }).handler === "function"
	);
};

const extractAccessRule = (
	access?: FunctionAccess,
): FunctionAccessRule | undefined => {
	if (access === undefined) {
		return undefined;
	}

	if (typeof access === "object" && access !== null) {
		return access.execute;
	}

	return access;
};

const evaluateFunctionAccess = async (
	definition: FunctionDefinition,
	ctx: {
		app: unknown;
		session?: unknown | null;
		db: unknown;
		locale?: string;
		request: Request;
	},
): Promise<boolean> => {
	const rule = extractAccessRule(definition.access);

	if (rule === undefined) {
		return true;
	}

	if (typeof rule === "boolean") {
		return rule;
	}

	try {
		return await rule(ctx as any);
	} catch {
		return false;
	}
};

const resolveRpcProcedure = (
	router: RpcRouterTree,
	path: string[],
): FunctionDefinition | undefined => {
	let current: unknown = router;

	for (const segment of path) {
		if (!current || typeof current !== "object") {
			return undefined;
		}

		current = (current as Record<string, unknown>)[segment];
	}

	return isFunctionDefinition(current) ? current : undefined;
};

const executeFunction = async <TConfig extends QuestpieConfig = QuestpieConfig>(
	cms: Questpie<TConfig>,
	config: AdapterConfig<TConfig>,
	definition: FunctionDefinition,
	request: Request,
	context?: AdapterContext,
) => {
	const errorResponse = (
		error: unknown,
		request: Request,
		locale?: string,
	): Response => {
		return handleError(error, { request, cms, locale });
	};

	if (request.method !== "POST") {
		return errorResponse(ApiError.badRequest("Method not allowed"), request);
	}

	const resolved = await resolveContext(cms, request, config, context);

	const hasAccess = await evaluateFunctionAccess(definition, {
		app: cms,
		session: resolved.cmsContext.session,
		db: resolved.cmsContext.db ?? cms.db,
		locale: resolved.cmsContext.locale,
		request,
	});

	if (!hasAccess) {
		return errorResponse(
			ApiError.forbidden({
				operation: "read",
				resource: "rpc",
				reason: "Access denied",
			}),
			request,
			resolved.cmsContext.locale,
		);
	}

	if (definition.mode === "raw") {
		try {
			return await definition.handler({
				request,
				app: cms as any,
				session: resolved.cmsContext.session,
				locale: resolved.cmsContext.locale,
				db: resolved.cmsContext.db ?? cms.db,
			});
		} catch (error) {
			return errorResponse(error, request, resolved.cmsContext.locale);
		}
	}

	const body = await parseRpcBody(request);

	if (body === null) {
		return errorResponse(
			ApiError.badRequest("Invalid JSON body"),
			request,
			resolved.cmsContext.locale,
		);
	}

	try {
		const result = await executeJsonFunction(
			cms,
			definition,
			body,
			resolved.cmsContext,
		);
		return smartResponse(result, request);
	} catch (error) {
		return errorResponse(error, request, resolved.cmsContext.locale);
	}
};

export const createRpcRoutes = <
	TConfig extends QuestpieConfig = QuestpieConfig,
>(
	cms: Questpie<TConfig>,
	config: AdapterConfig<TConfig> = {},
) => {
	const errorResponse = (error: unknown, request: Request): Response => {
		return handleError(error, { request, cms });
	};

	return {
		root: async (
			request: Request,
			params: { path: string[] },
			context?: AdapterContext,
		): Promise<Response> => {
			if (!config.rpc) {
				return errorResponse(ApiError.notFound("RPC router"), request);
			}

			const definition = resolveRpcProcedure(config.rpc, params.path);
			if (!definition) {
				return errorResponse(
					ApiError.notFound("RPC procedure", params.path.join(".")),
					request,
				);
			}

			return executeFunction(cms, config, definition, request, context);
		},
	};
};
