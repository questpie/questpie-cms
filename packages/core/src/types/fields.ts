import type { DataModel } from "@qcms-convex/_generated/dataModel";
import type { FieldLabelType } from "@qcms/core/types/mics";
import type { GenericQueryCtx } from "convex/server";
import type z from "zod";

/**
 * Field types that can be used in collection definitions
 * These are shared between client and server
 */
export type FieldType =
	| "text"
	| "textarea"
	| "email"
	| "url"
	| "password"
	| "number"
	| "slider"
	| "range"
	| "boolean"
	| "date" // only date
	| "dateTime" // date and time
	| "time" // only time
	| "richText" // tiptap editor
	| "select" // select between one value, can have aultiple designs
	| "multiselect" // select multiple values
	| "relation"
	| "relationMany" // relation to many items
	| "upload" // special relation field to other upload collection
	| "uploadMany" // special relation field to many items in upload collection
	| "geopoint"
	| "group" // Nested object
	| "array" // Array of items
	| "json"; // Arbitrary JSON data

/**
 * Base field configuration (shared - can be used on client)
 */
export interface BaseFieldConfig {
	type: FieldType;
	label?: FieldLabelType;
	description?: FieldLabelType;
	required?: boolean;
	defaultValue?: any;

	// UI hints (for form generation)
	placeholder?: string;
	helperText?: string;

	// Special zod schema defining validation rules eg email, min/max, regex, etc.
	schema?: z.ZodType<any>;
}

/**
 * Field-specific configurations
 */
export interface TextField extends BaseFieldConfig {
	type: "text";
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
}

export interface TextareaField extends BaseFieldConfig {
	type: "textarea";
	minLength?: number;
	maxLength?: number;
	rows?: number;
}

export interface EmailField extends BaseFieldConfig {
	type: "email";
}

export interface UrlField extends BaseFieldConfig {
	type: "url";
}

export interface PasswordField extends BaseFieldConfig {
	type: "password";
	minLength?: number;
	requireUppercase?: boolean;
	requireLowercase?: boolean;
	requireNumber?: boolean;
	requireSpecial?: boolean;
}

export interface NumberField extends BaseFieldConfig {
	type: "number";
	min?: number;
	max?: number;
	step?: number;
}

export interface BooleanField extends BaseFieldConfig {
	type: "boolean";
	variant?: "checkbox" | "switch";
}

export interface SliderField extends BaseFieldConfig {
	type: "slider";
	min: number;
	max: number;
	step?: number;
	showValue?: boolean; // Show current value
	marks?: Array<{ value: number; label?: string }>; // Slider marks
}

export interface RangeField extends BaseFieldConfig {
	type: "range";
	min: number;
	max: number;
	step?: number;
	showValue?: boolean; // Show current value
	marks?: Array<{ value: number; label?: string }>; // Slider marks
}

export interface DateField extends BaseFieldConfig {
	type: "date";
}
export interface DateTimeField extends BaseFieldConfig {
	type: "dateTime";
}
export interface TimeField extends BaseFieldConfig {
	type: "time";
}

export interface RichTextField extends BaseFieldConfig {
	type: "richText";
}

export interface SelectField extends BaseFieldConfig {
	type: "select";
	// if is dynamic is true, options are fetched from server, can leave empty or add fallback options
	options: Array<{ label: string; value: string }>;
	isDynamic?: boolean; // If true, options are fetched from server
}

export interface MultiSelectField extends BaseFieldConfig {
	type: "multiselect";
	options: Array<{ label: string; value: string }>;
	min?: number; // Minimum number of selections
	isDynamic?: boolean; // If true, options are fetched from server
	max?: number; // Maximum number of selections
}

export interface RelationField extends BaseFieldConfig {
	type: "relation";
	collection: string; // Name of the related collection
}

export interface RelationManyField extends BaseFieldConfig {
	type: "relationMany";
	collection: string; // Name of the related collection
	min?: number; // Minimum number of related items
	max?: number; // Maximum number of related items
}

export interface UploadField extends BaseFieldConfig {
	type: "upload";
	collection: string; // Name of the upload collection
	mimeTypes?: string[]; // Allowed mime types
}

