const trustItems = [
	"TypeScript",
	"Drizzle ORM",
	"Zod",
	"Better Auth",
	"Hono",
	"Elysia",
	"TanStack",
];

export function NumbersStrip() {
	return (
		<section className="border-y border-border/40">
			<div className="mx-auto w-full max-w-7xl px-4 py-6">
				<p className="text-center text-sm text-muted-foreground">
					<span className="mr-3 font-mono text-[11px] uppercase tracking-[0.18em]">
						Built on
					</span>
					{trustItems.map((item, i) => (
						<span key={item}>
							<span className="font-medium text-foreground">{item}</span>
							{i < trustItems.length - 1 && (
								<span className="mx-2 text-border">·</span>
							)}
						</span>
					))}
				</p>
			</div>
		</section>
	);
}
