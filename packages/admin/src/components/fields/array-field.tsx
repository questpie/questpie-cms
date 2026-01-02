/**
 * ArrayField Component
 *
 * Handles arrays of primitive values with optional ordering.
 */

import * as React from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { LocaleBadge } from "./locale-badge";
import type { FieldComponentProps } from "../../config/component-registry";

export type ArrayFieldItemType =
	| "text"
	| "number"
	| "email"
	| "textarea"
	| "select";

export interface ArrayFieldProps extends FieldComponentProps<any[]> {
	itemType?: ArrayFieldItemType;
	options?: Array<{ label: string; value: any }>;
	orderable?: boolean;
	minItems?: number;
	maxItems?: number;
}

export function ArrayField({
	name,
	value,
	label,
	description,
	placeholder,
	required,
	disabled,
	readOnly,
	error,
	localized,
	locale,
	itemType = "text",
	options,
	orderable = false,
	minItems,
	maxItems,
}: ArrayFieldProps) {
	const form = useFormContext();
	const { control } = form;
	const { fields, append, remove, move } = useFieldArray({ control, name });
	const values =
		(useWatch({ control, name }) as any[] | undefined) ?? value;

	const canAddMore = !maxItems || fields.length < maxItems;
	const canRemove = !readOnly && (!minItems || fields.length > minItems);

	const createEmptyItem = React.useCallback(() => {
		if (itemType === "number") return undefined;
		if (itemType === "select") {
			return options?.[0]?.value ?? "";
		}
		return "";
	}, [itemType, options]);

	const handleAdd = () => {
		if (disabled || readOnly || !canAddMore) return;
		append(createEmptyItem());
	};

	const handleRemove = (index: number) => {
		if (!canRemove) return;
		remove(index);
	};

	const handleMove = (from: number, to: number) => {
		if (to < 0 || to >= fields.length) return;
		move(from, to);
	};

	const renderItemInput = (index: number) => {
		const itemName = `${name}.${index}`;
		const itemValue = values?.[index];
		const itemPlaceholder = placeholder || `Item ${index + 1}`;

		if (itemType === "textarea") {
			return (
				<Textarea
					id={itemName}
					placeholder={itemPlaceholder}
					disabled={disabled || readOnly}
					defaultValue={itemValue ?? ""}
					{...form.register(itemName)}
				/>
			);
		}

		if (itemType === "select") {
			return (
				<Select
					value={itemValue ?? ""}
					onValueChange={(value) =>
						form.setValue(itemName, value, {
							shouldDirty: true,
							shouldTouch: true,
						})
					}
					disabled={disabled || readOnly}
				>
					<SelectTrigger id={itemName}>
						<SelectValue placeholder={itemPlaceholder} />
					</SelectTrigger>
					<SelectContent>
						{options?.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		}

		return (
			<Input
				id={itemName}
				type={itemType === "email" ? "email" : itemType}
				placeholder={itemPlaceholder}
				disabled={disabled || readOnly}
				defaultValue={itemValue ?? ""}
				{...form.register(itemName, itemType === "number" ? { valueAsNumber: true } : undefined)}
			/>
		);
	};

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

			<div className="space-y-2">
				{fields.length === 0 ? (
					<div className="rounded-lg border border-dashed p-4 text-center">
						<p className="text-sm text-muted-foreground">
							{placeholder || `No ${label || "items"} added yet`}
						</p>
					</div>
				) : (
					fields.map((field, index) => {
						const canMoveUp = orderable && index > 0;
						const canMoveDown = orderable && index < fields.length - 1;

						return (
							<div key={field.id} className="flex items-start gap-2">
								<div className="flex-1">{renderItemInput(index)}</div>
								{orderable && !readOnly && (
									<div className="flex flex-col gap-1">
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
									</div>
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
						);
					})
				)}
			</div>

			{!readOnly && canAddMore && (
				<Button
					type="button"
					variant="outline"
					onClick={handleAdd}
					disabled={disabled}
				>
					<Plus className="h-4 w-4" />
					Add {label || "item"}
				</Button>
			)}

			{error && <p className="text-sm text-destructive">{error}</p>}
		</div>
	);
}
