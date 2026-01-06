import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// Import a minimal style, or no style, and apply custom styling via Tailwind/CSS
import {
	coldarkCold,
	coldarkDark,
} from "react-syntax-highlighter/dist/esm/styles/prism"; // Keep this import for now, but its style will be overridden

export function CodeWindow({
	children,
	className,
	title = "terminal",
}: {
	children: string;
	className?: string;
	title?: string;
}) {
	return (
		<div
			className={cn(
				"overflow-hidden border border-border bg-card/80 backdrop-blur-md",
				className,
			)}
		>
			<div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
				<div className="flex gap-1.5">
					<div className="h-2.5 w-2.5 bg-muted-foreground/30" />
					<div className="h-2.5 w-2.5 bg-muted-foreground/30" />
					<div className="h-2.5 w-2.5 bg-muted-foreground/30" />
				</div>
				<div className="ml-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
					{title}
				</div>
			</div>
			<div className="p-4 font-mono text-xs overflow-x-auto text-foreground/90 leading-relaxed dark:hidden">
				<SyntaxHighlighter
					language="typescript"
					style={coldarkCold}
					customStyle={{ background: "transparent", padding: 0 }}
				>
					{children}
				</SyntaxHighlighter>
			</div>
			<div className="p-4 font-mono text-xs overflow-x-auto text-foreground/90 leading-relaxed hidden dark:block">
				<SyntaxHighlighter
					language="typescript"
					style={coldarkDark}
					customStyle={{ background: "transparent", padding: 0 }}
				>
					{children}
				</SyntaxHighlighter>
			</div>
		</div>
	);
}
