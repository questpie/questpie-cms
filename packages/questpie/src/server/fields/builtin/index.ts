/**
 * Built-in Field Types
 *
 * Re-exports all built-in field type definitions and factories.
 * Import this module to register all built-in fields with the default registry.
 *
 * NOTE: Module augmentation is no longer used.
 * Field types are now derived from questpie.state.fields at compile time.
 * DefaultFieldTypeMap is a type alias to DefaultFields in builder.ts.
 */

export { type ArrayFieldConfig, arrayField } from "./array.js";
// Boolean field
export { type BooleanFieldConfig, booleanField } from "./boolean.js";
// Date/Time fields
export { type DateFieldConfig, dateField } from "./date.js";
export { type DatetimeFieldConfig, datetimeField } from "./datetime.js";
/**
 * Default field factories map.
 * Use this with QuestpieBuilder.fields() to register all built-in fields.
 *
 * @example
 * ```ts
 * import { questpie, defaultFields } from "@questpie/server";
 *
 * const q = questpie({ name: "app" })
 *   .fields(defaultFields);
 * ```
 */
export { type DefaultFields, defaultFields } from "./defaults.js";
export { type EmailFieldConfig, emailField } from "./email.js";
export { type JsonFieldConfig, type JsonValue, jsonField } from "./json.js";
// Numeric fields
export { type NumberFieldConfig, numberField } from "./number.js";
// Complex fields
export { type ObjectFieldConfig, objectField } from "./object.js";
export {
	type PolymorphicReference,
	type PolymorphicRelationConfig,
	polymorphicRelationField,
} from "./polymorphic-relation.js";
// Relation fields
export {
	type InferredRelationType,
	type InferredRelationType as RelationType, // Alias for backwards compatibility
	inferRelationType,
	type ReferentialAction,
	type RelationFieldConfig,
	type RelationFieldMetadata,
	type RelationTarget,
	relationField,
} from "./relation.js";
// Select/Enum field
export {
	type SelectFieldConfig,
	type SelectOption,
	selectField,
} from "./select.js";
// Text-based fields
export { type TextFieldConfig, textField } from "./text.js";
export { type TextareaFieldConfig, textareaField } from "./textarea.js";
export { type TimeFieldConfig, timeField } from "./time.js";
// Upload field
export { type UploadFieldConfig, uploadField } from "./upload.js";
export { type UrlFieldConfig, urlField } from "./url.js";
