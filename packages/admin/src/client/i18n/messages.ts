/**
 * Default Admin UI Messages
 *
 * Re-exports English messages as the default language.
 * For other languages, import from "@questpie/admin/i18n/messages".
 *
 * @example
 * ```ts
 * // Default English (always bundled)
 * import { adminMessages } from "@questpie/admin";
 *
 * // Add other languages
 * import { adminMessagesSK } from "@questpie/admin/i18n/messages";
 *
 * const admin = qa()
 *   .translations({ sk: adminMessagesSK })
 *   .build();
 * ```
 */

import { validationMessagesEN } from "questpie/shared";
import { adminMessagesEN } from "./messages/en.js";
import type { SimpleMessages } from "./simple";

/**
 * Default English messages for admin UI
 * This is re-exported from messages/en.ts for backwards compatibility
 */
export const adminMessages: SimpleMessages = adminMessagesEN;

/**
 * Convert validation messages to SimpleMessages format
 */
function flattenValidationMessages(
	messages: Record<string, string | { one: string; other: string }>,
): SimpleMessages {
	const result: SimpleMessages = {};

	for (const [key, value] of Object.entries(messages)) {
		if (typeof value === "string") {
			result[key] = value;
		} else {
			// Convert plural to SimpleMessages format
			result[key] = { one: value.one, other: value.other };
		}
	}

	return result;
}

/**
 * All admin messages including shared validation messages
 */
export const allAdminMessages: SimpleMessages = {
	// Shared validation messages (from questpie/shared)
	...flattenValidationMessages(
		validationMessagesEN as Record<
			string,
			string | { one: string; other: string }
		>,
	),
	// Admin UI messages (can override validation messages if needed)
	...adminMessages,
};

/**
 * Get admin messages for a locale
 *
 * Returns English as fallback if locale not found.
 * Users should provide their own translations.
 */
export function getAdminMessages(locale: string): SimpleMessages {
	// For now, only English is bundled
	// Users can add translations via the i18n config
	if (locale === "en") {
		return allAdminMessages;
	}
	return allAdminMessages; // Fallback to English
}

// Re-export shared validation messages for convenience
export { validationMessagesEN } from "questpie/shared";
