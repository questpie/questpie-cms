/**
 * AutoFormFields Component
 *
 * Automatically generates form fields from:
 * 1. CMS schema (Drizzle columns)
 * 2. Admin config (field overrides, layout, sections, tabs)
 *
 * Replaces manual field definitions!
 */

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { FormField } from "./form-field";
import type { FormFieldProps } from "./form-field";
import { RelationSelect } from "../fields/relation-select";
import { RelationPicker } from "../fields/relation-picker";
import { RichTextEditor } from "../fields/rich-text-editor";
import { EmbeddedCollectionField } from "../fields/embedded-collection";
import { ArrayField } from "../fields/array-field";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "../../utils";
import { useAdminContext } from "../../hooks/admin-provider";
import type { QCMS } from "@questpie/cms/server";
import type {
	EditConfig,
	FieldConfig,
	FieldLayout,
	SectionConfig,
	SectionLayout,
	TabConfig,
} from "../../config";
import type { ComponentRegistry } from "../../config/component-registry";

type ValueResolver<T> = T | ((values: any) => T);
type CollectionConfig = { edit?: EditConfig; fields?: Record<string, FieldConfig> };

export interface AutoFormFieldsProps<
	T extends QCMS<any, any, any>,
	K extends string,
> {
	/**
	 * CMS instance (for schema introspection)
	 */
	cms?: T;

	/**
	 * Collection name
	 */
	collection: K;

	/**
	 * Admin config for this collection
	 */
	config?: CollectionConfig;

	/**
	 * Component registry for custom field types
	 */
	registry?: ComponentRegistry;

	/**
	 * Custom field renderer (fallback)
	 */
	renderField?: (fieldName: string, fieldConfig?: FieldConfig) => React.ReactNode;

	/**
	 * Field name prefix for nested fields
	 */
	fieldPrefix?: string;

	/**
	 * All collection configs (for embedded collections)
	 */
	allCollectionsConfig?: Record<string, CollectionConfig>;
}

/**
 * Get default fields for a collection
 * This would come from CMS schema introspection
 */
function getDefaultFields(collection: string): string[] {
	// TODO: Extract from CMS schema
	// For now, return common pattern
	const commonFields = {
		barbers: ["name", "email", "phone", "bio", "avatar", "isActive"],
		services: ["name", "description", "duration", "price", "isActive"],
		appointments: [
			"customerId",
			"barberId",
			"serviceId",
			"scheduledAt",
			"status",
			"notes",
		],
		reviews: ["appointmentId", "rating", "comment"],
	};

	return commonFields[collection as keyof typeof commonFields] || [];
}

function getFormValues(form: any, fieldPrefix?: string) {
	if (!form?.watch) return {};
	const values = fieldPrefix ? form.watch(fieldPrefix) : form.watch();
	return values ?? {};
}

function getFullFieldName(fieldName: string, fieldPrefix?: string) {
	return fieldPrefix ? `${fieldPrefix}.${fieldName}` : fieldName;
}

function resolveValue<T>(
	value: ValueResolver<T> | undefined,
	formValues: any,
	defaultValue: T,
): T {
	if (value === undefined) return defaultValue;
	if (typeof value === "function") {
		return (value as (values: any) => T)(formValues);
	}
	return value;
}

function resolveOptions(
	options:
		| Array<{ label: string; value: any }>
		| ((values: any) => Array<{ label: string; value: any }>)
		| undefined,
	formValues: any,
) {
	if (!options) return undefined;
	if (typeof options === "function") {
		return options(formValues);
	}
	return options;
}

function resolveRelationTarget(relationConfig?: FieldConfig["relation"]) {
	return relationConfig?.targetCollection;
}

type FieldContext = {
	fieldName: string;
	fullFieldName: string;
	collection: string;
	fieldConfig?: FieldConfig;
	fieldValue: any;
	label: string;
	description?: string;
	placeholder?: string;
	options?: Array<{ label: string; value: any }>;
	isVisible: boolean;
	isReadOnly: boolean;
	isDisabled: boolean;
	isRequired: boolean;
	isLocalized: boolean;
	locale?: string;
	fieldError?: string;
	updateValue: (nextValue: any) => void;
	type?: string;
};

