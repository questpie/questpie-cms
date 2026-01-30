/**
 * Shared Module
 *
 * Types and utilities shared between server and client code.
 * This module must NOT import any server-only dependencies.
 */

export type {
  FilterOperator,
  FilterRule,
  SortConfig,
  ViewConfiguration,
} from "./types/index.js";

// Preview utilities (browser-safe)
export {
  DRAFT_MODE_COOKIE,
  createDraftModeCookie,
  getPreviewSecret,
  isDraftMode,
} from "./preview-utils.js";
