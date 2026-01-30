/**
 * Cascade Delete Operations
 *
 * Handles application-level CASCADE delete operations for relations.
 * These trigger hooks (unlike database FK constraints).
 */

import type { RelationConfig } from "#questpie/server/collection/builder/types.js";
import type {
  CRUD,
  CRUDContext,
} from "#questpie/server/collection/crud/types.js";
import type { resolveFieldKey as ResolveFieldKeyFn } from "#questpie/server/collection/crud/shared/field-resolver.js";
import type { Questpie } from "#questpie/server/config/cms.js";

/**
 * Options for cascade delete operations
 */
export interface CascadeDeleteOptions {
  /** The record being deleted */
  record: Record<string, any>;
  /** Collection state with relations config */
  relations: Record<string, RelationConfig>;
  /** CMS instance for accessing related CRUDs */
  cms: Questpie<any>;
  /** CRUD context */
  context: CRUDContext;
  /** Function to resolve field keys */
  resolveFieldKey: typeof ResolveFieldKeyFn;
}

/**
 * Handle cascade delete operations for all relations
 *
 * NOTE: Only handles application-level CASCADE to trigger hooks.
 * Database FK constraints handle CASCADE/SET NULL/RESTRICT automatically.
 *
 * @param options - Cascade delete options
 */
export async function handleCascadeDelete(
  options: CascadeDeleteOptions,
): Promise<void> {
  const { record, relations, cms, context, resolveFieldKey } = options;

  for (const [_relationName, relation] of Object.entries(relations)) {
    // Skip if no action
    if (
      !relation.onDelete ||
      relation.onDelete === "no action" ||
      relation.onDelete === "restrict"
    ) {
      continue;
    }

    // Handle HasMany
    if (relation.type === "many" && !relation.fields) {
      await cascadeDeleteHasMany(
        record,
        relation,
        cms,
        context,
        resolveFieldKey,
      );
    }
    // Handle ManyToMany CASCADE
    else if (
      relation.type === "manyToMany" &&
      relation.through &&
      relation.onDelete === "cascade"
    ) {
      await cascadeDeleteManyToMany(record, relation, cms, context);
    }
  }
}

/**
 * Handle cascade delete for HasMany relations
 */
async function cascadeDeleteHasMany(
  record: Record<string, any>,
  relation: RelationConfig,
  cms: Questpie<any>,
  context: CRUDContext,
  resolveFieldKey: typeof ResolveFieldKeyFn,
): Promise<void> {
  const reverseRelationName = relation.relationName;
  if (!reverseRelationName) return;

  const relatedCrud = cms.api.collections[relation.collection];
  const reverseRelation =
    relatedCrud["~internalState"].relations?.[reverseRelationName];
  if (!reverseRelation?.fields || reverseRelation.fields.length === 0) return;

  const foreignKeyField =
    resolveFieldKey(
      relatedCrud["~internalState"],
      reverseRelation.fields[0],
      relatedCrud["~internalRelatedTable"],
    ) ?? reverseRelation.fields[0].name;
  const primaryKeyField = reverseRelation.references?.[0] || "id";

  // CASCADE
  if (relation.onDelete === "cascade") {
    const { docs: relatedRecords } = await relatedCrud.find(
      {
        where: { [foreignKeyField]: { eq: record[primaryKeyField] } },
      },
      context,
    );

    if (relatedRecords.length > 0) {
      // CASCADE: Delete related records (triggers hooks)
      for (const relatedRecord of relatedRecords) {
        await relatedCrud.deleteById({ id: relatedRecord.id }, context);
      }
    }
  }
  // SET NULL
  else if (relation.onDelete === "set null") {
    // Update related records to set FK to null
    // We use updateMany which triggers hooks
    await relatedCrud.update(
      {
        where: { [foreignKeyField]: { eq: record[primaryKeyField] } },
        data: { [foreignKeyField]: null },
      },
      context,
    );
  }
}

/**
 * Handle cascade delete for ManyToMany relations
 * Only CASCADE is supported (deletes junction records)
 */
async function cascadeDeleteManyToMany(
  record: Record<string, any>,
  relation: RelationConfig,
  cms: Questpie<any>,
  context: CRUDContext,
): Promise<void> {
  const sourceField = relation.sourceField;
  const sourceKey = relation.sourceKey || "id";

  if (!sourceField || !relation.through) return;

  const junctionCrud = cms.api.collections[relation.through];

  const { docs: junctionRecords } = await junctionCrud.find(
    {
      where: { [sourceField]: { eq: record[sourceKey] } },
    },
    context,
  );

  if (junctionRecords.length > 0) {
    // CASCADE: Delete junction records
    for (const junctionRecord of junctionRecords) {
      await junctionCrud.deleteById({ id: junctionRecord.id }, context);
    }
  }
}
