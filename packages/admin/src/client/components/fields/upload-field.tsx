/**
 * UploadField Component
 *
 * Single file upload field integrated with react-hook-form.
 * Value is the asset ID (like a relation field).
 *
 * @example
 * ```tsx
 * <UploadField
 *   name="featuredImage"
 *   label="Featured Image"
 *   accept={["image/*"]}
 *   maxSize={5_000_000}
 * />
 * ```
 */

import { FolderOpen } from "@phosphor-icons/react";
import * as React from "react";
import {
	Controller,
	type ControllerRenderProps,
	type FieldValues,
} from "react-hook-form";
import { toast } from "sonner";
import { useCollectionItem } from "../../hooks/use-collection";
import { type Asset, useUpload } from "../../hooks/use-upload";
import { useResolveText, useTranslation } from "../../i18n/hooks";
import { MediaPickerDialog } from "../media/media-picker-dialog";
import { AssetPreview } from "../primitives/asset-preview";
import { Dropzone } from "../primitives/dropzone";
import { ResourceSheet } from "../sheets";
import { Button } from "../ui/button";
import type { BaseFieldProps } from "./field-types";
import { sanitizeFilename, useResolvedControl } from "./field-utils";
import { FieldWrapper } from "./field-wrapper";

// ============================================================================
// Types
// ============================================================================

export interface UploadFieldProps extends BaseFieldProps {
	/**
	 * Target collection for uploads
	 * @default "assets"
	 */
	collection?: string;

	/**
	 * Accepted file types (MIME types or extensions)
	 * @example ["image/*", "application/pdf"]
	 */
	accept?: string[];

	/**
	 * Maximum file size in bytes
	 */
	maxSize?: number;

	/**
	 * Show image preview for uploaded files
	 * @default true
	 */
	showPreview?: boolean;

	/**
	 * Allow editing alt/caption (opens edit dialog)
	 * @default true
	 */
	editable?: boolean;

	/**
	 * Preview variant
	 * @default "card"
	 */
	previewVariant?: "card" | "compact" | "thumbnail";

	/**
	 * Callback when upload starts
	 */
	onUploadStart?: () => void;

	/**
	 * Callback when upload completes
	 */
	onUploadComplete?: (asset: Asset) => void;

	/**
	 * Callback when upload fails
	 */
	onUploadError?: (error: Error) => void;
}

// ============================================================================
// Inner Component (handles hooks properly)
// ============================================================================

interface UploadFieldInnerProps {
	field: ControllerRenderProps<FieldValues, string>;
	error?: string;
	collection: string;
	accept?: string[];
	maxSize?: number;
	showPreview: boolean;
	editable: boolean;
	previewVariant: "card" | "compact" | "thumbnail";
	disabled?: boolean;
	placeholder?: string;
	onUploadStart?: () => void;
	onUploadComplete?: (asset: Asset) => void;
	onUploadError?: (error: Error) => void;
	className?: string;
}

