/**
 * Component Registry
 *
 * Centralized registry for custom field components, layouts, and UI overrides
 */

import type * as React from "react";

/**
 * Base props for all field components
 */
export interface FieldComponentProps<TValue = any> {
	name: string;
	value: TValue;
	onChange: (value: TValue) => void;
	onBlur?: () => void;
	disabled?: boolean;
	readOnly?: boolean;
	error?: string;
	label?: string;
	description?: string;
	placeholder?: string;
	required?: boolean;
	localized?: boolean;
	locale?: string;
	// Field metadata from CMS schema
	fieldMeta?: {
		type: string;
		nullable?: boolean;
		default?: any;
		// Drizzle column config
		column?: any;
	};
}

/**
 * Relation field props
 */
export interface RelationFieldProps extends FieldComponentProps {
	/**
	 * Target collection name
	 */
	targetCollection: string;

	/**
	 * Relation type
	 */
	relationType: "one" | "many";

	/**
	 * How to display selected options
	 */
	optionLabel?: (item: any) => string;

	/**
	 * Custom option loader
	 */
	loadOptions?: () => Promise<any[]>;

	/**
	 * UI mode
	 */
	mode?: "picker" | "inline" | "create";
}

/**
 * Embedded collection field props
 */
export interface EmbeddedCollectionProps extends FieldComponentProps {
	/**
	 * Embedded collection name
	 */
	collection: string;

	/**
	 * Display mode
	 */
	mode?: "inline" | "modal" | "drawer";

	/**
	 * Can reorder items
	 */
	orderable?: boolean;

	/**
	 * Row label generator
	 */
	rowLabel?: (item: any) => string;
}

/**
 * Component registry type
 */
export interface ComponentRegistry {
	/**
	 * Field components by type
	 */
	fields?: {
		// Basic types
		text?: React.ComponentType<FieldComponentProps<string>>;
		textarea?: React.ComponentType<FieldComponentProps<string>>;
		number?: React.ComponentType<FieldComponentProps<number>>;
		boolean?: React.ComponentType<FieldComponentProps<boolean>>;
		date?: React.ComponentType<FieldComponentProps<Date>>;
		datetime?: React.ComponentType<FieldComponentProps<Date>>;
		array?: React.ComponentType<FieldComponentProps<any[]>>;

		// Advanced types
		richText?: React.ComponentType<FieldComponentProps<any>>;
		markdown?: React.ComponentType<FieldComponentProps<string>>;
		code?: React.ComponentType<FieldComponentProps<string>>;
		json?: React.ComponentType<FieldComponentProps<any>>;
		color?: React.ComponentType<FieldComponentProps<string>>;

		// Relations
		relation?: React.ComponentType<RelationFieldProps>;
		relationMany?: React.ComponentType<RelationFieldProps>;

		// Embedded
		embedded?: React.ComponentType<EmbeddedCollectionProps>;

		// File upload
		file?: React.ComponentType<FieldComponentProps<string>>;
		image?: React.ComponentType<FieldComponentProps<string>>;
		gallery?: React.ComponentType<FieldComponentProps<string[]>>;
	};

	/**
	 * Layout components
	 */
	layouts?: {
		shell?: React.ComponentType<any>;
		sidebar?: React.ComponentType<any>;
		header?: React.ComponentType<any>;
		footer?: React.ComponentType<any>;
	};

	/**
	 * Custom components (user-defined)
	 */
	custom?: Record<string, React.ComponentType<any>>;
}

/**
 * Default component registry
 * These are the built-in components from @questpie/admin
 */
export const defaultComponentRegistry: ComponentRegistry = {
	fields: {
		// Will be populated with default components
		// text: DefaultTextInput,
		// textarea: DefaultTextarea,
		// etc.
	},
	layouts: {},
	custom: {},
};

/**
 * Merge user registry with defaults
 */
export function mergeComponentRegistry(
	userRegistry?: Partial<ComponentRegistry>,
): ComponentRegistry {
	return {
		fields: {
			...defaultComponentRegistry.fields,
			...userRegistry?.fields,
		},
		layouts: {
			...defaultComponentRegistry.layouts,
			...userRegistry?.layouts,
		},
		custom: {
			...defaultComponentRegistry.custom,
			...userRegistry?.custom,
		},
	};
}

/**
 * Get component from registry by key
 */
export function getComponent(
	registry: ComponentRegistry,
	type: "fields" | "layouts" | "custom",
	key: string,
): React.ComponentType<any> | undefined {
	return registry[type]?.[key as keyof typeof registry[typeof type]];
}
