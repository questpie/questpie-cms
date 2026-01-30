/**
 * AssetThumbnail Component
 *
 * Unified asset display component for all contexts.
 * Replaces 3 duplicate implementations:
 * - UploadCell (32px table)
 * - AssetPreviewCell (40px preview)
 * - AssetPreviewField (400px form preview)
 */

import * as React from "react";
import {
	File,
	FileImage,
	FileVideo,
	FileAudio,
	FilePdf,
	FileDoc,
	FileZip,
	FileCode,
	ArrowSquareOut,
} from "@phosphor-icons/react";
import { Button } from "../../../../components/ui/button";
import { cn } from "../../../../lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface AssetThumbnailProps {
	/**
	 * Asset object or ID
	 */
	asset: unknown;

	/**
	 * Size variant
	 * - sm: 32px (table cells)
	 * - md: 40px/64px (preview)
	 * - lg: 400px (form preview with controls)
	 */
	size?: "sm" | "md" | "lg";

	/**
	 * Show filename next to thumbnail (sm/md sizes only)
	 */
	showFilename?: boolean;

	/**
	 * Show video/audio controls (lg size only)
	 */
	showControls?: boolean;

	/**
	 * Called when the thumbnail is clicked
	 */
	onClick?: (id: string) => void;

	/**
	 * Additional className
	 */
	className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function getFileIcon(mimeType?: string) {
	if (!mimeType) return File;

	const type = mimeType.toLowerCase();

	if (type.startsWith("image/")) return FileImage;
	if (type.startsWith("video/")) return FileVideo;
	if (type.startsWith("audio/")) return FileAudio;
	if (type === "application/pdf") return FilePdf;
	if (
		type.includes("zip") ||
		type.includes("compressed") ||
		type.includes("archive")
	)
		return FileZip;
	if (
		type.includes("word") ||
		type.includes("document") ||
		type === "application/rtf"
	)
		return FileDoc;
	if (
		type.includes("json") ||
		type.includes("javascript") ||
		type.includes("typescript") ||
		type.includes("xml") ||
		type.includes("html")
	)
		return FileCode;

	return File;
}

function isImage(mimeType?: string): boolean {
	return !!mimeType?.toLowerCase().startsWith("image/");
}

function isVideo(mimeType?: string): boolean {
	return !!mimeType?.toLowerCase().startsWith("video/");
}

function isAudio(mimeType?: string): boolean {
	return !!mimeType?.toLowerCase().startsWith("audio/");
}

// ============================================================================
// Component
// ============================================================================