function UploadFieldInner({
	field,
	error,
	collection,
	accept,
	maxSize,
	showPreview,
	editable,
	previewVariant,
	disabled,
	placeholder,
	onUploadStart,
	onUploadComplete,
	onUploadError,
	className,
}: UploadFieldInnerProps) {
	const { t } = useTranslation();
	const resolveText = useResolveText();
	const resolvedPlaceholder = placeholder
		? resolveText(placeholder)
		: undefined;
	const { upload, isUploading, progress, error: uploadError } = useUpload();
	const [isPickerOpen, setIsPickerOpen] = React.useState(false);
	const [isEditSheetOpen, setIsEditSheetOpen] = React.useState(false);

	// The field value is an asset ID (string) or null
	const assetId = field.value as string | null | undefined;

	// Fetch the asset data if we have an ID
	const { data: asset, isLoading: isLoadingAsset } = useCollectionItem(
		collection,
		assetId || "",
		undefined,
		{
			enabled: !!assetId && showPreview,
		},
	);

	/**
	 * Handle file drop/selection
	 */
	const handleDrop = async (files: File[]) => {
		if (files.length === 0 || disabled) return;

		const originalFile = files[0];

		// Sanitize filename
		const sanitizedName = sanitizeFilename(originalFile.name);
		const file = new File([originalFile], sanitizedName, {
			type: originalFile.type,
		});

		try {
			onUploadStart?.();

			const uploadedAsset = await upload(file, {
				collection,
			});

			// Set the asset ID as the field value
			field.onChange(uploadedAsset.id);
			onUploadComplete?.(uploadedAsset);
		} catch (err) {
			const uploadErr =
				err instanceof Error ? err : new Error(t("upload.error"));
			onUploadError?.(uploadErr);
			// Only show toast, don't duplicate with inline error
			toast.error(uploadErr.message);
		}
	};

	/**
	 * Handle remove
	 */
	const handleRemove = () => {
		field.onChange(null);
	};

	/**
	 * Handle edit - opens ResourceSheet for the asset
	 */
	const handleEdit = () => {
		if (assetId) {
			setIsEditSheetOpen(true);
		}
	};

	/**
	 * Handle validation errors from dropzone
	 */
	const handleValidationError = (errors: { message: string }[]) => {
		for (const validationError of errors) {
			toast.error(validationError.message);
		}
	};

	// Build hint text
	const hintText = React.useMemo(() => {
		const parts: string[] = [];
		if (accept?.length) {
			const types = accept
				.map((t) => {
					if (t.startsWith("image/")) return "Images";
					if (t.startsWith("video/")) return "Videos";
					if (t.startsWith("audio/")) return "Audio";
					if (t === "application/pdf") return "PDF";
					return t;
				})
				.filter((v, i, a) => a.indexOf(v) === i);
			parts.push(types.join(", "));
		}
		if (maxSize) {
			const mb = (maxSize / (1024 * 1024)).toFixed(0);
			parts.push(`Max ${mb}MB`);
		}
		return parts.join(" • ") || undefined;
	}, [accept, maxSize]);

	const hasValue = !!assetId;
	const isLoading = isUploading || (hasValue && isLoadingAsset);

	/**
	 * Handle asset selection from media picker
	 */
	const handlePickerSelect = (id: string | string[]) => {
		if (typeof id === "string") {
			field.onChange(id);
		}
	};

	return (
		<div className={className}>
			{/* Show preview if we have an asset */}
			{hasValue && showPreview && asset ? (
				<AssetPreview
					asset={asset as Asset}
					loading={isLoading}
					progress={isUploading ? progress : undefined}
					disabled={disabled}
					variant={previewVariant}
					onRemove={disabled ? undefined : handleRemove}
					onEdit={editable && !disabled ? handleEdit : undefined}
				/>
			) : hasValue && showPreview && isLoadingAsset ? (
				// Loading state while fetching asset
				<AssetPreview
					asset={{ id: assetId }}
					loading={true}
					disabled={disabled}
					variant={previewVariant}
				/>
			) : (
				// Show dropzone for empty state or when uploading
				<Dropzone
					onDrop={handleDrop}
					accept={accept}
					maxSize={maxSize}
					multiple={false}
					disabled={disabled}
					loading={isUploading}
					progress={isUploading ? progress : undefined}
					label={resolvedPlaceholder || "Drop file here or click to browse"}
					hint={hintText}
					onValidationError={handleValidationError}
				/>
			)}

			{/* Browse Library Button */}
			{!hasValue && !isUploading && !disabled && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setIsPickerOpen(true)}
					className="mt-2 w-full"
				>
					<FolderOpen weight="bold" className="mr-2 size-4" />
					Browse Library
				</Button>
			)}

			{/* Media Picker Dialog */}
			<MediaPickerDialog
				open={isPickerOpen}
				onOpenChange={setIsPickerOpen}
				mode="single"
				accept={accept}
				onSelect={handlePickerSelect}
				collection={collection}
			/>

			{/* Edit Sheet */}
			{assetId && (
				<ResourceSheet
					type="collection"
					collection={collection}
					itemId={assetId}
					open={isEditSheetOpen}
					onOpenChange={setIsEditSheetOpen}
				/>
			)}

			{/* Show field validation error (upload errors shown via toast) */}
			{error && <p className="text-destructive mt-1 text-xs">{error}</p>}
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

export function UploadField({
	name,
	label,
	description,
	placeholder,
	required,
	disabled,
	localized,
	locale,
	control,
	className,
	collection = "assets",
	accept,
	maxSize,
	showPreview = true,
	editable = true,
	previewVariant = "card",
	onUploadStart,
	onUploadComplete,
	onUploadError,
}: UploadFieldProps) {
	const resolvedControl = useResolvedControl(control);

	return (
		<Controller
			name={name}
			control={resolvedControl}
			render={({ field, fieldState }) => (
				<FieldWrapper
					name={name}
					label={label}
					description={description}
					required={required}
					disabled={disabled}
					localized={localized}
					locale={locale}
					error={fieldState.error?.message}
				>
					<UploadFieldInner
						field={field}
						error={fieldState.error?.message}
						collection={collection}
						accept={accept}
						maxSize={maxSize}
						showPreview={showPreview}
						editable={editable}
						previewVariant={previewVariant}
						disabled={disabled}
						placeholder={placeholder}
						onUploadStart={onUploadStart}
						onUploadComplete={onUploadComplete}
						onUploadError={onUploadError}
						className={className}
					/>
				</FieldWrapper>
			)}
		/>
	);
}
