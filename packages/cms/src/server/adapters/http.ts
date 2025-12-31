import qs from "qs";
import type { QCMS } from "../config/cms";
import type { RequestContext } from "../config/context";
import type { AccessMode } from "../config/types";

export type CMSAdapterConfig = {
	basePath?: string;
	accessMode?: AccessMode;
	getLocale?: (request: Request, cms: QCMS<any, any, any>) => string | undefined;
	getSession?: (
		request: Request,
		cms: QCMS<any, any, any>,
	) => Promise<{ user?: any; session?: any } | null>;
};

export type CMSAdapterContext = {
	user: any;
	session?: any;
	locale?: string;
	cmsContext: RequestContext;
};

export type CMSUploadFile = {
	name: string;
	type: string;
	size: number;
	arrayBuffer: () => Promise<ArrayBuffer>;
};

export type CMSAdapterRoutes = {
	auth: (request: Request) => Promise<Response>;
	storageUpload: (
		request: Request,
		context?: CMSAdapterContext,
		file?: CMSUploadFile | null,
	) => Promise<Response>;
	realtime: {
		subscribe: (
			request: Request,
			params: { collection: string },
			context?: CMSAdapterContext,
		) => Promise<Response>;
		subscribeGlobal: (
			request: Request,
			params: { global: string },
			context?: CMSAdapterContext,
		) => Promise<Response>;
	};
	collections: {
		find: (
			request: Request,
			params: { collection: string },
			context?: CMSAdapterContext,
		) => Promise<Response>;
		create: (
			request: Request,
			params: { collection: string },
			context?: CMSAdapterContext,
			input?: unknown,
		) => Promise<Response>;
		findOne: (
			request: Request,
			params: { collection: string; id: string },
			context?: CMSAdapterContext,
		) => Promise<Response>;
		update: (
			request: Request,
			params: { collection: string; id: string },
			context?: CMSAdapterContext,
			input?: unknown,
		) => Promise<Response>;
		remove: (
			request: Request,
			params: { collection: string; id: string },
			context?: CMSAdapterContext,
		) => Promise<Response>;
		restore: (
			request: Request,
			params: { collection: string; id: string },
			context?: CMSAdapterContext,
		) => Promise<Response>;
	};
	globals: {
		get: (
			request: Request,
			params: { global: string },
			context?: CMSAdapterContext,
		) => Promise<Response>;
		update: (
			request: Request,
			params: { global: string },
			context?: CMSAdapterContext,
			input?: unknown,
		) => Promise<Response>;
	};
};

export type CMSFetchHandler = (
	request: Request,
	context?: CMSAdapterContext,
) => Promise<Response | null>;

const jsonHeaders = {
	"Content-Type": "application/json",
};

const sseHeaders = {
	"Content-Type": "text/event-stream",
	"Cache-Control": "no-cache",
	Connection: "keep-alive",
	"X-Accel-Buffering": "no",
};

const jsonResponse = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: jsonHeaders,
	});

const jsonError = (message: string, status = 500) =>
	jsonResponse({ error: message }, status);

const parseBoolean = (value: unknown) =>
	value === true || value === "true" || value === 1 || value === "1";

const normalizeBasePath = (basePath: string) => {
	const prefixed = basePath.startsWith("/") ? basePath : `/${basePath}`;
	if (prefixed.length > 1 && prefixed.endsWith("/")) {
		return prefixed.slice(0, -1);
	}
	return prefixed;
};

const getQueryParams = (url: URL) =>
	qs.parse(url.search.slice(1), { allowDots: true, comma: true });

const isFileLike = (value: unknown): value is CMSUploadFile =>
	!!value &&
	typeof (value as CMSUploadFile).name === "string" &&
	typeof (value as CMSUploadFile).arrayBuffer === "function";

const resolveUploadFile = async (
	request: Request,
	file?: CMSUploadFile | null,
): Promise<CMSUploadFile | null> => {
	if (file && isFileLike(file)) {
		return file;
	}

	const formData = await request.formData();
	const formFile = formData.get("file");
	return isFileLike(formFile) ? formFile : null;
};

const normalizeMimeType = (value: string) => value.split(";")[0]?.trim() || value;

