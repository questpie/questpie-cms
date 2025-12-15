import type { _Translator } from "use-intl";

/**
 * Type of field labels, helpers, descriptions etc.
 */
export type FieldLabelType =
	| string
	| ((args: { locale: string; t: _Translator }) => string);