function getFieldContext({
	fieldName,
	fieldConfig,
	collection,
	form,
	fieldPrefix,
	locale,
}: {
	fieldName: string;
	fieldConfig?: FieldConfig;
	collection: string;
	form: any;
	fieldPrefix?: string;
	locale?: string;
}): FieldContext {
	const formValues = getFormValues(form, fieldPrefix);
	const fullFieldName = getFullFieldName(fieldName, fieldPrefix);
	const fieldState = form?.getFieldState
		? form.getFieldState(fullFieldName)
		: undefined;
	const fieldError = fieldState?.error?.message;
	const fieldValue = formValues[fieldName];

	const label = fieldConfig?.label || fieldName;
	const description = fieldConfig?.description;
	const placeholder = fieldConfig?.placeholder;

	const isVisible = resolveValue(fieldConfig?.visible, formValues, true);
	const isReadOnly = resolveValue(fieldConfig?.readOnly, formValues, false);
	const isDisabled = resolveValue(fieldConfig?.disabled, formValues, false);
	const isRequired = resolveValue(fieldConfig?.required, formValues, false);
	const options = resolveOptions(fieldConfig?.options, formValues);
	const isLocalized = !!fieldConfig?.localized;

	const type = fieldConfig?.type;

	const updateValue = (nextValue: any) => {
		if (form?.setValue) {
			form.setValue(fullFieldName, nextValue, {
				shouldDirty: true,
				shouldTouch: true,
			});
		}
	};

	return {
		fieldName,
		fullFieldName,
		collection,
		fieldConfig,
		fieldValue,
		label,
		description,
		placeholder,
		options,
		isVisible,
		isReadOnly,
		isDisabled,
		isRequired,
		isLocalized,
		locale,
		fieldError,
		updateValue,
		type,
	};
}

function buildComponentProps(context: FieldContext) {
	return {
		key: context.fullFieldName,
		name: context.fullFieldName,
		value: context.fieldValue,
		onChange: context.updateValue,
		label: context.label,
		description: context.description,
		placeholder: context.placeholder,
		required: context.isRequired,
		disabled: context.isDisabled,
		readOnly: context.isReadOnly,
		error: context.fieldError,
		localized: context.isLocalized,
		locale: context.locale,
	};
}

function buildRelationProps(context: FieldContext) {
	return {
		label: context.label,
		required: context.isRequired,
		disabled: context.isDisabled,
		readOnly: context.isReadOnly,
		placeholder: context.placeholder,
		error: context.fieldError,
		localized: context.isLocalized,
		locale: context.locale,
	};
}

function buildFormFieldProps(context: FieldContext): FormFieldProps {
	return {
		key: context.fullFieldName,
		name: context.fullFieldName,
		label: context.label,
		description: context.description,
		placeholder: context.placeholder,
		required: context.isRequired,
		disabled: context.isDisabled || context.isReadOnly,
		localized: context.isLocalized,
		locale: context.locale,
	};
}

function renderConfigError(message: string) {
	return (
		<div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
			{message}
		</div>
	);
}

function renderFormField(
	formFieldProps: FormFieldProps,
	type?: FormFieldProps["type"],
	extra?: Partial<FormFieldProps>,
) {
	return (
		<FormField
			{...formFieldProps}
			type={type}
			{...extra}
		/>
	);
}

function renderCustomComponent({
	context,
	registry,
	componentProps,
}: {
	context: FieldContext;
	registry?: ComponentRegistry;
	componentProps: ReturnType<typeof buildComponentProps>;
}) {
	const component = context.fieldConfig?.component;
	if (!component) return null;
	const CustomComponent =
		typeof component === "string"
			? registry?.fields?.[component] || registry?.custom?.[component]
			: component;
	if (!CustomComponent) return null;
	return <CustomComponent {...componentProps} />;
}

