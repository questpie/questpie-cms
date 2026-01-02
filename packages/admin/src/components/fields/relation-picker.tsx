/**
 * RelationPicker Component
 *
 * Multiple relation field (one-to-many, many-to-many) with:
 * - Multi-select picker to choose existing items
 * - Plus button to create new related item (opens side sheet)
 * - Edit button on each selected item (opens side sheet)
 * - Remove button on each selected item
 * - Optional drag-and-drop reordering
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, X, GripVertical } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { Spinner } from "../ui/spinner";
import { LocaleBadge } from "./locale-badge";
import { Combobox } from "../ui/combobox";
import { useAdminContext } from "../../hooks/admin-provider";
import type { QCMS } from "@questpie/cms/server";

export interface RelationPickerProps<T extends QCMS<any, any, any>> {
	/**
	 * Field name
	 */
	name: string;

	/**
	 * Current value (array of IDs of related items)
	 */
	value?: string[] | null;

	/**
	 * Change handler
	 */
	onChange: (value: string[]) => void;

	/**
	 * Target collection name
	 */
	targetCollection: string;

	/**
	 * Label for the field
	 */
	label?: string;

	/**
	 * Localized field
	 */
	localized?: boolean;

	/**
	 * Active locale
	 */
	locale?: string;

	/**
	 * Filter options based on form values
	 */
	filter?: (formValues: any) => any;

	/**
	 * Is the field required
	 */
	required?: boolean;

	/**
	 * Is the field disabled
	 */
	disabled?: boolean;

	/**
	 * Is the field readonly
	 */
	readOnly?: boolean;

	/**
	 * Placeholder text
	 */
	placeholder?: string;

	/**
	 * Error message
	 */
	error?: string;

	/**
	 * Enable drag-and-drop reordering
	 */
	orderable?: boolean;

	/**
	 * Maximum number of items
	 */
	maxItems?: number;

	/**
	 * Custom render function for selected items
	 */
	renderItem?: (item: any, index: number) => React.ReactNode;

	/**
	 * Custom render function for dropdown options
	 */
	renderOption?: (item: any) => React.ReactNode;

	/**
	 * Form fields to render in create/edit sheet
	 */
	renderFormFields?: (collection: string, itemId?: string) => React.ReactNode;
}