export function AssetThumbnail({
	asset,
	size = "sm",
	showFilename = false,
	showControls = false,
	onClick,
	className,
}: AssetThumbnailProps) {
	// Handle null/undefined
	if (asset === null || asset === undefined) {
		return <span className="text-muted-foreground">-</span>;
	}

	// If asset is just an ID string
	if (typeof asset === "string") {
		return (
			<span
				className="font-mono text-xs text-muted-foreground truncate max-w-[100px]"
				title={asset}
			>
				{asset.slice(0, 8)}...
			</span>
		);
	}

	// Extract asset properties
	const assetObj = asset as Record<string, unknown>;
	const url = assetObj.url as string | undefined;
	const filename = assetObj.filename as string | undefined;
	const mimeType = assetObj.mimeType as string | undefined;
	const alt = assetObj.alt as string | undefined;

	const isImageType = isImage(mimeType);
	const isVideoType = isVideo(mimeType);
	const isAudioType = isAudio(mimeType);
	const FileIcon = getFileIcon(mimeType);

	// No URL means no preview
	if (!url) {
		if (assetObj.id) {
			return (
				<span className="font-mono text-xs text-muted-foreground">
					{String(assetObj.id).slice(0, 8)}...
				</span>
			);
		}
		return <span className="text-muted-foreground">-</span>;
	}

	// ========== SM SIZE (32px) - Table cells ==========
	if (size === "sm") {
		const assetId = assetObj.id as string | undefined;
		const handleClick = onClick && assetId ? () => onClick(assetId) : undefined;

		if (isImageType) {
			return (
				<div
					className={cn(
						"flex items-center gap-2",
						onClick && "cursor-pointer hover:opacity-80",
						className,
					)}
					onClick={handleClick}
				>
					<img
						src={url}
						alt={filename || "Asset"}
						className="size-8 rounded object-cover border"
					/>
					{showFilename && filename && (
						<span className="text-xs truncate max-w-[100px]" title={filename}>
							{filename}
						</span>
					)}
				</div>
			);
		}

		// Non-image files
		if (showFilename && filename) {
			return (
				<span className="text-sm truncate max-w-[150px]" title={filename}>
					{filename}
				</span>
			);
		}

		return (
			<span className="font-mono text-xs text-muted-foreground">
				{String(assetObj.id || "").slice(0, 8)}...
			</span>
		);
	}

	// ========== MD SIZE (40px) - Preview/Icon ==========
	if (size === "md") {
		const assetId = assetObj.id as string | undefined;
		const handleClick = onClick && assetId ? () => onClick(assetId) : undefined;

		if (isImageType) {
			return (
				<div
					className={cn(
						"flex items-center justify-center",
						onClick && "cursor-pointer hover:opacity-80",
						className,
					)}
					onClick={handleClick}
				>
					<img
						src={url}
						alt={filename || "Asset"}
						className="size-10 rounded object-cover border"
					/>
				</div>
			);
		}

		// Show icon for non-images
		return (
			<div
				className={cn(
					"flex items-center justify-center",
					onClick && "cursor-pointer hover:opacity-80",
					className,
				)}
				onClick={handleClick}
			>
				<div className="size-10 rounded border bg-muted flex items-center justify-center">
					<FileIcon className="size-5 text-muted-foreground" weight="regular" />
				</div>
			</div>
		);
	}

	// ========== LG SIZE (400px) - Full preview with controls ==========
	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-lg border bg-muted/30",
				className,
			)}
		>
			{/* Image Preview */}
			{isImageType && (
				<div className="relative">
					<img
						src={url}
						alt={alt || filename || "Asset preview"}
						className="max-h-[400px] w-full object-contain"
					/>
				</div>
			)}

			{/* Video Preview */}
			{isVideoType && (
				<div className="relative">
					{showControls ? (
						<video
							src={url}
							controls
							className="max-h-[400px] w-full"
							preload="metadata"
						>
							<track kind="captions" />
							Your browser does not support the video tag.
						</video>
					) : (
						<div className="flex flex-col items-center justify-center gap-4 p-12">
							<FileIcon
								className="size-20 text-muted-foreground"
								weight="regular"
							/>
							<p className="text-sm text-muted-foreground">
								{filename || "Video"}
							</p>
						</div>
					)}
				</div>
			)}

			{/* Audio Preview */}
			{isAudioType && (
				<div className="flex flex-col items-center justify-center gap-4 p-8">
					<FileIcon
						className="size-16 text-muted-foreground"
						weight="regular"
					/>
					{showControls && (
						<audio src={url} controls className="w-full max-w-md" preload="metadata">
							Your browser does not support the audio tag.
						</audio>
					)}
					{!showControls && (
						<p className="text-sm text-muted-foreground">
							{filename || "Audio"}
						</p>
					)}
				</div>
			)}

			{/* Other File Types */}
			{!isImageType && !isVideoType && !isAudioType && (
				<div className="flex flex-col items-center justify-center gap-4 p-12">
					<FileIcon className="size-20 text-muted-foreground" weight="regular" />
					<p className="text-sm text-muted-foreground">{filename || "File"}</p>
				</div>
			)}

			{/* Open in new tab button (lg size only) */}
			<div className="absolute right-2 top-2">
				<Button
					type="button"
					variant="secondary"
					size="icon-sm"
					nativeButton={false}
					render={<a href={url} target="_blank" rel="noopener noreferrer" />}
				>
					<ArrowSquareOut weight="bold" />
				</Button>
			</div>
		</div>
	);
}
