/**
 * Block Type Icon
 *
 * Displays the icon for a block type using Phosphor icons.
 */

"use client";

import * as PhosphorIcons from "@phosphor-icons/react";
import type * as React from "react";
import { cn } from "../../lib/utils.js";
import { useBlockDefinition } from "./block-editor-context.js";

// ============================================================================
// Types
// ============================================================================

export type BlockTypeIconProps = {
	/** Block type name */
	type: string;
	/** Custom class name */
	className?: string;
	/** Icon size */
	size?: number;
};

// ============================================================================
// Component
// ============================================================================

export function BlockTypeIcon({
	type,
	className,
	size = 16,
}: BlockTypeIconProps) {
	const blockDef = useBlockDefinition(type);
	const iconName = blockDef?.icon || "Cube";

	// Get icon component from Phosphor
	const IconComponent = getPhosphorIcon(iconName);

	return <IconComponent className={cn("shrink-0", className)} size={size} />;
}

/**
 * Standalone icon component that doesn't require context.
 * Useful for rendering icons outside the editor.
 */
export function BlockIcon({
	icon,
	className,
	size = 16,
}: {
	icon: string;
	className?: string;
	size?: number;
}) {
	const IconComponent = getPhosphorIcon(icon);
	return <IconComponent className={cn("shrink-0", className)} size={size} />;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get a Phosphor icon component by name.
 * Falls back to Cube icon if not found.
 */
function getPhosphorIcon(
	name: string,
): React.ComponentType<{ className?: string; size?: number }> {
	// Try to get the icon from Phosphor
	const icon = (PhosphorIcons as Record<string, unknown>)[name];

	if (typeof icon === "function") {
		return icon as React.ComponentType<{ className?: string; size?: number }>;
	}

	// Fallback to Cube
	return PhosphorIcons.Cube;
}

/**
 * Map of common block types to their default icons.
 */
export const DEFAULT_BLOCK_ICONS: Record<string, string> = {
	// Layout
	columns: "Columns",
	grid: "GridFour",
	container: "Square",
	section: "Rectangle",
	row: "Rows",

	// Content
	text: "TextAa",
	heading: "TextH",
	paragraph: "Paragraph",
	quote: "Quotes",
	list: "List",
	code: "Code",

	// Media
	image: "Image",
	video: "VideoCamera",
	gallery: "Images",
	audio: "SpeakerHigh",
	file: "File",

	// Sections
	hero: "Image",
	features: "Star",
	testimonials: "Quotes",
	cta: "Megaphone",
	pricing: "CurrencyDollar",
	faq: "Question",

	// Interactive
	form: "TextBox",
	accordion: "CaretDown",
	tabs: "Tabs",
	carousel: "Slideshow",
	button: "Cursor",
};
