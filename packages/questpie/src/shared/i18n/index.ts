/**
 * Shared i18n Exports
 *
 * Validation messages and Zod error mapping shared between FE and BE.
 */

export {
	createValidationTranslator,
	mergeValidationMessages,
	type ValidationMessage,
	type ValidationMessageKey,
	type ValidationMessagesMap,
	type ValidationTranslateFn,
	validationMessagesEN,
	validationMessagesSK,
} from "./validation-messages.js";

export {
	createZodErrorMap,
	i18nParams,
	type ZodErrorMapFn,
	type ZodIssue,
} from "./zod-error-map.js";