const resolveSession = async (
	cms: QCMS<any, any, any>,
	request: Request,
	config: CMSAdapterConfig,
) => {
	if (config.getSession) {
		return config.getSession(request, cms);
	}

	if (!cms.auth) {
		return null;
	}

	try {
		const session = await cms.auth.api.getSession({
			headers: request.headers,
		});
		return session ? { user: session.user, session } : null;
	} catch {
		return null;
	}
};

const resolveLocale = async (
	cms: QCMS<any, any, any>,
	request: Request,
	config: CMSAdapterConfig,
) => {
	if (config.getLocale) {
		return config.getLocale(request, cms);
	}

	const header = request.headers.get("accept-language");
	return header?.split(",")[0]?.trim() || undefined;
};

export const createCMSAdapterContext = async (
	cms: QCMS<any, any, any>,
	request: Request,
	config: CMSAdapterConfig = {},
): Promise<CMSAdapterContext> => {
	const [sessionInfo, locale] = await Promise.all([
		resolveSession(cms, request, config),
		resolveLocale(cms, request, config),
	]);

	const cmsContext = await cms.createContext({
		user: sessionInfo?.user ?? null,
		session: sessionInfo?.session,
		locale,
		accessMode: config.accessMode ?? "user",
	});

	return {
		user: sessionInfo?.user ?? null,
		session: sessionInfo?.session,
		locale: cmsContext.locale,
		cmsContext,
	};
};

const parseFindOptions = (url: URL) => {
	const parsedQuery = getQueryParams(url);
	const options: any = {};

	if (parsedQuery.limit !== undefined) options.limit = Number(parsedQuery.limit);
	if (parsedQuery.offset !== undefined) options.offset = Number(parsedQuery.offset);
	if (parsedQuery.page !== undefined) options.page = Number(parsedQuery.page);
	if (parsedQuery.where) options.where = parsedQuery.where;
	if (parsedQuery.orderBy) options.orderBy = parsedQuery.orderBy;
	if (parsedQuery.with) options.with = parsedQuery.with;
	if (parsedQuery.includeDeleted !== undefined) {
		options.includeDeleted = parseBoolean(parsedQuery.includeDeleted);
	}

	return options;
};

const parseFindOneOptions = (url: URL, id: string) => {
	const parsedQuery = getQueryParams(url);
	const options: any = { where: { id } };

	if (parsedQuery.with) options.with = parsedQuery.with;
	if (parsedQuery.includeDeleted !== undefined) {
		options.includeDeleted = parseBoolean(parsedQuery.includeDeleted);
	}

	return options;
};

const parseGlobalGetOptions = (url: URL) => {
	const parsedQuery = getQueryParams(url);
	const options: any = {};

	if (parsedQuery.with) options.with = parsedQuery.with;
	if (parsedQuery.columns) options.columns = parsedQuery.columns;

	return options;
};

const parseGlobalUpdateOptions = (url: URL) => {
	const parsedQuery = getQueryParams(url);
	const options: any = {};

	if (parsedQuery.with) options.with = parsedQuery.with;

	return options;
};

type RealtimeDependencies = {
	collections: Set<string>;
	globals: Set<string>;
};

const visitCollectionRelations = (
	collectionMap: Map<string, any>,
	dependencies: RealtimeDependencies,
	collectionName: string,
	withConfig?: Record<string, any>,
) => {
	if (!withConfig || typeof withConfig !== "object" || Array.isArray(withConfig)) {
		return;
	}

	const collection = collectionMap.get(collectionName);
	if (!collection) return;

	for (const [relationName, relationOptions] of Object.entries(withConfig)) {
		if (!relationOptions) continue;
		const relation = collection.state.relations?.[relationName];
		if (!relation) continue;

		if (relation.type === "polymorphic" && relation.collections) {
			for (const target of Object.values(relation.collections)) {
				dependencies.collections.add(target);
			}
		} else {
			dependencies.collections.add(relation.collection);
		}

		if (relation.type === "manyToMany" && relation.through) {
			dependencies.collections.add(relation.through);
		}

		const nestedWith =
			typeof relationOptions === "object" && !Array.isArray(relationOptions)
				? (relationOptions as any).with
				: undefined;

		if (nestedWith) {
			if (relation.type === "polymorphic" && relation.collections) {
				for (const target of Object.values(relation.collections)) {
					visitCollectionRelations(
						collectionMap,
						dependencies,
						target,
						nestedWith as Record<string, any>,
					);
				}
			} else {
				visitCollectionRelations(
					collectionMap,
					dependencies,
					relation.collection,
					nestedWith as Record<string, any>,
				);
			}
		}
	}
};

