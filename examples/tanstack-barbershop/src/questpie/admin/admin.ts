import { builder } from "./builder";

// ============================================================================
// Admin UI Configuration
// ============================================================================

/**
 * Admin configuration for the barbershop app.
 *
 * IMPORTANT: Translations are now configured on the SERVER via:
 * - .adminLocale({ locales: ["en", "sk"], defaultLocale: "en" })
 * - .messages({ en: {...}, sk: {...} })
 *
 * The client fetches translations from the server via getAdminTranslations() RPC.
 * This enables single source of truth for all translations.
 *
 * To enable server-side translations in AdminProvider, set useServerTranslations={true}
 *
 * @example
 * ```tsx
 * <AdminProvider
 *   admin={admin}
 *   client={client}
 *   useServerTranslations  // Fetch translations from server
 * >
 *   {children}
 * </AdminProvider>
 * ```
 */
export const admin = builder
	// Client-side locale config (for backwards compatibility)
	// When using useServerTranslations, the server's adminLocale config takes precedence
	.locale({
		default: "en",
		supported: ["en", "sk"],
	})
	// Branding
	.branding({
		name: "Barbershop Admin",
		logo: undefined, // TODO: Add logo component
	});

export type AdminConfig = typeof admin;
