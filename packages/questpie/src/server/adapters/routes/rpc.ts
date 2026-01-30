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
  FunctionDefinition,
  FunctionsMap,
} from "../../functions/types.js";
import type { AdapterConfig, AdapterContext } from "../types.js";
import { handleError, smartResponse } from "../utils/response.js";
import { parseRpcBody } from "../utils/request.js";
import { resolveContext } from "../utils/context.js";

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

  if (definition.mode === "raw") {
    if (request.method !== "POST") {
      return errorResponse(
        ApiError.badRequest("Method not allowed for raw function"),
        request,
      );
    }

    const resolved = await resolveContext(cms, request, config, context);
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

  if (request.method !== "POST") {
    return errorResponse(ApiError.badRequest("Method not allowed"), request);
  }

  const resolved = await resolveContext(cms, request, config, context);
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
      params: { name: string },
      context?: AdapterContext,
    ): Promise<Response> => {
      const functions = cms.getFunctions() as FunctionsMap;
      const definition = functions[params.name];
      if (!definition) {
        return errorResponse(
          ApiError.notFound("Function", params.name),
          request,
        );
      }

      return executeFunction(cms, config, definition, request, context);
    },

    collection: async (
      request: Request,
      params: { collection: string; name: string },
      context?: AdapterContext,
    ): Promise<Response> => {
      let collectionInstance: any;
      try {
        collectionInstance = cms.getCollectionConfig(params.collection as any);
      } catch {
        return errorResponse(
          ApiError.notFound("Collection", params.collection),
          request,
        );
      }

      const functions = (collectionInstance.state?.functions ||
        {}) as FunctionsMap;
      const definition = functions[params.name];
      if (!definition) {
        return errorResponse(
          ApiError.notFound(
            `Function on collection "${params.collection}"`,
            params.name,
          ),
          request,
        );
      }

      return executeFunction(cms, config, definition, request, context);
    },

    global: async (
      request: Request,
      params: { global: string; name: string },
      context?: AdapterContext,
    ): Promise<Response> => {
      let globalInstance: any;
      try {
        globalInstance = cms.getGlobalConfig(params.global as any);
      } catch {
        return errorResponse(
          ApiError.notFound("Global", params.global),
          request,
        );
      }

      const functions = (globalInstance.state?.functions || {}) as FunctionsMap;
      const definition = functions[params.name];
      if (!definition) {
        return errorResponse(
          ApiError.notFound(
            `Function on global "${params.global}"`,
            params.name,
          ),
          request,
        );
      }

      return executeFunction(cms, config, definition, request, context);
    },
  };
};
