/**
 * Auth Routes
 *
 * Authentication route handler.
 */

import type { Questpie } from "../../config/cms.js";
import type { QuestpieConfig } from "../../config/types.js";
import { ApiError } from "../../errors/index.js";
import { handleError } from "../utils/response.js";

export const createAuthRoute = <
  TConfig extends QuestpieConfig = QuestpieConfig,
>(
  cms: Questpie<TConfig>,
) => {
  return async (request: Request): Promise<Response> => {
    if (!cms.auth) {
      return handleError(ApiError.notImplemented("Authentication"), {
        request,
        cms,
      });
    }
    return cms.auth.handler(request);
  };
};
