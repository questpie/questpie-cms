import { Icon } from "@iconify/react";
import { Link } from "@tanstack/react-router";

export function Footer() {
	return (
		<footer className="border-t border-border/50 bg-card/20 py-14">
			<div className="mx-auto w-full max-w-7xl px-4">
				<div className="mb-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
					<div className="space-y-4">
						<h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
							Product
						</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<Link
									to="/docs/$"
									className="transition-colors hover:text-primary"
								>
									Docs
								</Link>
							</li>
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "examples" }}
									className="transition-colors hover:text-primary"
								>
									Examples
								</Link>
							</li>
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "start-here" }}
									className="transition-colors hover:text-primary"
								>
									Getting Started
								</Link>
							</li>
							<li>
								<a
									href="https://github.com/questpie/questpie/releases"
									target="_blank"
									rel="noreferrer"
									className="transition-colors hover:text-primary"
								>
									Releases
								</a>
							</li>
						</ul>
					</div>

					<div className="space-y-4">
						<h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
							Ecosystem
						</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "frontend/adapters/hono" }}
									className="transition-colors hover:text-primary"
								>
									Hono
								</Link>
							</li>
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "frontend/adapters/elysia" }}
									className="transition-colors hover:text-primary"
								>
									Elysia
								</Link>
							</li>
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "frontend/adapters/nextjs" }}
									className="transition-colors hover:text-primary"
								>
									Next.js
								</Link>
							</li>
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "frontend/tanstack-query" }}
									className="transition-colors hover:text-primary"
								>
									TanStack
								</Link>
							</li>
						</ul>
					</div>

					<div className="space-y-4">
						<h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
							Community
						</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<a
									href="https://github.com/questpie/questpie"
									target="_blank"
									rel="noreferrer"
									className="transition-colors hover:text-primary"
								>
									GitHub
								</a>
							</li>
							<li>
								<a
									href="https://github.com/questpie/questpie/issues"
									target="_blank"
									rel="noreferrer"
									className="transition-colors hover:text-primary"
								>
									Issues
								</a>
							</li>
							<li>
								<a
									href="https://github.com/questpie/questpie/pulls"
									target="_blank"
									rel="noreferrer"
									className="transition-colors hover:text-primary"
								>
									Pull requests
								</a>
							</li>
						</ul>
					</div>

					<div className="space-y-4">
						<h4 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
							Reference
						</h4>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "reference/collection-api" }}
									className="transition-colors hover:text-primary"
								>
									Collection API
								</Link>
							</li>
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "reference/admin-api" }}
									className="transition-colors hover:text-primary"
								>
									Admin API
								</Link>
							</li>
							<li>
								<Link
									to="/docs/$"
									params={{ _splat: "reference/functions-api" }}
									className="transition-colors hover:text-primary"
								>
									Functions API
								</Link>
							</li>
						</ul>
					</div>
				</div>

				<div className="flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 md:flex-row">
					<p className="text-xs text-muted-foreground">
						© {new Date().getFullYear()} QUESTPIE — Server-first TypeScript
						framework.
					</p>
					<a
						href="https://github.com/questpie/questpie"
						target="_blank"
						rel="noreferrer"
						aria-label="QUESTPIE on GitHub"
						className="text-muted-foreground transition-colors hover:text-foreground"
					>
						<Icon icon="ph:github-logo" className="h-4 w-4" aria-hidden="true" />
					</a>
				</div>
			</div>
		</footer>
	);
}
