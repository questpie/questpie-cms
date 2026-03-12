/**
 * Latest News Block Renderer
 */

import type { BlockProps } from "../.generated/client";

export function LatestNewsRenderer({ values, data }: BlockProps<"latestNews">) {
	const news = (data as any)?.news || [];

	return (
		<section className="py-16 px-6">
			<div className="container mx-auto">
				{values.title && (
					<h2 className="text-3xl font-bold tracking-tight mb-8">
						{values.title}
					</h2>
				)}

				{news.length === 0 && (
					<p className="text-muted-foreground text-center py-8">
						No news articles available.
					</p>
				)}

				<div
					className={
						values.layout === "list"
							? "space-y-4"
							: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
					}
				>
					{news.map((article: any) => (
						<article
							key={article.id}
							className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
						>
							<div className="p-6">
								{article.category && (
									<span className="text-xs font-medium text-primary uppercase tracking-wide">
										{article.category}
									</span>
								)}
								<h3 className="font-semibold mt-1 mb-2">{article.title}</h3>
								{article.excerpt && (
									<p className="text-sm text-muted-foreground line-clamp-2">
										{article.excerpt}
									</p>
								)}
								{article.publishedAt && (
									<time className="text-xs text-muted-foreground mt-3 block">
										{new Date(article.publishedAt).toLocaleDateString("en-GB", {
											day: "numeric",
											month: "long",
											year: "numeric",
										})}
									</time>
								)}
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