function renderRelationField({
	context,
	relationProps,
	formFieldProps,
}: {
	context: FieldContext;
	relationProps: ReturnType<typeof buildRelationProps>;
	formFieldProps: FormFieldProps;
}) {
	const relationConfig = context.fieldConfig?.relation;
	const shouldRender = context.type === "relation" || !!relationConfig;
	if (!shouldRender) return null;

	if (!relationConfig) {
		return renderConfigError(
			`Missing relation config for "${context.fieldName}". Define relation.targetCollection.`,
		);
	}

	const targetCollection = resolveRelationTarget(relationConfig);

	if (!targetCollection) {
		return renderConfigError(
			`Missing relation.targetCollection for "${context.fieldName}".`,
		);
	}

	const baseRelationProps = {
		key: context.fullFieldName,
		name: context.fullFieldName,
		targetCollection,
		filter: relationConfig?.filter,
		renderFormFields: undefined,
		...relationProps,
	};

	const isMultiple = relationConfig?.mode === "picker" ||
		Array.isArray(context.fieldValue);

	if (isMultiple) {
		return (
			<RelationPicker
				{...baseRelationProps}
				value={context.fieldValue || []}
				onChange={context.updateValue}
				orderable={relationConfig?.orderable}
			/>
		);
	}

	return (
		<RelationSelect
			{...baseRelationProps}
			value={context.fieldValue}
			onChange={context.updateValue}
		/>
	);
}

function renderEmbeddedField({
	context,
	registry,
	allCollectionsConfig,
	componentProps,
}: {
	context: FieldContext;
	registry?: ComponentRegistry;
	allCollectionsConfig?: Record<string, CollectionConfig>;
	componentProps: ReturnType<typeof buildComponentProps>;
}) {
	const embeddedConfig = context.fieldConfig?.embedded;
	if (!embeddedConfig) return null;

	const embeddedCollection = embeddedConfig.collection;
	const embeddedCollectionConfig = embeddedCollection
		? allCollectionsConfig?.[embeddedCollection]
		: undefined;
	const EmbeddedComponent =
		(registry?.fields?.embedded || EmbeddedCollectionField) as React.ComponentType<any>;

	return (
		<EmbeddedComponent
			{...componentProps}
			value={context.fieldValue || []}
			collection={embeddedCollection}
			mode={embeddedConfig?.mode}
			orderable={embeddedConfig?.orderable}
			rowLabel={embeddedConfig?.rowLabel}
			renderFields={(index: number) =>
				embeddedCollection ? (
					<AutoFormFields
						collection={embeddedCollection}
						config={embeddedCollectionConfig}
						registry={registry}
						fieldPrefix={`${context.fullFieldName}.${index}`}
						allCollectionsConfig={allCollectionsConfig}
					/>
				) : null
			}
		/>
	);
}

function renderArrayField({
	context,
	registry,
	componentProps,
}: {
	context: FieldContext;
	registry?: ComponentRegistry;
	componentProps: ReturnType<typeof buildComponentProps>;
}) {
	const arrayConfig = context.fieldConfig?.array;
	const shouldRender = context.type === "array" || !!arrayConfig;
	if (!shouldRender) return null;

	const ArrayComponent =
		(registry?.fields?.array || ArrayField) as React.ComponentType<any>;
	const config = arrayConfig || {};

	return (
		<ArrayComponent
			{...componentProps}
			value={context.fieldValue || []}
			placeholder={config.placeholder ?? context.placeholder}
			itemType={config.itemType}
			options={config.options || context.options}
			orderable={config.orderable}
			minItems={config.minItems}
			maxItems={config.maxItems}
		/>
	);
}

function renderRichTextField({
	context,
	registry,
	componentProps,
}: {
	context: FieldContext;
	registry?: ComponentRegistry;
	componentProps: ReturnType<typeof buildComponentProps>;
}) {
	if (context.type !== "richText") return null;
	const RichTextComponent = registry?.fields?.richText || RichTextEditor;
	return (
		<RichTextComponent
			{...componentProps}
			{...context.fieldConfig?.richText}
		/>
	);
}

function renderPrimitiveField({
	context,
	formFieldProps,
}: {
	context: FieldContext;
	formFieldProps: FormFieldProps;
}) {
	if (!context.type) {
		return renderConfigError(
			`Missing field type for "${context.fieldName}". Define it in admin config.`,
		);
	}
	if (context.type === "boolean") {
		return renderFormField(formFieldProps, "switch");
	}
	if (context.type === "select" && context.options) {
		return renderFormField(formFieldProps, "select", { options: context.options });
	}
	return renderFormField(formFieldProps, context.type as FormFieldProps["type"]);
}

