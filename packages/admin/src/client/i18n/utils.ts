/**
 * I18n Utilities
 *
 * Helper functions for locale handling.
 */

// ============================================================================
// Locale Parsing
// ============================================================================

/**
 * Parse locale string into parts
 *
 * @example
 * parseLocale("en-US") // { language: "en", region: "US" }
 * parseLocale("zh-Hans-CN") // { language: "zh", script: "Hans", region: "CN" }
 */
export function parseLocale(locale: string): {
  language: string;
  script?: string;
  region?: string;
} {
  const parts = locale.split("-");
  if (parts.length === 1) {
    return { language: parts[0].toLowerCase() };
  }
  if (parts.length === 2) {
    // Could be language-region or language-script
    if (parts[1].length === 2) {
      return {
        language: parts[0].toLowerCase(),
        region: parts[1].toUpperCase(),
      };
    }
    return {
      language: parts[0].toLowerCase(),
      script: parts[1],
    };
  }
  // language-script-region
  return {
    language: parts[0].toLowerCase(),
    script: parts[1],
    region: parts[2].toUpperCase(),
  };
}

/**
 * Get language code from locale
 */
export function getLanguage(locale: string): string {
  return parseLocale(locale).language;
}

// ============================================================================
// Locale Matching
// ============================================================================

/**
 * Find best matching locale from available list
 *
 * @example
 * findBestLocale("en-GB", ["en", "de", "fr"]) // "en"
 * findBestLocale("zh-TW", ["zh-CN", "zh-TW", "en"]) // "zh-TW"
 */
export function findBestLocale(
  requested: string,
  available: string[],
  fallback?: string,
): string | undefined {
  // Exact match
  if (available.includes(requested)) {
    return requested;
  }

  // Language match (e.g., "en-GB" matches "en")
  const { language } = parseLocale(requested);
  const languageMatch = available.find((l) => getLanguage(l) === language);
  if (languageMatch) {
    return languageMatch;
  }

  return fallback;
}

/**
 * Detect browser locale
 */
export function detectBrowserLocale(
  available: string[],
  fallback: string,
): string {
  if (typeof navigator === "undefined") return fallback;

  const browserLocales = navigator.languages || [navigator.language];

  for (const locale of browserLocales) {
    const match = findBestLocale(locale, available);
    if (match) return match;
  }

  return fallback;
}

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = "questpie-admin-locale";

/**
 * Get saved locale from localStorage
 */
export function getSavedLocale(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Save locale to localStorage
 */
export function saveLocale(locale: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore
  }
}

/**
 * Clear saved locale
 */
export function clearSavedLocale(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

// ============================================================================
// Format Presets
// ============================================================================

/**
 * Common date format options
 */
export const dateFormats = {
  short: { dateStyle: "short" } as Intl.DateTimeFormatOptions,
  medium: { dateStyle: "medium" } as Intl.DateTimeFormatOptions,
  long: { dateStyle: "long" } as Intl.DateTimeFormatOptions,
  time: { timeStyle: "short" } as Intl.DateTimeFormatOptions,
  datetime: {
    dateStyle: "medium",
    timeStyle: "short",
  } as Intl.DateTimeFormatOptions,
} as const;

/**
 * Common number format options
 */
export const numberFormats = {
  decimal: { style: "decimal" } as Intl.NumberFormatOptions,
  percent: { style: "percent" } as Intl.NumberFormatOptions,
  compact: { notation: "compact" } as Intl.NumberFormatOptions,
  currency: (code: string) =>
    ({ style: "currency", currency: code }) as Intl.NumberFormatOptions,
} as const;