const resolveCollectionDependencies = (
	cms: QCMS<any, any, any>,
	baseCollection: string,
	withConfig?: Record<string, any>,
): RealtimeDependencies => {
	const dependencies: RealtimeDependencies = {
		collections: new Set<string>([baseCollection]),
		globals: new Set<string>(),
	};

	const collectionMap = new Map(
		cms.getCollections().map((collection) => [collection.name, collection]),
	);

	visitCollectionRelations(collectionMap, dependencies, baseCollection, withConfig);
	return dependencies;
};

const resolveGlobalDependencies = (
	cms: QCMS<any, any, any>,
	globalName: string,
	withConfig?: Record<string, any>,
): RealtimeDependencies => {
	const dependencies: RealtimeDependencies = {
		collections: new Set<string>(),
		globals: new Set<string>([globalName]),
	};

	if (!withConfig || typeof withConfig !== "object" || Array.isArray(withConfig)) {
		return dependencies;
	}

	const globalMap = new Map(
		cms.getGlobals().map((global) => [global.name, global]),
	);
	const global = globalMap.get(globalName);
	if (!global) return dependencies;

	const collectionMap = new Map(
		cms.getCollections().map((collection) => [collection.name, collection]),
	);

	for (const [relationName, relationOptions] of Object.entries(withConfig)) {
		if (!relationOptions) continue;
		const relation = global.state.relations?.[relationName];
		if (!relation) continue;

		if (relation.type === "polymorphic" && relation.collections) {
			for (const target of Object.values(relation.collections)) {
				dependencies.collections.add(target);
			}
		} else {
			dependencies.collections.add(relation.collection);
		}

		if (relation.type === "manyToMany" && relation.through) {
			dependencies.collections.add(relation.through);
		}

		const nestedWith =
			typeof relationOptions === "object" && !Array.isArray(relationOptions)
				? (relationOptions as any).with
				: undefined;

		if (nestedWith) {
			if (relation.type === "polymorphic" && relation.collections) {
				for (const target of Object.values(relation.collections)) {
					visitCollectionRelations(
						collectionMap,
						dependencies,
						target,
						nestedWith as Record<string, any>,
					);
				}
			} else {
				visitCollectionRelations(
					collectionMap,
					dependencies,
					relation.collection,
					nestedWith as Record<string, any>,
				);
			}
		}
	}

	return dependencies;
};

const resolveContext = async (
	cms: QCMS<any, any, any>,
	request: Request,
	config: CMSAdapterConfig,
	context?: CMSAdapterContext,
) => {
	if (context?.cmsContext) {
		return context;
	}

	return createCMSAdapterContext(cms, request, config);
};

const parseJsonBody = async (request: Request) => {
	try {
		return await request.json();
	} catch {
		return null;
	}
};

