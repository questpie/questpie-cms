import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import coldarkCold from "react-syntax-highlighter/dist/esm/styles/prism/coldark-cold";
import coldarkDark from "react-syntax-highlighter/dist/esm/styles/prism/coldark-dark";
import { cn } from "@/lib/utils";

SyntaxHighlighter.registerLanguage("typescript", typescript);

type TabId = "dashboard" | "table" | "form" | "sidebar";

const tabs: { id: TabId; label: string; description: string }[] = [
	{
		id: "dashboard",
		label: "Dashboard",
		description: "Stats, charts, and recent activity",
	},
	{
		id: "table",
		label: "Table View",
		description: "Search, filter, sort, and paginate",
	},
	{
		id: "form",
		label: "Form View",
		description: "Content editing with sidebar",
	},
	{
		id: "sidebar",
		label: "Sidebar",
		description: "Navigation, groups, structure",
	},
];

const snippets: Record<TabId, string> = {
	dashboard: `.dashboard(({ d }) => d.dashboard({
  items: [
    d.stats({ collection: "posts" }),
    d.stats({ collection: "users" }),
    d.chart({ collection: "posts", chartType: "line" }),
    d.recentItems({ collection: "posts" }),
  ],
}))`,
	table: `.list(({ v, f }) => v.table({
  columns: [f.title, f.author, f.status],
}))`,
	form: `.form(({ v, f }) => v.form({
  fields: [f.title, f.content],
  sidebar: {
    fields: [f.author, f.status],
  },
}))`,
	sidebar: `.sidebar(({ s, c }) => s.sidebar({
  sections: [
    s.section({
      id: "content",
      title: { en: "Content" },
      items: [
        { type: "collection", collection: "posts" },
        { type: "collection", collection: "pages" },
      ],
    }),
    s.section({
      id: "system",
      title: { en: "System" },
      items: [
        { type: "global", global: "settings" },
      ],
    }),
  ],
}))`,
};

const AUTO_INTERVAL = 5000;
const PAUSE_AFTER_CLICK = 10000;

export function AdminShowcase() {
	const [active, setActive] = useState<TabId>("dashboard");
	const pauseUntilRef = useRef(0);

	const handleClick = useCallback((id: TabId) => {
		pauseUntilRef.current = Date.now() + PAUSE_AFTER_CLICK;
		setActive(id);
	}, []);

	useEffect(() => {
		const interval = setInterval(() => {
			if (Date.now() < pauseUntilRef.current) return;
			setActive((prev) => {
				const idx = tabs.findIndex((t) => t.id === prev);
				return tabs[(idx + 1) % tabs.length].id;
			});
		}, AUTO_INTERVAL);
		return () => clearInterval(interval);
	}, []);

	return (
		<section className="border-t border-border/40 py-20">
			<div className="mx-auto w-full max-w-7xl px-4">
				{/* Header */}
				<motion.div
					className="mx-auto mb-12 max-w-2xl space-y-3 text-center"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-80px" }}
					transition={{ duration: 0.6 }}
				>
					<h2 className="font-mono text-sm uppercase tracking-[0.2em] text-primary">
						Admin Panel
					</h2>
					<h3 className="text-3xl font-bold tracking-[-0.02em] text-balance md:text-4xl">
						The admin panel writes itself
					</h3>
					<p className="text-muted-foreground text-balance">
						Dashboard, tables, forms, sidebar — generated from server
						definitions. Customize every view through registries.
					</p>
				</motion.div>

				<div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-[1fr_260px]">
					{/* Left: mockup browser frame */}
					<div className="order-2 relative lg:order-1 border border-border bg-card/20 backdrop-blur-sm">
						{/* Browser chrome */}
						<div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
							<div className="flex gap-1.5">
								<div className="h-2.5 w-2.5 border border-border bg-muted" />
								<div className="h-2.5 w-2.5 border border-border bg-muted" />
								<div className="h-2.5 w-2.5 border border-border bg-muted" />
							</div>
							<div className="ml-2 flex-1 border border-border bg-background/60 backdrop-blur-sm px-3 py-1">
								<span className="font-mono text-[10px] text-muted-foreground">
									localhost:3000/admin
								</span>
							</div>
						</div>

						{/* Crossfading mockup panels */}
						<div className="min-h-80 p-4">
							<AnimatePresence mode="wait">
								<motion.div
									key={active}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.2 }}
								>
									{active === "dashboard" && <DashboardMock />}
									{active === "table" && <TableMock />}
									{active === "form" && <FormMock />}
									{active === "sidebar" && <SidebarMock />}
								</motion.div>
							</AnimatePresence>

							{/* Code overlay */}
							<div className="absolute bottom-0 -right-4 translate-y-1/4 lg:-right-4 max-w-75 border border-primary/70 bg-background/40 backdrop-blur-xl p-4 dark:shadow-[0_0_40px_oklch(0.5984_0.3015_310.74_/_0.08)]">
								<p className="mb-1.5 font-mono text-[8px] uppercase tracking-wider text-primary">
									Server definition
								</p>
								<div className="dark:hidden ">
									<SyntaxHighlighter
										language="typescript"
										style={coldarkCold}
										customStyle={{
											background: "transparent",
											padding: 0,
											margin: 0,
											fontSize: "0.625rem",
											lineHeight: "1.6",
										}}
									>
										{snippets[active]}
									</SyntaxHighlighter>
								</div>
								<div className="hidden dark:block">
									<SyntaxHighlighter
										language="typescript"
										style={coldarkDark}
										customStyle={{
											background: "transparent",
											padding: 0,
											margin: 0,
											fontSize: "0.625rem",
											lineHeight: "1.6",
										}}
									>
										{snippets[active]}
									</SyntaxHighlighter>
								</div>
							</div>
						</div>
					</div>

					{/* Right: switch cards */}
					<div className="order-1 lg:order-2 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
						{tabs.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => handleClick(tab.id)}
								className={cn(
									"min-w-[160px] lg:min-w-0 w-full text-left border p-4 transition-all cursor-pointer",
									active === tab.id
										? "border-primary bg-primary/[0.06] border-l-2 border-l-primary"
										: "border-border bg-card/20 backdrop-blur-sm hover:border-primary/30",
								)}
							>
								<h4
									className={cn(
										"text-sm font-semibold transition-colors",
										active === tab.id ? "text-primary" : "text-foreground",
									)}
								>
									{tab.label}
								</h4>
								<p className="mt-0.5 text-xs text-muted-foreground hidden lg:block">
									{tab.description}
								</p>
							</button>
						))}
					</div>
				</div>

				{/* Link */}
				<div className="mt-8 text-center">
					<Link
						to="/docs/$"
						params={{ _splat: "admin" }}
						className="inline-flex items-center gap-2 font-mono text-xs text-primary transition-colors hover:text-primary/80"
					>
						Explore the admin system →
					</Link>
				</div>
			</div>
		</section>
	);
}

