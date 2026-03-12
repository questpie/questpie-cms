import { collection } from "#questpie/server/collection/builder/collection-builder.js";

export default collection("assets")
	.options({ timestamps: true })
	.fields(({ f }) => ({
		width: f.number(),
		height: f.number(),
		alt: f.text(500),
		caption: f.textarea(),
	}))
	.upload({
		visibility: "public",
	})
	.hooks({
		afterDelete: async (ctx) => {
			const storage = (ctx as any).storage;
			const logger = (ctx as any).logger;
			const record = ctx.data as any;
			if (!storage || !record?.key) return;

			try {
				await storage.use().delete(record.key);
			} catch (error) {
				logger?.warn?.("Failed to delete asset file from storage", {
					key: record.key,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		},
	})
	.title(({ f }) => f.filename);
