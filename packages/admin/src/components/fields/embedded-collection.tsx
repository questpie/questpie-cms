/**
 * EmbeddedCollectionField Component
 *
 * Manages embedded collections with inline, modal, or drawer editing.
 */

import * as React from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { LocaleBadge } from "./locale-badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "../ui/drawer";
import type { EmbeddedCollectionProps } from "../../config/component-registry";

type RowLabel = ((item: any) => string) | string;

export interface EmbeddedCollectionFieldProps
	extends Omit<EmbeddedCollectionProps, "rowLabel"> {
	rowLabel?: RowLabel;
	renderFields?: (index: number) => React.ReactNode;
	minItems?: number;
	maxItems?: number;
}

export function EmbeddedCollectionField({
	name,
	value,
	collection,
	mode = "inline",
	orderable = false,
	rowLabel,
	label,
	description,
	required,
	disabled,
	readOnly,
	error,
	placeholder,
	localized,
	locale,
	renderFields,
	minItems,
	maxItems,
}: EmbeddedCollectionFieldProps) {
	const form = useFormContext();
	const { control } = form;
	const { fields, append, remove, move } = useFieldArray({ control, name });
	const values =
		(useWatch({ control, name }) as any[] | undefined) ?? value;

	const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
	const [isOpen, setIsOpen] = React.useState(false);

	const canAddMore = !maxItems || fields.length < maxItems;
	const canRemove = !readOnly && (!minItems || fields.length > minItems);
	const fallbackLabel = label || collection || "Item";

	const resolveRowLabel = React.useCallback(
		(item: any, index: number) => {
			if (typeof rowLabel === "function") {
				const labelValue = rowLabel(item);
				if (labelValue) return labelValue;
			}
			if (typeof rowLabel === "string") {
				const labelValue = item?.[rowLabel];
				if (labelValue) return String(labelValue);
			}
			if (item?.title) return String(item.title);
			if (item?.name) return String(item.name);
			return `${fallbackLabel} ${index + 1}`;
		},
		[fallbackLabel, rowLabel],
	);

	const handleAdd = () => {
		if (disabled || readOnly || !canAddMore) return;
		append({});
		if (mode !== "inline") {
			const nextIndex = fields.length;
			setActiveIndex(nextIndex);
			setIsOpen(true);
		}
	};

	const handleRemove = (index: number) => {
		if (!canRemove) return;
		remove(index);
		if (activeIndex === null) return;
		if (index === activeIndex) {
			setIsOpen(false);
			setActiveIndex(null);
		} else if (index < activeIndex) {
			setActiveIndex(activeIndex - 1);
		}
	};

	const handleMove = (from: number, to: number) => {
		if (to < 0 || to >= fields.length) return;
		move(from, to);
		if (activeIndex === null) return;
		if (activeIndex === from) {
			setActiveIndex(to);
		} else if (activeIndex === to) {
			setActiveIndex(from);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			setActiveIndex(null);
		}
	};

	const renderItemFields = (index: number) => {
		if (!renderFields) {
			return (
				<div className="rounded-lg border border-dashed p-4 text-center">
					<p className="text-sm text-muted-foreground">
						Form fields not configured.
					</p>
				</div>
			);
		}
		return renderFields(index);
	};

	const emptyState = (
		<div className="rounded-lg border border-dashed p-4 text-center">
			<p className="text-sm text-muted-foreground">
				{placeholder || `No ${fallbackLabel} added yet`}
			</p>
		</div>
	);

	const editorContent =
		activeIndex !== null ? renderItemFields(activeIndex) : null;
	const editorTitle =
		activeIndex !== null
			? resolveRowLabel(values?.[activeIndex], activeIndex)
			: fallbackLabel;

	const showEditor = mode === "modal" || mode === "drawer";

	return (
		<div className="space-y-2">
			{label && (
				<div className="flex items-center gap-2">
					<label htmlFor={name} className="text-sm font-medium">
						{label}
						{required && <span className="text-destructive">*</span>}
						{maxItems && (
							<span className="ml-2 text-xs text-muted-foreground">
								({fields.length}/{maxItems})
							</span>
						)}
					</label>
					{localized && <LocaleBadge locale={locale || "i18n"} />}
				</div>
			)}
			{description && (
				<p className="text-sm text-muted-foreground">{description}</p>
			)}

			<div className="space-y-3">
				{fields.length === 0
					? emptyState
					: fields.map((field, index) => {
							const itemValue = values?.[index];
							const itemLabel = resolveRowLabel(itemValue, index);
							const canMoveUp = orderable && index > 0;
							const canMoveDown = orderable && index < fields.length - 1;

							return (
								<div key={field.id} className="rounded-lg border bg-card">
									<div className="flex items-center justify-between border-b px-3 py-2">
										<div className="flex items-center gap-2">
											<span className="text-xs text-muted-foreground">
												#{index + 1}
											</span>
											<span className="text-sm font-medium">{itemLabel}</span>
										</div>
										<div className="flex items-center gap-1">
											{orderable && !readOnly && (
												<>
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														onClick={() => handleMove(index, index - 1)}
														disabled={!canMoveUp || disabled}
														title="Move up"
													>
														<ChevronUp className="h-3 w-3" />
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="icon-xs"
														onClick={() => handleMove(index, index + 1)}
														disabled={!canMoveDown || disabled}
														title="Move down"
													>
														<ChevronDown className="h-3 w-3" />
													</Button>
												</>
											)}
											{mode !== "inline" && (
												<Button
													type="button"
													variant="ghost"
													size="icon-xs"
													onClick={() => {
														setActiveIndex(index);
														setIsOpen(true);
													}}
													disabled={disabled || !renderFields}
													title={readOnly ? "View" : "Edit"}
												>
													<Pencil className="h-3 w-3" />
												</Button>
											)}
											{!readOnly && canRemove && (
												<Button
													type="button"
													variant="ghost"
													size="icon-xs"
													onClick={() => handleRemove(index)}
													disabled={disabled}
													title="Remove"
												>
													<Trash2 className="h-3 w-3" />
												</Button>
											)}
										</div>
									</div>
									{mode === "inline" && (
										<div className="space-y-3 p-3">
											{renderItemFields(index)}
										</div>
									)}
								</div>
							);
						})}
			</div>

			{!readOnly && canAddMore && (
				<Button
					type="button"
					variant="outline"
					onClick={handleAdd}
					disabled={disabled}
				>
					<Plus className="h-4 w-4" />
					Add {fallbackLabel}
				</Button>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}

			{showEditor && mode === "modal" && (
				<Dialog open={isOpen} onOpenChange={handleOpenChange}>
					<DialogContent className="sm:max-w-2xl">
						<DialogHeader>
							<DialogTitle>{editorTitle}</DialogTitle>
							{description && (
								<DialogDescription>{description}</DialogDescription>
							)}
						</DialogHeader>
						<div className="space-y-4">{editorContent}</div>
					</DialogContent>
				</Dialog>
			)}

			{showEditor && mode === "drawer" && (
				<Drawer open={isOpen} onOpenChange={handleOpenChange} direction="right">
					<DrawerContent className="sm:max-w-lg">
						<DrawerHeader>
							<DrawerTitle>{editorTitle}</DrawerTitle>
							{description && (
								<DrawerDescription>{description}</DrawerDescription>
							)}
						</DrawerHeader>
						<div className="px-4 pb-4">{editorContent}</div>
						<DrawerFooter>
							<DrawerClose asChild>
								<Button type="button" variant="outline">
									Close
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>
			)}
		</div>
	);
}
