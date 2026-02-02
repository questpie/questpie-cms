/**
 * Collection Introspection API
 *
 * Provides runtime introspection of collections for admin UI consumption.
 * Evaluates access control and returns schema with permissions.
 */

import { z } from "zod";
import type { Collection } from "#questpie/server/collection/builder/collection.js";
import type {
	AccessContext,
	AccessRule,
	CollectionAccess,
	CollectionBuilderState,
} from "#questpie/server/collection/builder/types.js";
import type { CRUDContext } from "#questpie/server/collection/crud/types.js";
import type {
	FieldDefinition,
	FieldDefinitionState,
	FieldLocation,
	FieldMetadata,
	ReferentialAction,
	RelationFieldMetadata,
} from "#questpie/server/fields/types.js";
import type { I18nText } from "#questpie/shared/i18n/types.js";

// ============================================================================
// Introspected Schema Types
// ============================================================================

/**
 * Introspected collection schema for admin consumption.
 */
export interface CollectionSchema {
	/** Collection name */
	name: string;

	/** Display label */
	label?: I18nText;

	/** Description */
	description?: I18nText;

	/** Icon identifier */
	icon?: string;

	/** Field schemas */
	fields: Record<string, FieldSchema>;

	/** Access information */
	access: CollectionAccessInfo;

	/** Collection options */
	options: {
		timestamps: boolean;
		softDelete: boolean;
		versioning: boolean;
		singleton?: boolean;
	};

	/** Title field configuration */
	title?: {
		field?: string;
		template?: string;
	};

	/** Relations metadata */
	relations: Record<string, RelationSchema>;

	/**
	 * JSON Schema for client-side validation.
	 * Generated from Zod schemas via z.toJSONSchema().
	 *
	 * Contains only synchronous, portable validation rules.
	 * Async/DB validations happen server-side only.
	 */
	validation?: {
		/** JSON Schema for create operations */
		insert?: unknown;

		/** JSON Schema for update operations */
		update?: unknown;
	};
}

/**
 * Introspected field schema.
 */
export interface FieldSchema {
	/** Field name (key) */
	name: string;

	/** Full metadata including admin config */
	metadata: FieldMetadata;

	/** Field location */
	location: FieldLocation;

	/** Field-level access */
	access?: FieldAccessInfo;

	/**
	 * JSON Schema for this specific field.
	 * Useful for inline/per-field validation.
	 */
	validation?: unknown;
}

/**
 * Collection access information.
 */
export interface CollectionAccessInfo {
	/** Can user see this collection at all? */
	visible: boolean;

	/** Access level */
	level: "none" | "filtered" | "full";

	/** Operations access */
	operations: {
		create: AccessResult;
		read: AccessResult;
		update: AccessResult;
		delete: AccessResult;
	};
}

/**
 * Field access information.
 */
export interface FieldAccessInfo {
	read: AccessResult;
	create: AccessResult;
	update: AccessResult;
}

/**
 * Access evaluation result.
 */
export type AccessResult =
	| { allowed: true }
	| { allowed: false; reason?: string }
	| { allowed: "filtered"; where?: unknown };

/**
 * Relation schema for admin.
 */
export interface RelationSchema {
	name: string;
	type: "belongsTo" | "hasMany" | "manyToMany" | "morphTo" | "morphMany";
	targetCollection: string | string[];
	foreignKey?: string;
	through?: string;
	sourceField?: string;
	targetField?: string;
	onDelete?: ReferentialAction;
	onUpdate?: ReferentialAction;
}

// ============================================================================
// Introspection Functions
// ============================================================================

/**
 * Introspect a collection for admin consumption.
 * Evaluates access control and returns schema with permissions.
 */
