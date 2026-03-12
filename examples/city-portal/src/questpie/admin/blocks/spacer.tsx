/**
 * Spacer Block Renderer
 */

import type { BlockProps } from "../.generated/client";

export function SpacerRenderer({ values }: BlockProps<"spacer">) {
	const sizeClasses: Record<string, string> = {
		small: "h-8 md:h-12",
		medium: "h-12 md:h-20",
		large: "h-20 md:h-32",
		xlarge: "h-32 md:h-48",
	};

	const sizeClass = sizeClasses[values.size || "medium"];

	return <div className={sizeClass} aria-hidden="true" />;
}
