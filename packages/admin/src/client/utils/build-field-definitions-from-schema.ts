/**
 * Build Field Definitions from Schema
 *
 * Maps server introspection schema to admin field definitions.
 * Used by AutoForm to dynamically render forms based on server schema
 * when explicit field config is not provided.
 */

import type {
	CollectionSchema,
	FieldMetadata,
	FieldSchema,
	RelationFieldMetadata,
	RelationSchema,
	SelectFieldMetadata,
} from "questpie";
import { isI18nLocaleMap } from "questpie/shared";
import type { AnyAdminMeta } from "../../augmentation";
import type { FieldBuilder, FieldDefinition } from "../builder/field/field";

// ============================================================================
// Types
// ============================================================================

/**
 * Field registry type - maps field type names to FieldBuilder instances
 * This is what Admin.getFields() returns
 */
export type FieldRegistry = Record<string, FieldBuilder<any>>;

/**
 * Options for building field definitions
 */
export interface BuildFieldDefinitionsOptions {
	/**
	 * Field names to exclude from generation
	 */
	exclude?: string[];

	/**
	 * Only generate these field names
	 */
	include?: string[];

	/**
	 * Override generated config for specific fields
	 */
	overrides?: Record<string, Partial<Record<string, unknown>>>;
}

/**
 * Result of building field definitions
 */
export type FieldDefinitionsResult = Record<string, FieldDefinition>;

// ============================================================================
// Main Function
// ============================================================================

/**
 * Build admin field definitions from server collection schema.
 *
 * Maps server field metadata to admin FieldDefinition objects:
 * - Uses `metadata.type` to look up field in registry
 * - Applies `metadata.meta.admin` overrides
 * - Handles relation type mapping (belongsTo -> single, hasMany -> multiple)
 *
 * @param schema - Collection schema from server introspection
 * @param registry - Field registry from admin config (admin.getFields())
 * @param options - Optional configuration
 *
 * @example
 * ```tsx
 * // In a component with admin context
 * const admin = useAdminStore(selectAdmin);
 * const { data: schema } = useCollectionSchema("posts");
 * const fields = buildFieldDefinitionsFromSchema(
 *   schema,
 *   admin.getFields(),
 * );
 * ```
 */
export function buildFieldDefinitionsFromSchema(
	schema: CollectionSchema | null | undefined,
	registry: FieldRegistry,
	options: BuildFieldDefinitionsOptions = {},
): FieldDefinitionsResult {
	if (!schema) return {};

	const result: FieldDefinitionsResult = {};

	for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
		// Skip excluded fields
		if (options.exclude?.includes(fieldName)) continue;

		// Skip if not in include list (when include is specified)
		if (options.include && !options.include.includes(fieldName)) continue;

		// Skip system fields that shouldn't be in forms
		if (isSystemField(fieldName)) continue;

		const fieldDef = buildFieldDefinition(
			fieldName,
			fieldSchema,
			schema.relations,
			registry,
			options.overrides?.[fieldName],
		);

		if (fieldDef) {
			result[fieldName] = fieldDef;
		}
	}

	return result;
}

// ============================================================================
// Field Definition Builder
// ============================================================================

/**
 * Build a single field definition from schema
 */
function buildFieldDefinition(
	fieldName: string,
	fieldSchema: FieldSchema,
	relations: Record<string, RelationSchema>,
	registry: FieldRegistry,
	overrides?: Partial<Record<string, unknown>>,
): FieldDefinition | null {
	const { metadata } = fieldSchema;
	const fieldType = metadata.type;

	// Get field builder from registry
	const fieldBuilder = registry[fieldType];
	if (!fieldBuilder) {
		// Unknown field type - skip silently
		// Custom fields might not be registered in admin yet
		return null;
	}

	// Build field config from metadata
	const config = buildFieldConfig(fieldName, metadata, relations);

	// Apply admin overrides from server meta
	// The meta.admin property is added via module augmentation on field-specific meta interfaces
	const adminConfig = (metadata.meta as { admin?: AnyAdminMeta } | undefined)
		?.admin;
	if (adminConfig) {
		applyAdminConfig(config, adminConfig);
	}

	// Apply local overrides
	if (overrides) {
		Object.assign(config, overrides);
	}

	// Create field definition with options
	return fieldBuilder.$options(config);
}