export async function introspectCollection(
	collection: Collection<CollectionBuilderState>,
	context: CRUDContext,
	cms?: unknown,
): Promise<CollectionSchema> {
	const { state } = collection;
	const fieldDefinitions = state.fieldDefinitions || {};

	// Evaluate collection-level access
	const access = await evaluateCollectionAccess(state, context, cms);

	// Build field schemas
	const fields: Record<string, FieldSchema> = {};
	for (const [name, fieldDef] of Object.entries(fieldDefinitions)) {
		const metadata = fieldDef.getMetadata();
		const fieldAccess = await evaluateFieldAccess(fieldDef, context, cms);

		// Generate field-level JSON Schema if possible
		let validation: unknown;
		try {
			const zodSchema = fieldDef.toZodSchema();
			validation = z.toJSONSchema(zodSchema);
		} catch {
			// Field doesn't support JSON Schema generation
		}

		fields[name] = {
			name,
			metadata,
			location: fieldDef.state.location,
			access: fieldAccess,
			validation,
		};
	}

	// Build relations metadata
	const relations: Record<string, RelationSchema> = {};
	for (const [name, relationConfig] of Object.entries(state.relations)) {
		relations[name] = {
			name,
			type: mapRelationType(relationConfig.type),
			targetCollection: relationConfig.collection,
			foreignKey: relationConfig.references?.[0],
			through: relationConfig.through,
			sourceField: relationConfig.sourceField,
			targetField: relationConfig.targetField,
			onDelete: relationConfig.onDelete as ReferentialAction,
			onUpdate: relationConfig.onUpdate as ReferentialAction,
		};
	}

	// Also extract relations from field definitions (f.relation fields)
	for (const [name, fieldDef] of Object.entries(fieldDefinitions)) {
		const metadata = fieldDef.getMetadata();
		if (metadata.type === "relation" && !relations[name]) {
			const relMeta = metadata as RelationFieldMetadata;
			relations[name] = {
				name,
				type: mapInferredRelationType(relMeta.relationType),
				targetCollection: relMeta.targetCollection,
				foreignKey: relMeta.foreignKey,
				through: relMeta.through,
				sourceField: relMeta.sourceField,
				targetField: relMeta.targetField,
				onDelete: relMeta.onDelete,
				onUpdate: relMeta.onUpdate,
			};
		}
	}

	// Generate validation schemas
	let validation: CollectionSchema["validation"];
	if (state.validation) {
		try {
			const { insertSchema, updateSchema } = state.validation;
			validation = {
				insert: insertSchema ? z.toJSONSchema(insertSchema) : undefined,
				update: updateSchema ? z.toJSONSchema(updateSchema) : undefined,
			};
		} catch {
			// Schema doesn't support JSON Schema generation
		}
	}

	return {
		name: state.name,
		label: undefined, // TODO: Add label to collection builder state
		description: undefined, // TODO: Add description to collection builder state
		icon: undefined, // TODO: Add icon to collection builder state
		fields,
		access,
		options: {
			timestamps: state.options?.timestamps !== false,
			softDelete: state.options?.softDelete ?? false,
			versioning: !!state.options?.versioning,
			singleton: undefined, // TODO: Add singleton support
		},
		title: state.title
			? {
					field: state.title,
				}
			: undefined,
		relations,
		validation,
	};
}

/**
 * Map relation type from RelationType to RelationSchema type.
 */
function mapRelationType(
	type: "one" | "many" | "manyToMany",
): RelationSchema["type"] {
	switch (type) {
		case "one":
			return "belongsTo";
		case "many":
			return "hasMany";
		case "manyToMany":
			return "manyToMany";
	}
}

/**
 * Map inferred relation type to RelationSchema type.
 */
function mapInferredRelationType(
	type:
		| "belongsTo"
		| "hasMany"
		| "manyToMany"
		| "multiple"
		| "morphTo"
		| "morphMany",
): RelationSchema["type"] {
	switch (type) {
		case "belongsTo":
			return "belongsTo";
		case "hasMany":
			return "hasMany";
		case "manyToMany":
			return "manyToMany";
		case "multiple":
			return "hasMany"; // Multiple is similar to hasMany
		case "morphTo":
			return "morphTo";
		case "morphMany":
			return "morphMany";
	}
}

/**
 * Evaluate collection-level access for current user.
 */