/**
 * Render a single field with conditional logic
 */
function FieldRenderer({
	fieldName,
	fieldConfig,
	collection,
	registry,
	fieldPrefix,
	allCollectionsConfig,
}: {
	fieldName: string;
	fieldConfig?: FieldConfig;
	collection: string;
	registry?: ComponentRegistry;
	fieldPrefix?: string;
	allCollectionsConfig?: Record<string, CollectionConfig>;
}) {
	// Get current form values for conditional rendering
	const form = useFormContext() as any;
	const { locale } = useAdminContext<any>();
	const context = getFieldContext({
		fieldName,
		fieldConfig,
		collection,
		form,
		fieldPrefix,
		locale,
	});

	if (!context.isVisible) return null;

	const componentProps = buildComponentProps(context);
	const relationProps = buildRelationProps(context);
	const formFieldProps = buildFormFieldProps(context);

	const renderers = [
		() =>
			renderCustomComponent({
				context,
				registry,
				componentProps,
			}),
		() =>
			renderRelationField({
				context,
				relationProps,
				formFieldProps,
			}),
		() =>
			renderEmbeddedField({
				context,
				registry,
				allCollectionsConfig,
				componentProps,
			}),
		() =>
			renderArrayField({
				context,
				registry,
				componentProps,
			}),
		() =>
			renderRichTextField({
				context,
				registry,
				componentProps,
			}),
		() =>
			renderPrimitiveField({
				context,
				formFieldProps,
			}),
	];

	for (const render of renderers) {
		const node = render();
		if (node) return node;
	}

	return null;
}

const gridColumnClasses: Record<number, string> = {
	1: "grid-cols-1",
	2: "grid-cols-2",
	3: "grid-cols-3",
	4: "grid-cols-4",
	5: "grid-cols-5",
	6: "grid-cols-6",
	7: "grid-cols-7",
	8: "grid-cols-8",
	9: "grid-cols-9",
	10: "grid-cols-10",
	11: "grid-cols-11",
	12: "grid-cols-12",
};

function getGridColumnsClass(columns?: number, prefix?: "sm" | "md" | "lg") {
	if (!columns) return "";
	const base = gridColumnClasses[columns];
	if (!base) return "";
	return prefix ? `${prefix}:${base}` : base;
}

function getGapStyle(gap?: number) {
	if (gap === undefined) return undefined;
	return `${gap * 0.25}rem`;
}

function normalizeSectionFields(fields: string[] | FieldLayout[]): FieldLayout[] {
	if (!fields?.length) return [];
	if (typeof fields[0] === "string") {
		return (fields as string[]).map((field) => ({ field }));
	}
	return fields as FieldLayout[];
}

function resolveSpan(span: string | number | undefined, columns: number) {
	if (!span) return undefined;
	if (typeof span === "number") return Math.max(1, Math.min(columns, span));
	if (span === "full") return columns;
	const fractions: Record<string, number> = {
		"1/2": 0.5,
		"1/3": 1 / 3,
		"2/3": 2 / 3,
		"1/4": 0.25,
		"3/4": 0.75,
	};
	const fraction = fractions[span];
	if (!fraction) return undefined;
	return Math.max(1, Math.round(columns * fraction));
}

/**
 * AutoFormFields Component
 */
