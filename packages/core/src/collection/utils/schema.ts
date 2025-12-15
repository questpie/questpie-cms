import type { CollectionConfig } from "@qcms/core/types/collection";
import type { FieldConfig } from "@qcms/core/types/fields";
import type { MutationOperation } from "@qcms/core/types/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
/**
 * Convert field config to Convex validator
 */
export function fieldToValidator(field: FieldConfig) {
	switch (field.type) {
		case "text":
		case "textarea":
		case "email":
		case "url":
		case "password":
			return v.string();

		case "richText":
			return v.any();

		case "number":
		case "slider":
			return v.number();

		case "boolean":
			return v.boolean();

		case "range":
			return v.array(v.number()); // [min, max]

		case "date":
			return v.number(); // Store as timestamp

		case "select":
			return v.string(); // Store as string value

		case "multiselect":
			return v.array(v.string()); // Store as array of strings

		case "relation":
			return v.id(field.collection); // Reference to another table
		case "relationMany":
			return v.array(v.id(field.collection)); // Array of references

		case "upload":
			return v.id(field.collection);
		case "uploadMany":
			return v.array(v.id(field.collection));

		case "json":
			return v.any(); // Store arbitrary JSON

		case "geopoint":
			return v.object({ latitude: v.number(), longitude: v.number() });

		case "group": {
			// Nested object - recursively generate validators for nested fields
			const nestedFields: Record<string, any> = {};
			for (const [nestedName, nestedConfig] of Object.entries(field.fields)) {
				let nestedValidator = fieldToValidator(nestedConfig);
				if (!nestedConfig.required) {
					nestedValidator = v.optional(nestedValidator) as any;
				}
				nestedFields[nestedName] = nestedValidator;
			}
			return v.object(nestedFields);
		}

		case "array": {
			// Array of objects
			const itemFields: Record<string, any> = {};
			for (const [itemFieldName, itemFieldConfig] of Object.entries(
				field.fields,
			)) {
				let itemValidator = fieldToValidator(itemFieldConfig);
				if (!itemFieldConfig.required) {
					itemValidator = v.optional(itemValidator) as any;
				}
				itemFields[itemFieldName] = itemValidator;
			}
			return v.array(v.object(itemFields));
		}

		default:
			return v.string();
	}
}

export function generateArgsValidator(
	collection: CollectionConfig,
	op: MutationOperation,
) {
	const args: Record<string, any> = {};

	for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
		let validator = fieldToValidator(fieldConfig);

		if (!fieldConfig.required || op === "update") {
			validator = v.optional(validator) as any;
		}

		args[fieldName] = validator;
	}

	return args;
}

/**
 * Generate Convex table definition from collection config
 */
function generateTable(collection: CollectionConfig) {
	const fields: Record<string, any> = {};

	// Add user-defined fields
	for (const [fieldName, fieldConfig] of Object.entries(collection.fields)) {
		let validator = fieldToValidator(fieldConfig);

		// Make optional if not required
		if (!fieldConfig.required) {
			validator = v.optional(validator) as any;
		}

		fields[fieldName] = validator;
	}

	if (!("createdAt" in fields)) {
		fields.createdAt = v.number();
	}
	if (!("updatedAt" in fields)) {
		fields.updatedAt = v.number();
	}

	// // Add soft delete if enabled
	// if (collection.softDelete) {
	// 	fields.deletedAt = v.optional(v.number());
	// }

	// Add system title field for search and relations
	fields._title = v.string();

	// Add versioning fields if enabled
	// if (collection.versioning?.enabled) {
	// 	fields._status = v.union(
	// 		v.literal("published"),
	// 		v.literal("draft"),
	// 		v.literal("archived"),
	// 	);
	// 	fields._parentId = v.optional(v.id(collection.name)); // Points to live version if this is a draft
	// 	fields._version = v.number();
	// }

	// Create table definition
	let table = defineTable(fields);

	// Add indexes
	if (collection.indexes) {
		for (const index of collection.indexes) {
			table = table.index(index.name, index.fields as any);
		}
	}

	// // Add versioning indexes
	// if (collection.versioning?.enabled) {
	// 	table = table.index("by_parent", ["_parentId"]);
	// 	table = table.index("by_status", ["_status"]);
	// }

	// Add system search index on _title
	table = table.searchIndex("search_title", {
		searchField: "_title",
	});

	// Add search indexes
	if (collection.searchIndexes) {
		for (const index of collection.searchIndexes) {
			table = table.searchIndex(index.name, {
				searchField: index.searchField,
				filterFields: index.filterFields as any,
			});
		}
	}

	// Add vector indexes
	if (collection.vectorIndexes) {
		for (const index of collection.vectorIndexes) {
			table = table.vectorIndex(index.name, {
				vectorField: index.vectorField,
				dimensions: index.dimensions,
				filterFields: index.filterFields as any,
			});
		}
	}

	// Add default timestamp index if timestamps enabled
	if (!collection.indexes?.some((idx) => idx.name === "by_created_at")) {
		table = table.index("by_created_at", ["createdAt"]);
	}

	// Add soft delete index if enabled
	// if (
	// 	collection.softDelete &&
	// 	!collection.indexes?.some((idx) => idx.name === "by_deleted_at")
	// ) {
	// 	table = table.index("by_deleted_at", ["deletedAt"]);
	// }

	return table;
}

/**
 * Generate Convex schema from multiple collections
 *
 * @example
 * import { articlesCollection, usersCollection } from './collections'
 *
 * export default generateSchema({
 *   articles: articlesCollection,
 *   users: usersCollection,
 * })
 */
export function generateSchema(collections: Record<string, CollectionConfig>) {
	const tables: Record<string, any> = {};

	for (const [tableName, collection] of Object.entries(collections)) {
		tables[tableName] = generateTable(collection);
	}

	// Add generic history table
	// tables.qcms_history = defineTable({
	// 	collection: v.string(),
	// 	docId: v.string(), // ID of the live document
	// 	version: v.number(),
	// 	data: v.any(), // Snapshot of data
	// 	author: v.optional(v.string()),
	// 	createdAt: v.number(),
	// }).index("by_doc", ["collection", "docId"]);

	return defineSchema(tables);
}
