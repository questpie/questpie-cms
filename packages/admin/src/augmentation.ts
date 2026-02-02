/**
 * Module Augmentation for questpie package
 *
 * Each field type has its own Meta interface that admin augments
 * with field-specific UI options. This provides type-safe configuration
 * where only valid options for each field type are allowed.
 *
 * @example Usage in field definition (server-side):
 * ```ts
 * f.text({
 *   label: "Title",
 *   meta: {
 *     admin: {
 *       placeholder: "Enter title...",  // Only text options here
 *       showCounter: true,
 *     }
 *   }
 * })
 *
 * f.boolean({
 *   label: "Published",
 *   meta: {
 *     admin: {
 *       displayAs: "switch",  // Only boolean options here
 *     }
 *   }
 * })
 * ```
 */

// Import from questpie to make this a module and enable augmentation
import "questpie";

// ============================================================================
// Module Augmentation - Each field gets its own admin options
// ============================================================================

declare module "questpie" {
	// ─────────────────────────────────────────────────────────────────────────
	// Text-based Fields
	// ─────────────────────────────────────────────────────────────────────────

	interface TextFieldMeta {
		admin?: TextFieldAdminMeta;
	}

	interface TextareaFieldMeta {
		admin?: TextareaFieldAdminMeta;
	}

	interface EmailFieldMeta {
		admin?: TextFieldAdminMeta; // Same as text
	}

	interface UrlFieldMeta {
		admin?: TextFieldAdminMeta; // Same as text
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Numeric Fields
	// ─────────────────────────────────────────────────────────────────────────

	interface NumberFieldMeta {
		admin?: NumberFieldAdminMeta;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Boolean Field
	// ─────────────────────────────────────────────────────────────────────────

	interface BooleanFieldMeta {
		admin?: BooleanFieldAdminMeta;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Date/Time Fields
	// ─────────────────────────────────────────────────────────────────────────

	interface DateFieldMeta {
		admin?: DateFieldAdminMeta;
	}

	interface DatetimeFieldMeta {
		admin?: DateFieldAdminMeta; // Same as date
	}

	interface TimeFieldMeta {
		admin?: TimeFieldAdminMeta;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Select Field
	// ─────────────────────────────────────────────────────────────────────────

	interface SelectFieldMeta {
		admin?: SelectFieldAdminMeta;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Relation Field
	// ─────────────────────────────────────────────────────────────────────────

	interface RelationFieldMeta {
		admin?: RelationFieldAdminMeta;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Complex Fields (Object, Array, JSON)
	// ─────────────────────────────────────────────────────────────────────────

	interface ObjectFieldMeta {
		admin?: ObjectFieldAdminMeta;
	}

	interface ArrayFieldMeta {
		admin?: ArrayFieldAdminMeta;
	}

	interface JsonFieldMeta {
		admin?: JsonFieldAdminMeta;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Upload Field
	// ─────────────────────────────────────────────────────────────────────────

	interface UploadFieldMeta {
		admin?: UploadFieldAdminMeta;
	}
}

// ============================================================================
// Shared Admin Options (common across field types)
// ============================================================================

/**
 * Common admin options shared by all fields.
 * Each field-specific admin meta extends this.
 */
export interface BaseAdminMeta {
	/**
	 * Field width in form (CSS value or number for pixels).
	 * @example "100%" | 400 | "50%"
	 */
	width?: string | number;

	/**
	 * Column span in grid layout (1-12).
	 * @default 12
	 */
	colspan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

	/**
	 * Field group for form organization.
	 */
	group?: string;

	/**
	 * Display order within group.
	 */
	order?: number;

	/**
	 * Always hide the field.
	 */
	hidden?: boolean;

	/**
	 * Always make the field read-only.
	 */
	readOnly?: boolean;

	/**
	 * Always disable the field.
	 */
	disabled?: boolean;

	/**
	 * Show this field in list view columns.
	 */
	showInList?: boolean;

	/**
	 * Column width in list view.
	 */
	listWidth?: string | number;

	/**
	 * Enable sorting by this field.
	 */
	sortable?: boolean;

	/**
	 * Enable filtering by this field.
	 */
	filterable?: boolean;
}

// ============================================================================
// Field-Specific Admin Options
// ============================================================================

/**
 * Text field admin options
 */
export interface TextFieldAdminMeta extends BaseAdminMeta {
	placeholder?: string;
	showCounter?: boolean;
	prefix?: string;
	suffix?: string;
	inputType?: "text" | "email" | "url" | "tel" | "search" | "password";
}

/**
 * Textarea field admin options
 */
export interface TextareaFieldAdminMeta extends BaseAdminMeta {
	placeholder?: string;
	rows?: number;
	autoResize?: boolean;
	richText?: boolean;
	showCounter?: boolean;
}

/**
 * Number field admin options
 */
export interface NumberFieldAdminMeta extends BaseAdminMeta {
	placeholder?: string;
	showButtons?: boolean;
	step?: number;
}

/**
 * Boolean field admin options
 */
export interface BooleanFieldAdminMeta extends BaseAdminMeta {
	displayAs?: "checkbox" | "switch";
}

/**
 * Date field admin options
 */
export interface DateFieldAdminMeta extends BaseAdminMeta {
	placeholder?: string;
}

/**
 * Time field admin options
 */
export interface TimeFieldAdminMeta extends BaseAdminMeta {
	placeholder?: string;
}

/**
 * Select field admin options
 */
export interface SelectFieldAdminMeta extends BaseAdminMeta {
	displayAs?: "dropdown" | "radio" | "checkbox" | "buttons";
	searchable?: boolean;
	creatable?: boolean;
	clearable?: boolean;
}

/**
 * Relation field admin options
 */
export interface RelationFieldAdminMeta extends BaseAdminMeta {
	displayAs?: "select" | "table" | "cards" | "list";
	displayFields?: string[];
	titleField?: string;
	allowCreate?: boolean;
	allowEdit?: boolean;
	preload?: boolean;
	maxItems?: number;
}

/**
 * Object field admin options
 */
export interface ObjectFieldAdminMeta extends BaseAdminMeta {
	displayAs?: "card" | "section" | "inline";
	collapsible?: boolean;
	defaultCollapsed?: boolean;
}

/**
 * Array field admin options
 */
export interface ArrayFieldAdminMeta extends BaseAdminMeta {
	displayAs?: "list" | "table" | "cards";
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	addLabel?: string;
	emptyMessage?: string;
	maxItems?: number;
}

/**
 * JSON field admin options
 */
export interface JsonFieldAdminMeta extends BaseAdminMeta {
	/** Show as code editor */
	codeEditor?: boolean;
}

/**
 * Upload field admin options
 */
export interface UploadFieldAdminMeta extends BaseAdminMeta {
	accept?: string;
	dropzoneText?: string;
}

// ============================================================================
// Union type for all admin metas (useful for generic handling)
// ============================================================================

export type AnyAdminMeta =
	| TextFieldAdminMeta
	| TextareaFieldAdminMeta
	| NumberFieldAdminMeta
	| BooleanFieldAdminMeta
	| DateFieldAdminMeta
	| TimeFieldAdminMeta
	| SelectFieldAdminMeta
	| RelationFieldAdminMeta
	| ObjectFieldAdminMeta
	| ArrayFieldAdminMeta
	| JsonFieldAdminMeta
	| UploadFieldAdminMeta;
