/**
 * News Listing Route
 *
 * Displays published news articles for a city with category filtering.
 */

import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { getNewsList } from "@/lib/server-functions";

const CATEGORIES = [
	{ value: "all", label: "All" },
	{ value: "general", label: "General" },
	{ value: "council", label: "Council" },
	{ value: "events", label: "Events" },
	{ value: "planning", label: "Planning" },
	{ value: "community", label: "Community" },
	{ value: "transport", label: "Transport" },
];

export const Route = createFileRoute("/_app/$citySlug/news/")({
	validateSearch: (search: Record<string, unknown>) => ({
		category: (search.category as string) || "all",
	}),

	loaderDeps: ({ search }) => ({ category: search.category }),

	loader: async ({ params, deps }) => {
		return getNewsList({
			data: {
				citySlug: params.citySlug,
				category: deps.category,
			},
		});
	},

	component: NewsListing,
});

function NewsListing() {
	const { news } = Route.useLoaderData();
	const { category } = Route.useSearch();
	const { citySlug } = useParams({ from: "/_app/$citySlug" });

	return (
		<div className="container mx-auto px-4 py-12">
			<div className="mb-8">
				<h1 className="text-4xl font-bold tracking-tight mb-2">News</h1>
				<p className="text-muted-foreground">
					Latest news and updates from your council.
				</p>
			</div>

			{/* Category Filter */}
			<div className="flex flex-wrap gap-2 mb-8">
				{CATEGORIES.map((cat) => (
					<Link
						key={cat.value}
						to={`/${citySlug}/news`}
						search={{ category: cat.value === "all" ? undefined : cat.value }}
						className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
							(category || "all") === cat.value
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:bg-muted/80"
						}`}
					>
						{cat.label}
					</Link>
				))}
			</div>

			{/* News Grid */}
			{news.length === 0 ? (
				<div className="text-center py-16">
					<p className="text-muted-foreground text-lg">
						No news articles found.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{news.map((article: any) => (
						<Link
							key={article.id}
							to={`/${citySlug}/news/${article.slug}`}
							className="group border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
						>
							{article.image?.url && (
								<img
									src={article.image.url}
									alt={article.title}
									className="w-full h-48 object-cover"
								/>
							)}
							<div className="p-6">
								<div className="flex items-center gap-2 mb-2">
									{article.category && (
										<span className="text-xs font-medium text-primary uppercase tracking-wide">
											{article.category}
										</span>
									)}
									{article.isFeatured && (
										<span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
											Featured
										</span>
									)}
								</div>
								<h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
									{article.title}
								</h3>
								{article.excerpt && (
									<p className="text-sm text-muted-foreground line-clamp-2 mb-3">
										{article.excerpt}
									</p>
								)}
								<div className="flex items-center gap-3 text-xs text-muted-foreground">
									{article.publishedAt && (
										<time>
											{new Date(article.publishedAt).toLocaleDateString(
												"en-GB",
												{
													day: "numeric",
													month: "long",
													year: "numeric",
												},
											)}
										</time>
									)}
									{article.author && <span>by {article.author}</span>}
								</div>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
