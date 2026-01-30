/**
 * Shared error types for both server and client
 * These types are safe to use on the client-side
 */

// Re-export types that client needs
export type {
  ApiErrorShape,
  FieldError,
  ApiErrorContext,
  HookErrorContext,
  AccessErrorContext,
  DBErrorContext,
} from "../server/errors/types.js";

export type { ApiErrorCode } from "../server/errors/codes.js";

export { CMS_ERROR_CODES } from "../server/errors/codes.js";
