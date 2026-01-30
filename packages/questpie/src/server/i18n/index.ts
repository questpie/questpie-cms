/**
 * Backend I18n Module
 *
 * Server-side internationalization support for error messages
 * and system messages.
 *
 * @example
 * ```ts
 * import { createTranslator, allBackendMessagesEN } from "#questpie/server/i18n";
 *
 * const t = createTranslator({
 *   messages: {
 *     en: allBackendMessagesEN,
 *     sk: skMessages,
 *   },
 *   fallbackLocale: "en",
 * });
 *
 * t("error.notFound", {}, "sk"); // "Nenájdené"
 * ```
 */

export * from "./messages.js";
export * from "./translator.js";
export * from "./types.js";
export * from "./zod-error-map.js";
