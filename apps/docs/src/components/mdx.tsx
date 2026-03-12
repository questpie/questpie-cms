import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function CustomPre({
	title,
	className,
	...props
}: ComponentProps<"pre"> & { title?: string }) {
	return (
		<div className="group relative my-6 overflow-hidden border border-border bg-card">
			{title && (
				<div className="border-b border-border bg-card px-4 py-1.5">
					<span className="font-mono text-[9px] text-muted-foreground tracking-[2px] uppercase">
						{title}
					</span>
				</div>
			)}
			{/* We disable the default title rendering by passing undefined, but we keep other functionality */}
			<defaultComponents.pre
				{...props}
				title={undefined}
				className={cn("!my-0 !border-0 !bg-transparent", className)}
			>
				{props.children}
			</defaultComponents.pre>
		</div>
	);
}

export const components = {
	...defaultComponents,
	pre: CustomPre,
	// TypeTable is required for auto-type-table remark plugin
	TypeTable,
};
