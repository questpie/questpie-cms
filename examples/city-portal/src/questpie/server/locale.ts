/**
 * Locale — content localization configuration.
 */
import { locale } from "#questpie/factories";

export default locale({
	locales: [
		{
			code: "en",
			label: "English",
			fallback: true,
			flagCountryCode: "gb",
		},
	],
	defaultLocale: "en",
});