/**
 * Build field config from metadata
 */
function buildFieldConfig(
	fieldName: string,
	metadata: FieldMetadata,
	relations: Record<string, RelationSchema>,
): Record<string, unknown> {
	const config: Record<string, unknown> = {
		label: metadata.label ?? formatFieldLabel(fieldName),
		description: metadata.description,
		required: metadata.required,
		localized: metadata.localized,
	};

	// Apply validation constraints from base metadata
	if (metadata.validation) {
		Object.assign(config, metadata.validation);
	}

	// Handle field-type-specific config via type guard
	if (isSelectMetadata(metadata)) {
		applySelectConfig(config, metadata);
	} else if (isRelationMetadata(metadata)) {
		applyRelationConfig(config, metadata, relations[fieldName]);
	}

	return config;
}

// ============================================================================
// Type Guards
// ============================================================================

function isSelectMetadata(m: FieldMetadata): m is SelectFieldMetadata {
	return m.type === "select";
}

function isRelationMetadata(m: FieldMetadata): m is RelationFieldMetadata {
	return m.type === "relation";
}

// ============================================================================
// Config Appliers (mutate config object)
// ============================================================================

/**
 * Apply select field config
 */
function applySelectConfig(
	config: Record<string, unknown>,
	metadata: SelectFieldMetadata,
): void {
	config.options = metadata.options.map((opt) => ({
		value: opt.value,
		label: resolveLabel(opt.label, opt.value),
	}));
	if (metadata.multiple !== undefined) {
		config.multiple = metadata.multiple;
	}
}

/**
 * Resolve I18nText label to string
 */
function resolveLabel(label: unknown, fallback: string | number): string {
	if (typeof label === "string") {
		return label;
	}
	if (label && typeof label === "object") {
		// Check for locale map (has 'en' key but not 'key' key)
		if (isI18nLocaleMap(label as Parameters<typeof isI18nLocaleMap>[0])) {
			return (label as Record<string, string>).en ?? String(fallback);
		}
		// Translation key - use fallback or key itself
		if ("key" in label) {
			return (
				(label as { key: string; fallback?: string }).fallback ??
				String(fallback)
			);
		}
	}
	return String(fallback);
}

/**
 * Apply relation field config
 */
function applyRelationConfig(
	config: Record<string, unknown>,
	metadata: RelationFieldMetadata,
	relationSchema?: RelationSchema,
): void {
	// Map relation type to single/multiple
	const isSingle = ["belongsTo", "morphTo"].includes(metadata.relationType);

	config.to = metadata.targetCollection;
	config.type = isSingle ? "single" : "multiple";
	// Pass through relation metadata for advanced use
	config.relationType = metadata.relationType;

	if (metadata.through ?? relationSchema?.through) {
		config.through = metadata.through ?? relationSchema?.through;
	}
	if (metadata.foreignKey ?? relationSchema?.foreignKey) {
		config.foreignKey = metadata.foreignKey ?? relationSchema?.foreignKey;
	}
}

/**
 * Apply admin config overrides from server meta.admin
 *
 * Since each field type has its own admin meta with only valid properties,
 * we simply copy all defined properties from adminConfig to config.
 */
function applyAdminConfig(
	config: Record<string, unknown>,
	adminConfig: AnyAdminMeta,
): void {
	// Copy all defined properties from admin config
	// Each field type's admin meta only contains valid properties for that type
	for (const [key, value] of Object.entries(adminConfig)) {
		if (value !== undefined) {
			config[key] = value;
		}
	}
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if a field is a system field that shouldn't be in forms
 */
function isSystemField(fieldName: string): boolean {
	const systemFields = [
		"id",
		"createdAt",
		"updatedAt",
		"deletedAt",
		"_title",
		"_locale",
	];
	return systemFields.includes(fieldName);
}

/**
 * Format field name as label
 * @example "firstName" -> "First Name"
 */
function formatFieldLabel(fieldName: string): string {
	return fieldName
		.replace(/([A-Z])/g, " $1") // Add space before capitals
		.replace(/[_-]/g, " ") // Replace underscores/dashes with spaces
		.replace(/^\s/, "") // Remove leading space
		.replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize first letter of each word
}
