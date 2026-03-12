/**
 * Documents List Block Renderer
 */

import type { BlockProps } from "../.generated/client";

export function DocumentsListRenderer({
	values,
	data,
}: BlockProps<"documentsList">) {
	const documents = (data as any)?.documents || [];

	return (
		<section className="py-16 px-6">
			<div className="container mx-auto">
				{values.title && (
					<h2 className="text-3xl font-bold tracking-tight mb-8">
						{values.title}
					</h2>
				)}

				{documents.length === 0 && (
					<p className="text-muted-foreground text-center py-8">
						No documents available.
					</p>
				)}

				<div className="border rounded-lg divide-y">
					{documents.map((doc: any) => (
						<div
							key={doc.id}
							className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
						>
							<div className="flex-1">
								<h3 className="font-medium">{doc.title}</h3>
								<div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
									{doc.category && (
										<span className="capitalize">{doc.category}</span>
									)}
									{doc.version && <span>v{doc.version}</span>}
									{doc.publishedDate && (
										<time>
											{new Date(doc.publishedDate).toLocaleDateString("en-GB")}
										</time>
									)}
								</div>
							</div>
							{doc.file && (
								<a
									href={doc.file}
									className="text-primary hover:underline text-sm font-medium"
									download
								>
									Download
								</a>
							)}
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