function DashboardMock() {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-3 gap-3">
				{[
					{ label: "Total Posts", value: "248", change: "+12%" },
					{ label: "Published", value: "186", change: "+8%" },
					{ label: "Draft", value: "62", change: "-3%" },
				].map((stat) => (
					<div
						key={stat.label}
						className="border border-border bg-background/60 backdrop-blur-sm p-3"
					>
						<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
							{stat.label}
						</p>
						<p className="mt-1 text-xl font-bold">{stat.value}</p>
						<p className="mt-0.5 text-[10px] text-primary">{stat.change}</p>
					</div>
				))}
			</div>
			<div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
				<div className="border border-border bg-background/60 backdrop-blur-sm p-3">
					<p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
						Content over time
					</p>
					<div className="flex items-end gap-1 h-20">
						{[40, 55, 35, 65, 80, 60, 75, 90, 70, 85, 95, 88].map((h, i) => (
							<div
								key={i}
								className="flex-1 bg-primary/20 transition-all hover:bg-primary/40"
								style={{ height: `${h}%` }}
							/>
						))}
					</div>
				</div>
				<div className="border border-border bg-background/60 backdrop-blur-sm p-3">
					<p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
						Recent items
					</p>
					<div className="space-y-1.5">
						{[
							"Getting Started Guide",
							"API Reference",
							"Migration Notes",
							"v1 Changelog",
						].map((item) => (
							<div key={item} className="flex items-center gap-2 text-xs">
								<div className="h-1.5 w-1.5 bg-primary/40" />
								<span className="text-foreground truncate">{item}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function TableMock() {
	const rows = [
		{
			title: "Getting Started with QUESTPIE",
			author: "Alex K.",
			status: "published",
			updated: "2h ago",
		},
		{
			title: "Advanced Field Patterns",
			author: "Mila J.",
			status: "draft",
			updated: "5h ago",
		},
		{
			title: "Building with Blocks",
			author: "Jaro T.",
			status: "published",
			updated: "1d ago",
		},
		{
			title: "Reactive Form Guide",
			author: "Alex K.",
			status: "draft",
			updated: "2d ago",
		},
	];

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<div className="flex-1 border border-border bg-background/60 backdrop-blur-sm px-3 py-1.5">
					<span className="text-xs text-muted-foreground">Search posts...</span>
				</div>
				<div className="flex gap-1.5">
					{["Status: All", "Author: All"].map((filter) => (
						<span
							key={filter}
							className="border border-border bg-background/60 backdrop-blur-sm px-2 py-1 text-[10px] text-muted-foreground"
						>
							{filter}
						</span>
					))}
				</div>
			</div>
			<div className="border border-border">
				<div className="grid grid-cols-[1fr_0.5fr_0.4fr_0.3fr] gap-2 border-b border-border px-3 py-2 bg-muted/30">
					{["Title", "Author", "Status", "Updated"].map((h) => (
						<span
							key={h}
							className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"
						>
							{h}
						</span>
					))}
				</div>
				{rows.map((row) => (
					<div
						key={row.title}
						className="grid grid-cols-[1fr_0.5fr_0.4fr_0.3fr] gap-2 border-b border-border/50 px-3 py-2"
					>
						<span className="text-xs text-foreground truncate">
							{row.title}
						</span>
						<span className="text-xs text-muted-foreground">{row.author}</span>
						<span
							className={cn(
								"inline-flex w-fit items-center px-1.5 py-0.5 text-[9px] font-medium",
								row.status === "published"
									? "bg-primary/10 text-primary border border-primary/20"
									: "bg-muted text-muted-foreground border border-border",
							)}
						>
							{row.status}
						</span>
						<span className="text-[10px] text-muted-foreground">
							{row.updated}
						</span>
					</div>
				))}
			</div>
			<div className="flex items-center justify-between text-[10px] text-muted-foreground">
				<span>Showing 1-4 of 248</span>
				<div className="flex gap-1">
					{["1", "2", "3"].map((p) => (
						<span
							key={p}
							className={cn(
								"inline-flex h-5 w-5 items-center justify-center border",
								p === "1" ? "border-primary text-primary" : "border-border",
							)}
						>
							{p}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}

function FormMock() {
	return (
		<div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr]">
			<div className="space-y-3">
				<div className="space-y-1.5">
					<label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Title
					</label>
					<div className="border border-border bg-background/60 backdrop-blur-sm px-3 py-2">
						<span className="text-sm text-foreground">
							Getting Started with QUESTPIE
						</span>
					</div>
				</div>
				<div className="space-y-1.5">
					<label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Content
					</label>
					<div className="border border-border bg-background/60 backdrop-blur-sm p-3 min-h-[120px]">
						<div className="flex gap-1 border-b border-border/50 pb-2 mb-2">
							{["B", "I", "U", "H1", "H2"].map((btn) => (
								<span
									key={btn}
									className="inline-flex h-5 w-5 items-center justify-center border border-border/50 text-[9px] text-muted-foreground"
								>
									{btn}
								</span>
							))}
						</div>
						<div className="space-y-1.5">
							<div className="h-2 w-full bg-muted/40" />
							<div className="h-2 w-4/5 bg-muted/40" />
							<div className="h-2 w-full bg-muted/40" />
							<div className="h-2 w-3/5 bg-muted/40" />
						</div>
					</div>
				</div>
			</div>
			<div className="space-y-3">
				<div className="space-y-1.5">
					<label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Author
					</label>
					<div className="flex items-center gap-2 border border-border bg-background/60 backdrop-blur-sm px-3 py-2">
						<div className="h-4 w-4 bg-primary/20" />
						<span className="text-xs text-foreground">Alex K.</span>
					</div>
				</div>
				<div className="space-y-1.5">
					<label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
						Status
					</label>
					<div className="border border-border bg-background/60 backdrop-blur-sm px-3 py-2">
						<span className="inline-flex items-center gap-1 text-xs">
							<span className="h-1.5 w-1.5 bg-primary" />
							Published
						</span>
					</div>
				</div>
				<button
					type="button"
					className="w-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
				>
					Save Changes
				</button>
			</div>
		</div>
	);
}

function SidebarMock() {
	const sections = [
		{
			title: "Overview",
			items: [{ name: "Dashboard", active: true }],
		},
		{
			title: "Content",
			items: [
				{ name: "Posts", count: 248 },
				{ name: "Pages", count: 12 },
				{ name: "Media", count: 1240 },
			],
		},
		{
			title: "System",
			items: [{ name: "Settings" }],
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
			<div className="border border-border bg-background/60 backdrop-blur-sm p-3">
				<div className="mb-3 flex items-center gap-2">
					<div className="h-4 w-4 bg-primary" />
					<span className="text-xs font-bold">My App</span>
				</div>
				<div className="space-y-3">
					{sections.map((section) => (
						<div key={section.title}>
							<p className="mb-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
								{section.title}
							</p>
							<div className="space-y-0.5">
								{section.items.map((item) => (
									<div
										key={item.name}
										className={cn(
											"flex items-center justify-between px-2 py-1.5",
											"active" in item && item.active
												? "border-l-2 border-primary bg-primary/[0.06]"
												: "border-l-2 border-transparent",
										)}
									>
										<span
											className={cn(
												"text-xs",
												"active" in item && item.active
													? "font-medium text-primary"
													: "text-foreground",
											)}
										>
											{item.name}
										</span>
										{"count" in item && (
											<span className="text-[9px] text-muted-foreground">
												{item.count}
											</span>
										)}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
			<div className="space-y-3">
				<div className="border border-border bg-background/60 backdrop-blur-sm p-4">
					<p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
						Server-defined
					</p>
					<p className="text-sm text-muted-foreground">
						Sidebar sections, grouping, and item counts — all from{" "}
						<code className="text-xs text-foreground">.sidebar()</code> in your
						builder config.
					</p>
				</div>
				<div className="border border-border bg-background/60 backdrop-blur-sm p-4">
					<p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
						Client-rendered
					</p>
					<p className="text-sm text-muted-foreground">
						Swap the sidebar component via the client registry to match your
						product's design system.
					</p>
				</div>
			</div>
		</div>
	);
}