export function AutoFormFields<T extends QCMS<any, any, any>, K extends string>({
	cms: _cms,
	collection,
	config,
	registry,
	renderField,
	fieldPrefix,
	allCollectionsConfig,
}: AutoFormFieldsProps<T, K>): React.ReactElement {
	const form = useFormContext() as any;
	const formValues = getFormValues(form, fieldPrefix);

	// Get field order
	const fieldOrder =
		config?.edit?.fields || getDefaultFields(collection as string);

	const excludedFields = new Set(config?.edit?.exclude || []);
	const sidebarFieldSet = new Set(config?.edit?.sidebar?.fields || []);

	const isFieldExcluded = React.useCallback(
		(fieldName: string) => {
			if (excludedFields.has(fieldName)) return true;
			const fieldConfig = config?.fields?.[fieldName];
			if (fieldConfig?.hidden) return true;
			return false;
		},
		[config?.fields, excludedFields],
	);

	const renderFieldNode = React.useCallback(
		(fieldName: string) => {
			if (isFieldExcluded(fieldName)) return null;
			const fieldConfig = config?.fields?.[fieldName];
			const fullFieldName = getFullFieldName(fieldName, fieldPrefix);
			if (renderField) {
				return renderField(fullFieldName, fieldConfig);
			}
			return (
				<FieldRenderer
					key={fullFieldName}
					fieldName={fieldName}
					fieldConfig={fieldConfig}
					collection={collection as string}
					registry={registry}
					fieldPrefix={fieldPrefix}
					allCollectionsConfig={allCollectionsConfig}
				/>
			);
		},
		[
			collection,
			config?.fields,
			fieldPrefix,
			isFieldExcluded,
			registry,
			renderField,
			allCollectionsConfig,
		],
	);

	const renderFieldLayout = React.useCallback(
		(
			field: FieldLayout,
			layout: SectionLayout,
			columns: number,
		) => {
			const fieldNode = renderFieldNode(field.field);
			if (!fieldNode) return null;

			const style: React.CSSProperties = {};
			if (layout === "columns" || layout === "grid") {
				const span = resolveSpan(field.span, columns);
				if (span) {
					style.gridColumn = `span ${span} / span ${span}`;
				}
				if (field.rowSpan) {
					style.gridRow = `span ${field.rowSpan} / span ${field.rowSpan}`;
				}
			}

			if (field.width) {
				style.width = field.width;
			}

			return (
				<div
					key={field.field}
					style={style}
					className={cn(
						layout === "inline" ? "min-w-[180px] flex-1" : "min-w-0",
					)}
				>
					{fieldNode}
				</div>
			);
		},
		[renderFieldNode],
	);

	const renderFieldsContainer = React.useCallback(
		(
			fields: FieldLayout[],
			layout: SectionLayout,
			columns: number,
			grid?: SectionConfig["grid"],
		) => {
			const normalizedFields = fields.filter(
				(field) => !isFieldExcluded(field.field),
			);
			if (!normalizedFields.length) return null;

			if (layout === "inline") {
				return (
					<div
						className="flex flex-wrap gap-4"
						style={{ gap: getGapStyle(grid?.gap) }}
					>
						{normalizedFields.map((field) =>
							renderFieldLayout(field, layout, columns),
						)}
					</div>
				);
			}

			if (layout === "columns" || layout === "grid") {
				const baseClass = getGridColumnsClass(columns);
				const gridClassName = cn(
					"grid gap-4",
					baseClass,
					getGridColumnsClass(grid?.responsive?.sm, "sm"),
					getGridColumnsClass(grid?.responsive?.md, "md"),
					getGridColumnsClass(grid?.responsive?.lg, "lg"),
				);
				const style: React.CSSProperties = {
					gap: getGapStyle(grid?.gap),
					...(baseClass
						? {}
						: {
								gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
							}),
				};

				return (
					<div className={gridClassName} style={style}>
						{normalizedFields.map((field) =>
							renderFieldLayout(field, layout, columns),
						)}
					</div>
				);
			}

			return (
				<div className="space-y-4">
					{normalizedFields.map((field) =>
						renderFieldLayout(field, layout, columns),
					)}
				</div>
			);
		},
		[isFieldExcluded, renderFieldLayout],
	);

	const renderSection = React.useCallback(
		(section: SectionConfig, index: number, excludedSet?: Set<string>) => {
			const isVisible = resolveValue(section.visible, formValues, true);

			if (!isVisible) return null;

			const sectionFields = normalizeSectionFields(section.fields).filter(
				(field) => !excludedSet?.has(field.field),
			);

			if (!sectionFields.length) return null;

			const layout = section.layout ?? "auto";
			const columns =
				layout === "columns"
					? section.columns || section.grid?.columns || 2
					: section.grid?.columns || section.columns || 1;
			const content = renderFieldsContainer(
				sectionFields,
				layout,
				columns,
				section.grid,
			);

			if (!content) return null;

			const header = section.title || section.description ? (
				<div>
					{section.title && (
						<h3 className="text-lg font-semibold">{section.title}</h3>
					)}
					{section.description && (
						<p className="text-sm text-muted-foreground">
							{section.description}
						</p>
					)}
				</div>
			) : null;

			if (section.collapsible) {
				const value = `section-${index}`;
				return (
					<Accordion
						key={value}
						type="single"
						collapsible={true}
						defaultValue={section.defaultOpen ? value : undefined}
					>
						<AccordionItem value={value}>
							<AccordionTrigger>{section.title || "Section"}</AccordionTrigger>
							<AccordionContent className="space-y-3 pt-2">
								{section.description && (
									<p className="text-sm text-muted-foreground">
										{section.description}
									</p>
								)}
								{content}
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				);
			}

			return (
				<div key={index} className={cn("space-y-4", section.className)}>
					{header}
					{content}
				</div>
			);
		},
		[formValues, renderFieldsContainer],
	);

	const renderSections = React.useCallback(
		(sections: SectionConfig[], excludedSet?: Set<string>) => {
			const renderedSections = sections
				.map((section, index) => renderSection(section, index, excludedSet))
				.filter(Boolean);

			if (!renderedSections.length) return null;

			return <div className="space-y-6">{renderedSections}</div>;
		},
		[renderSection],
	);

	const renderTabs = React.useCallback(
		(tabs: TabConfig[], excludedSet?: Set<string>) => {
			const visibleTabs = tabs.filter((tab) =>
				resolveValue(tab.visible, formValues, true),
			);

			if (!visibleTabs.length) return null;

			const defaultTab = visibleTabs[0]?.id;

			return (
				<Tabs defaultValue={defaultTab}>
					<TabsList variant="line">
						{visibleTabs.map((tab) => (
							<TabsTrigger key={tab.id} value={tab.id}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
					{visibleTabs.map((tab) => (
						<TabsContent key={tab.id} value={tab.id}>
							{tab.sections
								? renderSections(tab.sections, excludedSet)
								: renderFieldsContainer(
										normalizeSectionFields(tab.fields || []).filter(
											(field) => !excludedSet?.has(field.field),
										),
										"auto",
										1,
									)}
						</TabsContent>
					))}
				</Tabs>
			);
		},
		[formValues, renderFieldsContainer, renderSections],
	);

	const visibleFields = fieldOrder.filter(
		(fieldName) => !isFieldExcluded(fieldName),
	);

	const defaultContent =
		config?.edit?.tabs
			? renderTabs(config.edit.tabs, undefined)
			: config?.edit?.sections
				? renderSections(config.edit.sections, undefined)
				: renderFieldsContainer(
						normalizeSectionFields(visibleFields),
						"auto",
						1,
					);

	const isSidebarLayout =
		config?.edit?.layout === "with-sidebar" && sidebarFieldSet.size > 0;

	if (isSidebarLayout) {
		const sidebarFields = Array.from(sidebarFieldSet).filter(
			(fieldName) => !isFieldExcluded(fieldName),
		);
		const sidebarContent = renderFieldsContainer(
			normalizeSectionFields(sidebarFields),
			"auto",
			1,
		);
		const mainContent =
			config?.edit?.tabs
				? renderTabs(config.edit.tabs, sidebarFieldSet)
				: config?.edit?.sections
					? renderSections(config.edit.sections, sidebarFieldSet)
					: renderFieldsContainer(
							normalizeSectionFields(
								visibleFields.filter(
									(fieldName) => !sidebarFieldSet.has(fieldName),
								),
							),
							"auto",
							1,
						);

		const sidebarPosition = config?.edit?.sidebar?.position || "right";
		const sidebarWidth = config?.edit?.sidebar?.width || "280px";

		return (
			<div
				className={cn(
					"flex flex-col gap-6 lg:flex-row",
					sidebarPosition === "left" ? "lg:flex-row-reverse" : "",
				)}
			>
				<div className="min-w-0 flex-1">{mainContent}</div>
				{sidebarContent && (
					<aside
						className="rounded-md border bg-card p-4"
						style={{ width: sidebarWidth }}
					>
						<div className="space-y-4">{sidebarContent}</div>
					</aside>
				)}
			</div>
		);
	}

	return <div>{defaultContent}</div>;
}
