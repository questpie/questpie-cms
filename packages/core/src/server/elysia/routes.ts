import type { QCMS } from "#questpie/core/server/config/cms";
import { Elysia } from "elysia";

export const createRoutes = (cms: QCMS) => (app: Elysia) => {
	const api = new Elysia({ prefix: "/api/cms" });

	// Auth Handler
	app.all("/api/auth/*", ({ request }: { request: Request }) => {
		return cms.auth.handler(request);
	});

	// Storage Upload Handler
	app.post(
		"/api/storage/upload",
		async ({ request, query, cmsContext }: any) => {
			const formData = await request.formData();
			const file = formData.get("file");

			if (!file || !(file instanceof File)) {
				throw new Error("No file uploaded. Send 'file' in form-data.");
			}

			// Use a simple strategy: uuid-filename
			const key = `${crypto.randomUUID()}-${file.name}`;

			// Use the storage service
			const storage = cms.storage;
			const buffer = await file.arrayBuffer();
			await storage.put(key, new Uint8Array(buffer));

			const url = await storage.getUrl(key);

			// Create Asset Record in Central Library
			const assetsCrud = cms.api.collections["questpie_assets" as any];
			const asset = await assetsCrud.create(
				{
					key,
					url,
					filename: file.name,
					mimeType: file.type,
					size: file.size,
					// TODO: Add image processing for width/height
				},
				cmsContext,
			);

			return asset;
		},
	);

	api.group("/globals/:global", (app) =>
		app
			.get("/", async ({ params: { global }, query, cmsContext }: any) => {
				const globalInstance = cms.getGlobalConfig(global);
				const crud = globalInstance.generateCRUD(cmsContext.db, cms);
				return await crud.get({}, cmsContext);
			})
			.post("/", async ({ params: { global }, body, cmsContext }: any) => {
				const globalInstance = cms.getGlobalConfig(global);
				const crud = globalInstance.generateCRUD(cmsContext.db, cms);
				return await crud.update(body, cmsContext);
			})
			.patch("/", async ({ params: { global }, body, cmsContext }: any) => {
				const globalInstance = cms.getGlobalConfig(global);
				const crud = globalInstance.generateCRUD(cmsContext.db, cms);
				return await crud.update(body, cmsContext);
			})
			.get(
				"/versions",
				async ({ params: { global }, query, cmsContext }: any) => {
					const globalInstance = cms.getGlobalConfig(global);
					const crud = globalInstance.generateCRUD(cmsContext.db, cms);
					const options: any = {};
					if (query.limit) options.limit = Number(query.limit);
					if (query.offset) options.offset = Number(query.offset);

					if (crud.findVersions) {
						return await crud.findVersions(options, cmsContext);
					}
					throw new Error("Versioning not supported");
				},
			)
			.post(
				"/revert/:version",
				async ({ params: { global, version }, cmsContext }: any) => {
					const globalInstance = cms.getGlobalConfig(global);
					const crud = globalInstance.generateCRUD(cmsContext.db, cms);
					if (crud.revertToVersion) {
						return await crud.revertToVersion(
							{ versionId: version }, // Using ID or version number depending on implementation
							cmsContext,
						);
					}
					throw new Error("Versioning not supported");
				},
			),
	);

	api.group("/:collection", (app) =>
		app
			.get("/", async ({ params: { collection }, query, cmsContext }: any) => {
				const crud = cms.api.collections[collection];

				const options: any = {};
				if (query.limit) options.limit = Number(query.limit);
				if (query.offset) options.offset = Number(query.offset);
				if (query.where) {
					try {
						options.where = JSON.parse(query.where);
					} catch {}
				}
				if (query.orderBy) {
					try {
						options.orderBy = JSON.parse(query.orderBy);
					} catch {}
				}
				if (query.with) {
					try {
						options.with = JSON.parse(query.with);
					} catch {}
				}

				return await crud.find(options, cmsContext);
			})
			.post("/", async ({ params: { collection }, body, cmsContext }: any) => {
				const crud = cms.api.collections[collection];
				return await crud.create(body, cmsContext);
			})
			.get(
				"/:id",
				async ({ params: { collection, id }, query, cmsContext }: any) => {
					const crud = cms.api.collections[collection];
					const options: any = { where: { id } };

					if (query.with) {
						try {
							options.with = JSON.parse(query.with);
						} catch {}
					}

					return await crud.findOne(options, cmsContext);
				},
			)
			.patch(
				"/:id",
				async ({ params: { collection, id }, body, cmsContext }: any) => {
					const crud = cms.api.collections[collection];
					return await crud.updateById({ id, data: body }, cmsContext);
				},
			)
			.delete(
				"/:id",
				async ({ params: { collection, id }, cmsContext }: any) => {
					const crud = cms.api.collections[collection];
					return await crud.deleteById({ id }, cmsContext);
				},
			)
			.get(
				"/:id/versions",
				async ({ params: { collection, id }, query, cmsContext }: any) => {
					const crud = cms.api.collections[collection];
					const options: any = { id };
					if (query.limit) options.limit = Number(query.limit);
					if (query.offset) options.offset = Number(query.offset);

					if (crud.findVersions) {
						return await crud.findVersions(options, cmsContext);
					}
					throw new Error("Versioning not supported");
				},
			)
			.post(
				"/:id/revert/:version",
				async ({ params: { collection, id, version }, cmsContext }: any) => {
					const crud = cms.api.collections[collection];
					if (crud.revertToVersion) {
						return await crud.revertToVersion(
							{ id, version: Number(version) },
							cmsContext,
						);
					}
					throw new Error("Versioning not supported");
				},
			),
	);

	return app.use(api);
};