export const createCMSAdapterRoutes = (
	cms: QCMS<any, any, any>,
	config: CMSAdapterConfig = {},
): CMSAdapterRoutes => {
	return {
		auth: async (request) => {
			if (!cms.auth) {
				return jsonError("Auth not configured", 500);
			}
			return cms.auth.handler(request);
		},
		storageUpload: async (request, context, file) => {
			if (request.method !== "POST") {
				return jsonError("Method not allowed", 405);
			}

			const resolved = await resolveContext(cms, request, config, context);
			const uploadFile = await resolveUploadFile(request, file);

			if (!uploadFile) {
				return jsonError("No file uploaded. Send 'file' in form-data.", 400);
			}

			try {
				const key = `${crypto.randomUUID()}-${uploadFile.name}`;
				const buffer = await uploadFile.arrayBuffer();
				await cms.storage.put(key, new Uint8Array(buffer));

				const url = await cms.storage.getUrl(key);
				const mimeType = normalizeMimeType(uploadFile.type);
				const asset = await cms.api.collections[
					"questpie_assets" as any
				].create(
					{
						key,
						url,
						filename: uploadFile.name,
						mimeType,
						size: uploadFile.size,
					},
					resolved.cmsContext,
				);

				return jsonResponse(asset);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Unknown error";
				return jsonError(message, 500);
			}
		},
		realtime: {
			subscribe: async (request, params, context) => {
				if (request.method !== "GET") {
					return jsonError("Method not allowed", 405);
				}

				if (!cms.realtime) {
					return jsonError("Realtime not configured", 500);
				}

				const resolved = await resolveContext(cms, request, config, context);
				const crud = cms.api.collections[params.collection as any];

				if (!crud) {
					return jsonError(`Collection "${params.collection}" not found`, 404);
				}

				const options = parseFindOptions(new URL(request.url));
				const dependencies = resolveCollectionDependencies(
					cms,
					params.collection,
					options.with,
				);

				const encoder = new TextEncoder();
				let closeStream: (() => void) | null = null;
				const stream = new ReadableStream({
					start: (controller) => {
						let closed = false;
						let refreshInFlight = false;
						let refreshQueued = false;
						let lastSeq = 0;

						const send = (event: string, data: unknown) => {
							if (closed) return;
							controller.enqueue(
								encoder.encode(
									`event: ${event}\n` +
										`data: ${JSON.stringify(data)}\n\n`,
								),
							);
						};

						const sendError = (error: unknown) => {
							const message =
								error instanceof Error ? error.message : "Unknown error";
							send("error", { message });
						};

						const refresh = async (seq?: number) => {
							if (closed) return;
							if (typeof seq === "number") {
								lastSeq = Math.max(lastSeq, seq);
							}
							if (refreshInFlight) {
								refreshQueued = true;
								return;
							}
							refreshInFlight = true;

							try {
								do {
									refreshQueued = false;
									const data = await crud.find(
										options,
										resolved.cmsContext,
									);
									send("snapshot", { seq: lastSeq, data });
								} while (refreshQueued && !closed);
							} catch (error) {
								sendError(error);
							} finally {
								refreshInFlight = false;
							}
						};

						const unsubscribe = cms.realtime.subscribe((event) => {
							const isCollectionMatch =
								event.resourceType === "collection" &&
								dependencies.collections.has(event.resource);
							const isGlobalMatch =
								event.resourceType === "global" &&
								dependencies.globals.has(event.resource);
							if (!isCollectionMatch && !isGlobalMatch) return;
							void refresh(event.seq);
						});

						const pingTimer = setInterval(() => {
							send("ping", { ts: Date.now() });
						}, 25000);

						const close = () => {
							if (closed) return;
							closed = true;
							clearInterval(pingTimer);
							unsubscribe();
							controller.close();
						};
						closeStream = close;

						if (request.signal) {
							request.signal.addEventListener("abort", close);
						}

						void (async () => {
							try {
								lastSeq = await cms.realtime!.getLatestSeq();
								await refresh(lastSeq);
							} catch (error) {
								sendError(error);
							}
						})();
					},
					cancel: () => {
						closeStream?.();
					},
				});

				return new Response(stream, {
					headers: sseHeaders,
				});
			},
			subscribeGlobal: async (request, params, context) => {
				if (request.method !== "GET") {
					return jsonError("Method not allowed", 405);
				}

				if (!cms.realtime) {
					return jsonError("Realtime not configured", 500);
				}

				const resolved = await resolveContext(cms, request, config, context);
				let globalInstance: any;

				try {
					globalInstance = cms.getGlobalConfig(params.global as any);
				} catch {
					return jsonError(`Global "${params.global}" not found`, 404);
				}

				const crud = globalInstance.generateCRUD(
					resolved.cmsContext.db,
					cms,
				);

				const options = parseFindOptions(new URL(request.url));
				const dependencies = resolveGlobalDependencies(
					cms,
					params.global,
					options.with,
				);

				const encoder = new TextEncoder();
				let closeStream: (() => void) | null = null;
				const stream = new ReadableStream({
					start: (controller) => {
						let closed = false;
						let refreshInFlight = false;
						let refreshQueued = false;
						let lastSeq = 0;

						const send = (event: string, data: unknown) => {
							if (closed) return;
							controller.enqueue(
								encoder.encode(
									`event: ${event}\n` +
										`data: ${JSON.stringify(data)}\n\n`,
								),
							);
						};

						const sendError = (error: unknown) => {
							const message =
								error instanceof Error ? error.message : "Unknown error";
							send("error", { message });
						};

						const refresh = async (seq?: number) => {
							if (closed) return;
							if (typeof seq === "number") {
								lastSeq = Math.max(lastSeq, seq);
							}
							if (refreshInFlight) {
								refreshQueued = true;
								return;
							}
							refreshInFlight = true;

							try {
								do {
									refreshQueued = false;
									const data = await crud.get(options, resolved.cmsContext);
									send("snapshot", { seq: lastSeq, data });
								} while (refreshQueued && !closed);
							} catch (error) {
								sendError(error);
							} finally {
								refreshInFlight = false;
							}
						};

						const unsubscribe = cms.realtime.subscribe((event) => {
							const isCollectionMatch =
								event.resourceType === "collection" &&
								dependencies.collections.has(event.resource);
							const isGlobalMatch =
								event.resourceType === "global" &&
								dependencies.globals.has(event.resource);
							if (!isCollectionMatch && !isGlobalMatch) return;
							void refresh(event.seq);
						});

						const pingTimer = setInterval(() => {
							send("ping", { ts: Date.now() });
						}, 25000);

						const close = () => {
							if (closed) return;
							closed = true;
							clearInterval(pingTimer);
							unsubscribe();
							controller.close();
						};
						closeStream = close;

						if (request.signal) {
							request.signal.addEventListener("abort", close);
						}

						void (async () => {
							try {
								lastSeq = await cms.realtime!.getLatestSeq();
								await refresh(lastSeq);
							} catch (error) {
								sendError(error);
							}
						})();
					},
					cancel: () => {
						closeStream?.();
					},
				});

				return new Response(stream, {
					headers: sseHeaders,
				});
			},
		},
		collections: {
			find: async (request, params, context) => {
				const resolved = await resolveContext(cms, request, config, context);
				const crud = cms.api.collections[params.collection as any];

				if (!crud) {
					return jsonError(`Collection "${params.collection}" not found`, 404);
				}

				try {
					const options = parseFindOptions(new URL(request.url));
					const result = await crud.find(options, resolved.cmsContext);
					return jsonResponse(result);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return jsonError(message, 500);
				}
			},
			create: async (request, params, context, input) => {
				const resolved = await resolveContext(cms, request, config, context);
				const crud = cms.api.collections[params.collection as any];

				if (!crud) {
					return jsonError(`Collection "${params.collection}" not found`, 404);
				}

				const body = input !== undefined ? input : await parseJsonBody(request);
				if (body === null) {
					return jsonError("Invalid JSON body", 400);
				}

				try {
					const result = await crud.create(body, resolved.cmsContext);
					return jsonResponse(result);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return jsonError(message, 400);
				}
			},
			findOne: async (request, params, context) => {
				const resolved = await resolveContext(cms, request, config, context);
				const crud = cms.api.collections[params.collection as any];

				if (!crud) {
					return jsonError(`Collection "${params.collection}" not found`, 404);
				}

				try {
					const options = parseFindOneOptions(
						new URL(request.url),
						params.id,
					);
					const result = await crud.findOne(options, resolved.cmsContext);
					if (!result) {
						return jsonError("Not found", 404);
					}
					return jsonResponse(result);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return jsonError(message, 500);
				}
			},
			update: async (request, params, context, input) => {
				const resolved = await resolveContext(cms, request, config, context);
				const crud = cms.api.collections[params.collection as any];

				if (!crud) {
					return jsonError(`Collection "${params.collection}" not found`, 404);
				}

				const body = input !== undefined ? input : await parseJsonBody(request);
				if (body === null) {
					return jsonError("Invalid JSON body", 400);
				}

				try {
					const result = await crud.updateById(
						{ id: params.id, data: body },
						resolved.cmsContext,
					);
					return jsonResponse(result);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return jsonError(message, 400);
				}
			},
			remove: async (request, params, context) => {
				const resolved = await resolveContext(cms, request, config, context);
				const crud = cms.api.collections[params.collection as any];

				if (!crud) {
					return jsonError(`Collection "${params.collection}" not found`, 404);
				}

				try {
					await crud.deleteById({ id: params.id }, resolved.cmsContext);
					return jsonResponse({ success: true });
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return jsonError(message, 400);
				}
			},
			restore: async (request, params, context) => {
				const resolved = await resolveContext(cms, request, config, context);
				const crud = cms.api.collections[params.collection as any];

				if (!crud) {
					return jsonError(`Collection "${params.collection}" not found`, 404);
				}

				try {
					const result = await crud.restoreById(
						{ id: params.id },
						resolved.cmsContext,
					);
					return jsonResponse(result);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return jsonError(message, 400);
				}
			},
		},
		globals: {
			get: async (request, params, context) => {
				const resolved = await resolveContext(cms, request, config, context);

				try {
					const options = parseGlobalGetOptions(new URL(request.url));
					const globalInstance = cms.getGlobalConfig(params.global as any);
					const crud = globalInstance.generateCRUD(
						resolved.cmsContext.db,
						cms,
					);
					const result = await crud.get(options, resolved.cmsContext);
					return jsonResponse(result);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return jsonError(message, 404);
				}
			},
			update: async (request, params, context, input) => {
				const resolved = await resolveContext(cms, request, config, context);
				const body = input !== undefined ? input : await parseJsonBody(request);
				if (body === null) {
					return jsonError("Invalid JSON body", 400);
				}

				try {
					const options = parseGlobalUpdateOptions(new URL(request.url));
					const globalInstance = cms.getGlobalConfig(params.global as any);
					const crud = globalInstance.generateCRUD(
						resolved.cmsContext.db,
						cms,
					);
					const result = await crud.update(body, options, resolved.cmsContext);
					return jsonResponse(result);
				} catch (error) {
					const message =
						error instanceof Error ? error.message : "Unknown error";
					return jsonError(message, 400);
				}
			},
		},
	};
};