async function evaluateCollectionAccess(
	state: CollectionBuilderState,
	context: CRUDContext,
	cms?: unknown,
): Promise<CollectionAccessInfo> {
	const { access } = state;

	// No access config = full access
	if (!access || Object.keys(access).length === 0) {
		return {
			visible: true,
			level: "full",
			operations: {
				create: { allowed: true },
				read: { allowed: true },
				update: { allowed: true },
				delete: { allowed: true },
			},
		};
	}

	const accessContext: AccessContext = {
		app: cms,
		session: context.session,
		db: context.db,
		locale: context.locale,
	};

	const operations = {
		create: await evaluateAccessRule(access.create, accessContext),
		read: await evaluateAccessRule(access.read, accessContext),
		update: await evaluateAccessRule(access.update, accessContext),
		delete: await evaluateAccessRule(access.delete, accessContext),
	};

	// Determine visibility and level
	const hasAnyAccess = Object.values(operations).some(
		(r) => r.allowed !== false,
	);
	const hasFilteredAccess = Object.values(operations).some(
		(r) => r.allowed === "filtered",
	);
	const hasFullAccess = Object.values(operations).every(
		(r) => r.allowed === true,
	);

	return {
		visible: hasAnyAccess,
		level: hasFullAccess ? "full" : hasFilteredAccess ? "filtered" : "none",
		operations,
	};
}

/**
 * Evaluate a single access rule.
 */
async function evaluateAccessRule(
	rule: AccessRule | undefined,
	context: AccessContext,
): Promise<AccessResult> {
	// No rule = allowed
	if (rule === undefined || rule === true) {
		return { allowed: true };
	}

	// Explicit false = denied
	if (rule === false) {
		return { allowed: false };
	}

	// String = role name (simplified check - just indicate filtered)
	if (typeof rule === "string") {
		// Role-based access is filtered
		return { allowed: "filtered", where: { role: rule } };
	}

	// Function = evaluate
	if (typeof rule === "function") {
		try {
			const result = await rule(context);

			// Boolean result
			if (typeof result === "boolean") {
				return result ? { allowed: true } : { allowed: false };
			}

			// Where condition = filtered access
			if (result && typeof result === "object") {
				return { allowed: "filtered", where: result };
			}

			return { allowed: false };
		} catch (error) {
			// Access function threw - deny access
			return {
				allowed: false,
				reason: error instanceof Error ? error.message : "Access denied",
			};
		}
	}

	return { allowed: true };
}

/**
 * Evaluate field-level access for current user.
 */
async function evaluateFieldAccess(
	fieldDef: FieldDefinition<FieldDefinitionState>,
	context: CRUDContext,
	cms?: unknown,
): Promise<FieldAccessInfo | undefined> {
	const fieldAccess = fieldDef.state.config?.access;

	// No field-level access config
	if (!fieldAccess) {
		return undefined;
	}

	const accessContext: AccessContext = {
		app: cms,
		session: context.session,
		db: context.db,
		locale: context.locale,
	};

	return {
		read: await evaluateFieldAccessRule(fieldAccess.read, accessContext),
		create: await evaluateFieldAccessRule(fieldAccess.create, accessContext),
		update: await evaluateFieldAccessRule(fieldAccess.update, accessContext),
	};
}

/**
 * Evaluate a field-level access rule.
 */
async function evaluateFieldAccessRule(
	rule: boolean | ((ctx: any) => boolean | Promise<boolean>) | undefined,
	context: AccessContext,
): Promise<AccessResult> {
	// No rule = allowed
	if (rule === undefined || rule === true) {
		return { allowed: true };
	}

	// Explicit false = denied
	if (rule === false) {
		return { allowed: false };
	}

	// Function = evaluate
	if (typeof rule === "function") {
		try {
			const result = await rule(context);
			return result ? { allowed: true } : { allowed: false };
		} catch (error) {
			return {
				allowed: false,
				reason: error instanceof Error ? error.message : "Access denied",
			};
		}
	}

	return { allowed: true };
}

// ============================================================================
// Batch Introspection
// ============================================================================

/**
 * Introspect multiple collections at once.
 * Only returns visible collections based on user access.
 */
export async function introspectCollections(
	collections: Record<string, Collection<CollectionBuilderState>>,
	context: CRUDContext,
	cms?: unknown,
): Promise<Record<string, CollectionSchema>> {
	const schemas: Record<string, CollectionSchema> = {};

	for (const [name, collection] of Object.entries(collections)) {
		const schema = await introspectCollection(collection, context, cms);

		// Only include visible collections
		if (schema.access.visible) {
			schemas[name] = schema;
		}
	}

	return schemas;
}