export interface UploadManyField extends BaseFieldConfig {
	type: "uploadMany";
	mimeTypes?: string[]; // Allowed mime types
	collection: string; // Name of the upload collection
	min?: number; // Minimum number of files
	max?: number; // Maximum number of files
}

export interface GeopointField extends BaseFieldConfig {
	type: "geopoint";
}

export interface GroupField extends BaseFieldConfig {
	type: "group";
	fields: Record<string, FieldConfig>; // Nested fields
}

export interface ArrayField extends BaseFieldConfig {
	type: "array";
	// Array item type - can be a primitive or nested field config
	fields: Record<string, FieldConfig>;
	min?: number; // Minimum array length
	max?: number; // Maximum array length
}

export interface JsonField extends BaseFieldConfig {
	type: "json";
}

export type FieldConfig =
	| TextField
	| TextareaField
	| EmailField
	| UrlField
	| PasswordField
	| NumberField
	| SliderField
	| RangeField
	| BooleanField
	| DateField
	| DateTimeField
	| TimeField
	| RichTextField
	| SelectField
	| MultiSelectField
	| RelationField
	| RelationManyField
	| UploadField
	| UploadManyField
	| GeopointField
	| GroupField
	| ArrayField
	| JsonField;

export type FieldsRecord = {
	[key: string]: FieldConfig;
};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

type RecursionDepth = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type FlattenFields<
	T extends FieldsRecord,
	Prefix extends string = "",
	Depth extends number = 10,
> = [Depth] extends [0]
	? never
	: {
			[K in keyof T]: T[K] extends GroupField
				?
						| { [P in `${Prefix}${K & string}`]: T[K] }
						| FlattenFields<
								T[K]["fields"],
								`${Prefix}${K & string}.`,
								RecursionDepth[Depth]
						  >
				: T[K] extends ArrayField
					?
							| { [P in `${Prefix}${K & string}`]: T[K] }
							| FlattenFields<
									T[K]["fields"],
									`${Prefix}${K & string}.`,
									RecursionDepth[Depth]
							  >
					: { [P in `${Prefix}${K & string}`]: T[K] };
		}[keyof T];

export type GetFieldRecordsPaths<TFields extends FieldsRecord> =
	UnionToIntersection<FlattenFields<TFields>>;

export type GetFieldConfigFromPath<
	TFields extends FieldsRecord,
	TPath extends string,
> = TPath extends keyof GetFieldRecordsPaths<TFields>
	? GetFieldRecordsPaths<TFields>[TPath]
	: never;

export type GetFieldType<T extends FieldConfig> = T extends
	| TextField
	| TextareaField
	| EmailField
	| UrlField
	| PasswordField
	| RichTextField
	| SelectField
	| DateField
	| DateTimeField
	| TimeField
	| RelationField
	| UploadField
	? string
	: T extends NumberField | SliderField | RangeField
		? number
		: T extends BooleanField
			? boolean
			: T extends MultiSelectField | RelationManyField | UploadManyField
				? string[]
				: T extends GeopointField
					? { lat: number; lng: number }
					: T extends GroupField
						? GetShape<T["fields"]>
						: T extends ArrayField
							? Array<GetShape<T["fields"]>>
							: unknown;

export type GetShape<T extends FieldsRecord> = {
	[K in keyof T]: T[K]["required"] extends true
		? GetFieldType<T[K]>
		: GetFieldType<T[K]> | undefined;
};

type BaseServerFieldConfig = {
	// TODO: add something
};

export type OptionsLoaderArgs = {
	query?: string;
	paginationOpts?: any;
	ctx: GenericQueryCtx<DataModel>;
};

export type OptionsLoaderResult = {
	page: Array<{ label: string; value: string }>;
	isDone: boolean;
	continueCursor: string;
};

export type OptionsLoader = (
	args: OptionsLoaderArgs,
) => Promise<OptionsLoaderResult>;

export type ServerFieldConfig<TFieldConfig extends FieldConfig> =
	BaseServerFieldConfig & TFieldConfig["type"] extends "select" | "multiselect"
		? {
				getOptions?: OptionsLoader;
			}
		: {};
