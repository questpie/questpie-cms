/**
 * Schema Introspection
 *
 * Extract field information from CMS schema (Drizzle tables)
 * Auto-infer field types, required, defaults, etc.
 */

import type { QCMS } from "@questpie/cms/server";

/**
 * Field type extracted from schema
 */
export interface SchemaField {
	name: string;
	type: "text" | "textarea" | "number" | "boolean" | "date" | "datetime" | "json" | "relation" | "uuid";
	required: boolean;
	nullable: boolean;
	default?: any;
	unique?: boolean;
	// Drizzle column reference
	column?: any;
	// Relations
	relation?: {
		type: "one" | "many";
		targetCollection: string;
		targetField: string;
	};
}

/**
 * Collection schema extracted from CMS
 */
export interface CollectionSchema {
	name: string;
	fields: Record<string, SchemaField>;
	relations: Record<string, SchemaField>;
}

/**
 * Infer field type from Drizzle column type
 */
export function inferFieldTypeFromColumn(column: any): SchemaField["type"] {
	// This will be implemented based on Drizzle column types
	// For now, return type based on column properties
	const columnType = column?.columnType || column?.dataType || "";

	if (columnType.includes("varchar") || columnType.includes("text")) {
		// varchar with length < 255 = text input, otherwise textarea
		const length = column?.length || 255;
		return length < 255 ? "text" : "textarea";
	}

	if (columnType.includes("int") || columnType.includes("numeric")) {
		return "number";
	}

	if (columnType.includes("bool")) {
		return "boolean";
	}

	if (columnType.includes("timestamp") || columnType.includes("date")) {
		return columnType.includes("time") ? "datetime" : "date";
	}

	if (columnType.includes("json")) {
		return "json";
	}

	if (columnType.includes("uuid")) {
		return "uuid";
	}

	return "text"; // default
}

/**
 * Extract schema from CMS for a collection
 *
 * TODO: This needs access to CMS runtime schema
 * For now, we'll use type inference from the client
 */
export function extractCollectionSchema<
	T extends QCMS<any, any, any>,
	K extends string,
>(
	cms: T,
	collectionName: K,
): CollectionSchema {
	// This is a placeholder - real implementation will introspect
	// the Drizzle schema from cms.collections[collectionName]

	// For MVP, we can:
	// 1. Use type inference from TypeScript
	// 2. Parse Drizzle table at runtime
	// 3. Use metadata from collection definition

	return {
		name: collectionName,
		fields: {},
		relations: {},
	};
}

/**
 * Get field order from config or default
 */
export function getFieldOrder(
	schema: CollectionSchema,
	config?: {
		fields?: string[];
		exclude?: string[];
	},
): string[] {
	const allFields = Object.keys(schema.fields);

	// If explicit fields defined, use that order
	if (config?.fields) {
		return config.fields;
	}

	// Otherwise, use all fields except excluded
	const excluded = new Set(config?.exclude || []);

	// Default order: non-meta fields first, then meta fields
	const metaFields = ["id", "createdAt", "updatedAt", "deletedAt"];
	const regularFields = allFields.filter(
		(f) => !metaFields.includes(f) && !excluded.has(f),
	);
	const metaFieldsPresent = allFields.filter(
		(f) => metaFields.includes(f) && !excluded.has(f),
	);

	return [...regularFields, ...metaFieldsPresent];
}
