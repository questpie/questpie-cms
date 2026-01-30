/**
 * UploadManyField Component
 *
 * Multiple file upload field integrated with react-hook-form.
 * Value is an array of asset IDs (like a relation field).
 * Supports drag-and-drop reordering.
 *
 * @example
 * ```tsx
 * <UploadManyField
 *   name="gallery"
 *   label="Gallery"
 *   accept={["image/*"]}
 *   maxItems={10}
 *   orderable
 * />
 * ```
 */

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FolderOpen } from "@phosphor-icons/react";
import * as React from "react";
import {
	Controller,
	type ControllerRenderProps,
	type FieldValues,
} from "react-hook-form";
import { toast } from "sonner";
import { type Asset, useUpload } from "../../hooks/use-upload";
import { useResolveText, useTranslation } from "../../i18n/hooks";
import { selectClient, useAdminStore } from "../../runtime";
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

export interface UploadManyFieldProps extends BaseFieldProps {
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
	 * Maximum number of files
	 */
	maxItems?: number;

	/**
	 * Enable drag-and-drop reordering
	 * @default false
	 */
	orderable?: boolean;

	/**
	 * Layout for previews
	 * @default "grid"
	 */
	layout?: "grid" | "list";

	/**
	 * Allow editing alt/caption (opens edit dialog)
	 * @default true
	 */
	editable?: boolean;

	/**
	 * Callback when upload starts
	 */
	onUploadStart?: () => void;

	/**
	 * Callback when upload completes
	 */
	onUploadComplete?: (assets: Asset[]) => void;

	/**
	 * Callback when upload fails
	 */
	onUploadError?: (error: Error) => void;
}

// ============================================================================
// Sortable Item Component
// ============================================================================

interface SortableAssetItemProps {
	id: string;
	asset: Asset | null;
	loading?: boolean;
	progress?: number;
	disabled?: boolean;
	variant: "compact" | "thumbnail";
	orderable?: boolean;
	editable?: boolean;
	href?: string;
	onRemove?: () => void;
	onEdit?: () => void;
}

function SortableAssetItem({
	id,
	asset,
	loading,
	progress,
	disabled,
	variant,
	orderable,
	editable,
	href,
	onRemove,
	onEdit,
}: SortableAssetItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={isDragging ? "opacity-50" : ""}
		>
			<AssetPreview
				asset={asset || { id }}
				loading={loading}
				progress={progress}
				disabled={disabled}
				variant={variant}
				showDragHandle={orderable && !disabled}
				dragHandleProps={
					orderable ? { ...attributes, ...listeners } : undefined
				}
				href={href}
				onRemove={disabled ? undefined : onRemove}
				onEdit={editable && !disabled ? onEdit : undefined}
			/>
		</div>
	);
}

// ============================================================================
// Inner Component (handles hooks properly)
// ============================================================================

interface UploadManyFieldInnerProps {
	field: ControllerRenderProps<FieldValues, string>;
	error?: string;
	collection: string;
	accept?: string[];
	maxSize?: number;
	maxItems?: number;
	orderable: boolean;
	layout: "grid" | "list";
	editable: boolean;
	disabled?: boolean;
	placeholder?: string;
	onUploadStart?: () => void;
	onUploadComplete?: (assets: Asset[]) => void;
	onUploadError?: (error: Error) => void;
	className?: string;
}