export function RelationPicker<T extends QCMS<any, any, any>>({
	name,
	value = [],
	onChange,
	targetCollection,
	label,
	filter,
	required,
	disabled,
	readOnly,
	placeholder,
	error,
	localized,
	locale,
	orderable = false,
	maxItems,
	renderItem,
	renderOption,
	renderFormFields,
}: RelationPickerProps<T>) {
	const { client, locale } = useAdminContext<T>();
	const localeKey = locale ?? "default";
	const [isSheetOpen, setIsSheetOpen] = React.useState(false);
	const [sheetMode, setSheetMode] = React.useState<"create" | "edit">("create");
	const [editingItemId, setEditingItemId] = React.useState<string | undefined>();

	const selectedIds = value || [];

	// Fetch all available options
	const { data: allOptions, isLoading } = useQuery({
		queryKey: ["relation", targetCollection, localeKey, filter],
		queryFn: async () => {
			const result = await client.collections[targetCollection].list({
				...(filter ? filter({}) : {}), // TODO: Get actual form values
			});
			return result.data || [];
		},
	});

	// Fetch selected items details
	const { data: selectedItems } = useQuery({
		queryKey: ["relation", targetCollection, localeKey, "selected", selectedIds],
		queryFn: async () => {
			if (!selectedIds.length) return [];
			// Fetch all selected items
			const items = await Promise.all(
				selectedIds.map((id) => client.collections[targetCollection].get(id))
			);
			return items;
		},
		enabled: selectedIds.length > 0,
	});

	const handleAdd = (itemId: string) => {
		if (selectedIds.includes(itemId)) return;
		if (maxItems && selectedIds.length >= maxItems) return;
		onChange([...selectedIds, itemId]);
	};

	const handleRemove = (itemId: string) => {
		onChange(selectedIds.filter((id) => id !== itemId));
	};

	const handleOpenCreate = () => {
		setSheetMode("create");
		setEditingItemId(undefined);
		setIsSheetOpen(true);
	};

	const handleOpenEdit = (itemId: string) => {
		setSheetMode("edit");
		setEditingItemId(itemId);
		setIsSheetOpen(true);
	};

	const handleSheetClose = () => {
		setIsSheetOpen(false);
		setEditingItemId(undefined);
	};

	const getDisplayValue = (item: any) => {
		return item?._title || item?.id || "";
	};

	const getOptionDisplay = (item: any) => {
		if (renderOption) return renderOption(item);
		return item?._title || item?.id || "";
	};

	// Filter out already selected items from dropdown
	const availableOptions = allOptions?.filter((opt: any) => !selectedIds.includes(opt.id)) || [];

	const canAddMore = !maxItems || selectedIds.length < maxItems;

	return (
		<div className="space-y-2">
			{label && (
				<div className="flex items-center gap-2">
					<label htmlFor={name} className="text-sm font-medium">
						{label}
						{required && <span className="text-destructive">*</span>}
						{maxItems && (
							<span className="ml-2 text-xs text-muted-foreground">
								({selectedIds.length}/{maxItems})
							</span>
						)}
					</label>
					{localized && <LocaleBadge locale={locale || "i18n"} />}
				</div>
			)}

			{/* Selected Items List */}
			{selectedItems && selectedItems.length > 0 && (
				<div className="space-y-2 rounded-lg border p-3">
					{selectedItems.map((item: any, index: number) => (
						<div
							key={item.id}
							className="flex items-center gap-2 rounded-md border bg-card p-2"
						>
							{/* Drag Handle (if orderable) */}
							{orderable && !readOnly && (
								<button
									type="button"
									className="cursor-grab text-muted-foreground hover:text-foreground"
									disabled={disabled}
								>
									<GripVertical className="h-4 w-4" />
								</button>
							)}

							{/* Item Display */}
							<div className="flex-1">
								{renderItem ? renderItem(item, index) : (
									<span className="text-sm">{getDisplayValue(item)}</span>
								)}
							</div>

							{/* Edit Button */}
							{!readOnly && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									onClick={() => handleOpenEdit(item.id)}
									disabled={disabled}
									title="Edit"
								>
									<Pencil className="h-3 w-3" />
								</Button>
							)}

							{/* Remove Button */}
							{!readOnly && (!required || selectedIds.length > 1) && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-7 w-7"
									onClick={() => handleRemove(item.id)}
									disabled={disabled}
									title="Remove"
								>
									<X className="h-3 w-3" />
								</Button>
							)}
						</div>
					))}
				</div>
			)}

			{/* Add More */}
			{!readOnly && canAddMore && (
				<div className="flex gap-2">
					{/* Combobox to add existing items */}
					<div className="flex-1">
						<Combobox
							options={availableOptions.map((opt: any) => ({
								value: opt.id,
								label: getOptionDisplay(opt),
							}))}
							value=""
							onValueChange={handleAdd}
							placeholder={placeholder || `Add ${label || targetCollection}...`}
							emptyMessage={
								isLoading ? "Loading..." : "No more options available"
							}
							disabled={disabled || isLoading}
						/>
					</div>

					{/* Create Button */}
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handleOpenCreate}
						disabled={disabled}
						title={`Create new ${label || targetCollection}`}
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>
			)}

			{/* Empty State */}
			{selectedIds.length === 0 && (
				<div className="rounded-lg border border-dashed p-4 text-center">
					<p className="text-sm text-muted-foreground">
						{placeholder || `No ${label || targetCollection} selected`}
					</p>
				</div>
			)}

			{/* Error message */}
			{error && <p className="text-sm text-destructive">{error}</p>}

			{/* Side Sheet for Create/Edit */}
			<Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
				<SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
					<SheetHeader>
						<SheetTitle>
							{sheetMode === "create" ? "Create" : "Edit"} {label || targetCollection}
						</SheetTitle>
						<SheetDescription>
							{sheetMode === "create"
								? `Fill in the details to create a new ${label || targetCollection}`
								: `Update the details of this ${label || targetCollection}`}
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6">
						{renderFormFields ? (
							renderFormFields(targetCollection, editingItemId)
						) : (
							<div className="rounded-lg border border-dashed p-8 text-center">
								<p className="text-sm text-muted-foreground">
									Form fields not configured.
									<br />
									Pass <code className="text-xs">renderFormFields</code> prop to enable create/edit.
								</p>
							</div>
						)}
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
