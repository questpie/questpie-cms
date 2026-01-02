/**
 * RelationSelect Component
 *
 * Single relation field (one-to-one) with:
 * - Select dropdown to choose existing item
 * - Plus button to create new related item (opens side sheet)
 * - Edit button to modify selected item (opens side sheet)
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Pencil, X } from "lucide-react";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../ui/sheet";
import { Spinner } from "../ui/spinner";
import { LocaleBadge } from "./locale-badge";
import { useAdminContext } from "../../hooks/admin-provider";
import type { QCMS } from "@questpie/cms/server";

export interface RelationSelectProps<T extends QCMS<any, any, any>> {
	/**
	 * Field name
	 */
	name: string;

	/**
	 * Current value (ID of related item)
	 */
	value?: string | null;

	/**
	 * Change handler
	 */
	onChange: (value: string | null) => void;

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
	 * Custom render function for dropdown options
	 */
	renderOption?: (item: any) => React.ReactNode;

	/**
	 * Custom render function for selected value
	 */
	renderValue?: (item: any) => React.ReactNode;

	/**
	 * Form fields to render in create/edit sheet
	 */
	renderFormFields?: (collection: string, itemId?: string) => React.ReactNode;
}

export function RelationSelect<T extends QCMS<any, any, any>>({
	name,
	value,
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
	renderOption,
	renderValue,
	renderFormFields,
}: RelationSelectProps<T>) {
	const { client, locale } = useAdminContext<T>();
	const localeKey = locale ?? "default";
	const [isSheetOpen, setIsSheetOpen] = React.useState(false);
	const [sheetMode, setSheetMode] = React.useState<"create" | "edit">("create");

	// Fetch options for dropdown
	const { data: options, isLoading } = useQuery({
		queryKey: ["relation", targetCollection, localeKey, filter],
		queryFn: async () => {
			const result = await client.collections[targetCollection].list({
				// Apply filter if provided
				...(filter ? filter({}) : {}), // TODO: Get actual form values
			});
			return result.data || [];
		},
	});

	// Fetch selected item details
	const { data: selectedItem } = useQuery({
		queryKey: ["relation", targetCollection, localeKey, value],
		queryFn: async () => {
			if (!value) return null;
			return await client.collections[targetCollection].get(value);
		},
		enabled: !!value,
	});

	const handleOpenCreate = () => {
		setSheetMode("create");
		setIsSheetOpen(true);
	};

	const handleOpenEdit = () => {
		if (!value) return;
		setSheetMode("edit");
		setIsSheetOpen(true);
	};

	const handleSheetClose = () => {
		setIsSheetOpen(false);
	};

	const handleClear = () => {
		onChange(null);
	};

	const getDisplayValue = (item: any) => {
		if (renderValue) return renderValue(item);
		return item?._title || item?.id || "";
	};

	const getOptionDisplay = (item: any) => {
		if (renderOption) return renderOption(item);
		return item?._title || item?.id || "";
	};

	return (
		<div className="space-y-2">
			{label && (
				<div className="flex items-center gap-2">
					<label htmlFor={name} className="text-sm font-medium">
						{label}
						{required && <span className="text-destructive">*</span>}
					</label>
					{localized && <LocaleBadge locale={locale || "i18n"} />}
				</div>
			)}

			<div className="flex gap-2">
				{/* Select Dropdown */}
				<div className="flex-1">
					<Select
						value={value || undefined}
						onValueChange={onChange}
						disabled={disabled || readOnly || isLoading}
					>
						<SelectTrigger id={name} className={error ? "border-destructive" : ""}>
							<SelectValue placeholder={placeholder || `Select ${label || targetCollection}...`}>
								{selectedItem ? getDisplayValue(selectedItem) : null}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{isLoading ? (
								<div className="flex items-center justify-center p-4">
									<Spinner className="h-4 w-4" />
								</div>
							) : options && options.length > 0 ? (
								options.map((option: any) => (
									<SelectItem key={option.id} value={option.id}>
										{getOptionDisplay(option)}
									</SelectItem>
								))
							) : (
								<div className="p-4 text-center text-sm text-muted-foreground">
									No options available
								</div>
							)}
						</SelectContent>
					</Select>
				</div>

				{/* Action Buttons */}
				{!readOnly && (
					<>
						{/* Clear button (only if value is set and not required) */}
						{value && !required && (
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={handleClear}
								disabled={disabled}
								title="Clear selection"
							>
								<X className="h-4 w-4" />
							</Button>
						)}

						{/* Edit button (only if value is set) */}
						{value && (
							<Button
								type="button"
								variant="outline"
								size="icon"
								onClick={handleOpenEdit}
								disabled={disabled}
								title={`Edit ${label || targetCollection}`}
							>
								<Pencil className="h-4 w-4" />
							</Button>
						)}

						{/* Create button */}
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
					</>
				)}
			</div>

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
							renderFormFields(targetCollection, sheetMode === "edit" ? value || undefined : undefined)
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