function UploadManyFieldInner({
	field,
	collection,
	accept,
	maxSize,
	maxItems,
	orderable,
	layout,
	editable,
	disabled,
	placeholder,
	onUploadStart,
	onUploadComplete,
	onUploadError,
	className,
}: UploadManyFieldInnerProps) {
	const { t } = useTranslation();
	const resolveText = useResolveText();
	const resolvedPlaceholder = placeholder
		? resolveText(placeholder)
		: undefined;
	const { uploadMany, isUploading, progress } = useUpload();
	const client = useAdminStore(selectClient);
	const [isPickerOpen, setIsPickerOpen] = React.useState(false);
	const [editAssetId, setEditAssetId] = React.useState<string | null>(null);

	// Track pending uploads (files being uploaded)
	const [pendingUploads, setPendingUploads] = React.useState<
		{ id: string; file: File }[]
	>([]);

	// Track fetched assets (lazy init to avoid creating Map on every render)
	const [fetchedAssets, setFetchedAssets] = React.useState<Map<string, Asset>>(
		() => new Map(),
	);

	// DnD sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// The field value is an array of asset IDs
	const assetIds = (field.value as string[] | null | undefined) || [];

	// Fetch assets that we don't have yet
	React.useEffect(() => {
		if (!client || assetIds.length === 0) return;

		const missingIds = assetIds.filter((id) => !fetchedAssets.has(id));
		if (missingIds.length === 0) return;

		let cancelled = false;

		(async () => {
			for (const id of missingIds) {
				if (cancelled) return;
				try {
					const response = await (client as any).collections[
						collection
					].findOne({ where: { id } });
					if (!cancelled && response) {
						setFetchedAssets((prev) =>
							new Map(prev).set(id, response as Asset),
						);
					}
				} catch (fetchError) {
					if (!cancelled) {
						console.error("Failed to fetch asset:", fetchError);
						toast.error("Failed to load asset");
					}
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [assetIds, collection, fetchedAssets, client]);

	/**
	 * Handle file drop/selection
	 */
	const handleDrop = async (files: File[]) => {
		if (files.length === 0 || disabled) return;

		// Check max items
		const remainingSlots = maxItems ? maxItems - assetIds.length : files.length;
		const filesToUpload = files.slice(0, remainingSlots);

		if (filesToUpload.length < files.length) {
			toast.warning(
				t("toast.maxFilesWarning", {
					remaining: remainingSlots,
					max: maxItems,
				}),
			);
		}

		if (filesToUpload.length === 0) return;

		// Sanitize filenames
		const sanitizedFiles = filesToUpload.map((file) => {
			const sanitizedName = sanitizeFilename(file.name);
			return new File([file], sanitizedName, { type: file.type });
		});

		// Create pending upload entries with temporary IDs
		const pending = sanitizedFiles.map((file, index) => ({
			id: `pending-${Date.now()}-${index}`,
			file,
		}));
		setPendingUploads(pending);

		try {
			onUploadStart?.();

			const uploadedAssets = await uploadMany(sanitizedFiles, {
				collection,
			});

			// Add uploaded asset IDs to field value
			const newIds = uploadedAssets.map((a) => a.id);
			field.onChange([...assetIds, ...newIds]);

			// Add to fetched assets cache
			for (const asset of uploadedAssets) {
				setFetchedAssets((prev) => new Map(prev).set(asset.id, asset));
			}

			onUploadComplete?.(uploadedAssets);
		} catch (err) {
			const uploadError =
				err instanceof Error ? err : new Error(t("upload.error"));
			onUploadError?.(uploadError);
			toast.error(uploadError.message);
		} finally {
			setPendingUploads([]);
		}
	};

	/**
	 * Handle remove
	 */
	const handleRemove = (idToRemove: string) => {
		field.onChange(assetIds.filter((id) => id !== idToRemove));
	};

	/**
	 * Handle edit - opens ResourceSheet for the asset
	 */
	const handleEdit = (id: string) => {
		setEditAssetId(id);
	};

	/**
	 * Handle drag end for reordering
	 */
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = assetIds.indexOf(active.id as string);
			const newIndex = assetIds.indexOf(over.id as string);

			if (oldIndex !== -1 && newIndex !== -1) {
				const reordered = arrayMove(assetIds, oldIndex, newIndex);
				field.onChange(reordered);
			}
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

	/**
	 * Handle asset selection from media picker
	 */
	const handlePickerSelect = (ids: string | string[]) => {
		const newIds = Array.isArray(ids) ? ids : [ids];

		// Check max items
		const totalAfterAdd = assetIds.length + newIds.length;
		if (maxItems && totalAfterAdd > maxItems) {
			toast.warning(`Maximum ${maxItems} items allowed`);
			// Add only what fits
			const remainingSlots = maxItems - assetIds.length;
			const idsToAdd = newIds.slice(0, remainingSlots);
			field.onChange([...assetIds, ...idsToAdd]);
		} else {
			field.onChange([...assetIds, ...newIds]);
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

	const hasItems = assetIds.length > 0 || pendingUploads.length > 0;
	const canAddMore = !maxItems || assetIds.length < maxItems;
	const previewVariant = layout === "grid" ? "thumbnail" : "compact";
	const sortingStrategy =
		layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy;

	return (
		<div className={className}>
			{/* Items Grid/List with DnD */}
			{hasItems && (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={assetIds}
						strategy={sortingStrategy}
						disabled={!orderable}
					>
						<div
							className={
								layout === "grid"
									? "mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
									: "mb-3 space-y-2"
							}
						>
							{/* Existing assets */}
							{assetIds.map((id) => (
								<SortableAssetItem
									key={id}
									id={id}
									asset={fetchedAssets.get(id) || null}
									disabled={disabled}
									variant={previewVariant}
									orderable={orderable}
									editable={editable}
									onRemove={() => handleRemove(id)}
									onEdit={() => handleEdit(id)}
								/>
							))}

							{/* Pending uploads */}
							{pendingUploads.map((pending, index) => (
								<div key={pending.id}>
									<AssetPreview
										asset={{ filename: pending.file.name }}
										pendingFile={pending.file}
										loading={true}
										progress={
											// Distribute overall progress among pending files
											Math.min(
												100,
												Math.max(
													0,
													progress - (index / pendingUploads.length) * 100,
												) *
													(pendingUploads.length /
														(pendingUploads.length - index)),
											)
										}
										disabled={true}
										variant={previewVariant}
									/>
								</div>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}

			{/* Dropzone for adding more */}
			{canAddMore && !isUploading && (
				<Dropzone
					onDrop={handleDrop}
					accept={accept}
					maxSize={maxSize}
					multiple={true}
					disabled={disabled}
					loading={isUploading}
					progress={isUploading ? progress : undefined}
					label={
						hasItems
							? "Drop more files or click to add"
							: resolvedPlaceholder || "Drop files here or click to browse"
					}
					hint={hintText}
					onValidationError={handleValidationError}
					className={hasItems ? "min-h-[80px]" : undefined}
				/>
			)}

			{/* Browse Library Button */}
			{canAddMore && !isUploading && !disabled && (
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
				mode="multiple"
				accept={accept}
				onSelect={handlePickerSelect}
				maxItems={maxItems ? maxItems - assetIds.length : undefined}
				collection={collection}
			/>

			{/* Edit Sheet */}
			{editAssetId && (
				<ResourceSheet
					type="collection"
					collection={collection}
					itemId={editAssetId}
					open={!!editAssetId}
					onOpenChange={(open: boolean) => !open && setEditAssetId(null)}
				/>
			)}

			{/* Uploading state */}
			{isUploading && !canAddMore && (
				<div className="text-muted-foreground flex items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-sm">
					Uploading... {progress}%
				</div>
			)}
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

export function UploadManyField({
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
	maxItems,
	orderable = false,
	layout = "grid",
	editable = true,
	onUploadStart,
	onUploadComplete,
	onUploadError,
}: UploadManyFieldProps) {
	const resolveText = useResolveText();
	const resolvedControl = useResolvedControl(control);

	return (
		<Controller
			name={name}
			control={resolvedControl}
			render={({ field, fieldState }) => {
				const assetIds = (field.value as string[] | null | undefined) || [];

				return (
					<FieldWrapper
						name={name}
						label={
							label
								? `${resolveText(label)}${
										maxItems ? ` (${assetIds.length}/${maxItems})` : ""
									}`
								: undefined
						}
						description={description}
						required={required}
						disabled={disabled}
						localized={localized}
						locale={locale}
						error={fieldState.error?.message}
					>
						<UploadManyFieldInner
							field={field}
							error={fieldState.error?.message}
							collection={collection}
							accept={accept}
							maxSize={maxSize}
							maxItems={maxItems}
							orderable={orderable}
							layout={layout}
							editable={editable}
							disabled={disabled}
							placeholder={placeholder}
							onUploadStart={onUploadStart}
							onUploadComplete={onUploadComplete}
							onUploadError={onUploadError}
							className={className}
						/>
					</FieldWrapper>
				);
			}}
		/>
	);
}