export const createCMSFetchHandler = (
	cms: QCMS<any, any, any>,
	config: CMSAdapterConfig = {},
): CMSFetchHandler => {
	const routes = createCMSAdapterRoutes(cms, config);
	const basePath = normalizeBasePath(config.basePath ?? "/cms");

	return async (request, context) => {
		const url = new URL(request.url);
		const pathname = url.pathname;

		const matchesBase =
			basePath === "/"
				? true
				: pathname === basePath || pathname.startsWith(`${basePath}/`);
		if (!matchesBase) {
			return null;
		}

		const relativePath =
			basePath === "/" ? pathname : pathname.slice(basePath.length);
		let segments = relativePath.split("/").filter(Boolean);

		if (segments.length === 0) {
			return jsonError("Not found", 404);
		}

		if (segments[0] === "cms") {
			segments = segments.slice(1);
		}

		if (segments.length === 0) {
			return jsonError("Not found", 404);
		}

		if (segments[0] === "auth") {
			return routes.auth(request);
		}

		if (segments[0] === "storage" && segments[1] === "upload") {
			return routes.storageUpload(request, context);
		}

		if (segments[0] === "realtime") {
			const maybeGlobals = segments[1];
			if (!maybeGlobals) {
				return jsonError("Collection not specified", 404);
			}

			if (maybeGlobals === "globals") {
				const globalName = segments[2];
				if (!globalName) {
					return jsonError("Global not specified", 404);
				}

				if (request.method === "GET") {
					return routes.realtime.subscribeGlobal(
						request,
						{ global: globalName },
						context,
					);
				}

				return jsonError("Method not allowed", 405);
			}

			if (request.method === "GET") {
				return routes.realtime.subscribe(
					request,
					{ collection: maybeGlobals },
					context,
				);
			}

			return jsonError("Method not allowed", 405);
		}

		if (segments[0] === "globals") {
			const globalName = segments[1];
			if (!globalName) {
				return jsonError("Global not specified", 404);
			}

			if (request.method === "GET") {
				return routes.globals.get(request, { global: globalName }, context);
			}

			if (request.method === "PATCH") {
				return routes.globals.update(request, { global: globalName }, context);
			}

			return jsonError("Method not allowed", 405);
		}

		const collection = segments[0];
		const id = segments[1];
		const action = segments[2];

		if (!id) {
			if (request.method === "GET") {
				return routes.collections.find(request, { collection }, context);
			}

			if (request.method === "POST") {
				return routes.collections.create(request, { collection }, context);
			}

			return jsonError("Method not allowed", 405);
		}

		if (action === "restore") {
			if (request.method === "POST") {
				return routes.collections.restore(
					request,
					{ collection, id },
					context,
				);
			}

			return jsonError("Method not allowed", 405);
		}

		if (request.method === "GET") {
			return routes.collections.findOne(request, { collection, id }, context);
		}

		if (request.method === "PATCH") {
			return routes.collections.update(request, { collection, id }, context);
		}

		if (request.method === "DELETE") {
			return routes.collections.remove(request, { collection, id }, context);
		}

		return jsonError("Method not allowed", 405);
	};
};
