/**
 * Upload Field Factory (V2)
 *
 * File upload field that references an assets/media collection.
 * Supports single uploads (belongsTo) and many-to-many via junction table.
 */

import { varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import type { KnownCollectionNames } from "../../config/app-context.js";
import { belongsToOps, toManyOps } from "../operators/builtin.js";
import { createField } from "../field-class.js";
import type { DefaultFieldState } from "../field-class-types.js";
import type { RelationFieldMetadata, ReferentialAction } from "../types.js";

// ============================================================================
// Types
// ============================================================================

export type UploadFieldState = DefaultFieldState & {
	type: "upload";
	data: string;
};

interface UploadConfig {
	/** Target upload collection. @default "assets" */
	to?: KnownCollectionNames;
	/** Allowed MIME types. */
	mimeTypes?: string[];
	/** Max file size in bytes. */
	maxSize?: number;
	/** Junction collection for M2M uploads. */
	through?: KnownCollectionNames;
	/** Source field on junction. */
	sourceField?: string;
	/** Target field on junction. */
	targetField?: string;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an upload field.
 *
 * @param config - Optional upload configuration
 *
 * @example
 * ```ts
 * // Single upload (belongsTo assets)
 * avatar: f.upload({ mimeTypes: ["image/*"] }).required()
 *
 * // M2M upload gallery
 * gallery: f.upload({ through: "post_assets" })
 *
 * // Custom media collection
 * document: f.upload({ to: "media", mimeTypes: ["application/pdf"] })
 * ```
 */
export function upload(config?: UploadConfig): Field<UploadFieldState> {
	const { to = "assets", through, mimeTypes, maxSize, sourceField, targetField } = config ?? {};

	const isM2M = !!through;

	return createField<UploadFieldState>({
		type: "upload",
		columnFactory: isM2M ? null : (name) => varchar(name, { length: 36 }),
		schemaFactory: () =>
			isM2M ? z.array(z.string().uuid()) : z.string().uuid(),
		operatorSet: isM2M ? toManyOps : belongsToOps,
		notNull: false,
		hasDefault: false,
		localized: false,
		virtual: isM2M,
		input: true,
		output: true,
		isArray: false,
		to,
		through,
		sourceField,
		targetField,
		metadataFactory: (state) =>
			({
				type: "relation",
				label: state.label,
				description: state.description,
				required: state.notNull ?? false,
				localized: state.localized ?? false,
				readOnly: state.input === false,
				writeOnly: state.output === false,
				targetCollection: (state.to as string) ?? "assets",
				relationType: state.through ? "manyToMany" : "belongsTo",
				through: state.through as string | undefined,
				sourceField: state.sourceField,
				targetField: state.targetField,
				isUpload: true,
				meta: state.admin,
			}) as RelationFieldMetadata,
	});
}

import type { Field } from "../field-class.js";
