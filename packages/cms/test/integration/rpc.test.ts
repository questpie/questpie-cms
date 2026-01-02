import { beforeEach, afterEach, describe, expect, it } from "bun:test";
import { text } from "drizzle-orm/pg-core";
import { z } from "zod";
import {
	defineCollection,
	defineFunction,
	defineGlobal,
	defineQCMS,
	getRequestContext,
} from "#questpie/cms/server";
import { buildMockCMS } from "../utils/mocks/mock-cms-builder";
import { createCMSFetchHandler } from "#questpie/cms/server/adapters/http";

const createModule = () => {
	const ping = defineFunction({
		schema: z.object({ message: z.string() }),
		outputSchema: z.object({
			message: z.string(),
			tenantId: z.string().nullable(),
		}),
		handler: async (input) => {
			const ctx = getRequestContext();
			return {
				message: input.message,
				tenantId: (ctx?.tenantId as string | undefined) ?? null,
			};
		},
	});

	const webhook = defineFunction({
		mode: "raw",
		handler: async ({ request }) => {
			const body = await request.text();
			return new Response(body);
		},
	});

	const posts = defineCollection("posts")
		.fields({
			title: text("title").notNull(),
		})
		.functions({
			publish: defineFunction({
				schema: z.object({ id: z.string() }),
				handler: async (input) => ({ id: input.id }),
			}),
		});

	const settings = defineGlobal("settings")
		.fields({
			title: text("title").notNull(),
		})
		.functions({
			refresh: defineFunction({
				schema: z.object({ ok: z.boolean() }),
				handler: async (input) => ({ ok: input.ok }),
			}),
		});

	return defineQCMS({ name: "rpc-test" })
		.functions({ ping, webhook })
		.collections({ posts })
		.globals({ settings });
};

describe("rpc functions", () => {
	let setup: Awaited<
		ReturnType<typeof buildMockCMS<ReturnType<typeof createModule>>>
	>;

	beforeEach(async () => {
		const module = createModule();
		setup = await buildMockCMS(module);
	});

	afterEach(async () => {
		await setup.cleanup();
	});

	it("executes root functions via cms.api with context", async () => {
		const ctx = await setup.cms.createContext({
			accessMode: "system",
			tenantId: "tenant-1",
		});

		const result = await setup.cms.api.ping({ message: "hi" }, ctx);
		expect(result).toEqual({ message: "hi", tenantId: "tenant-1" });
	});

	it("executes collection/global functions via adapter routes", async () => {
		const handler = createCMSFetchHandler(setup.cms, {
			extendContext: () => ({ tenantId: "tenant-2" }),
		});

		const rootResponse = await handler(
			new Request("http://localhost/cms/rpc/ping", {
				method: "POST",
				body: JSON.stringify({ message: "hello" }),
			}),
		);
		const rootPayload = await rootResponse?.json();
		expect(rootPayload).toEqual({ message: "hello", tenantId: "tenant-2" });

		const collectionResponse = await handler(
			new Request("http://localhost/cms/collections/posts/rpc/publish", {
				method: "POST",
				body: JSON.stringify({ id: "post-1" }),
			}),
		);
		expect(await collectionResponse?.json()).toEqual({ id: "post-1" });

		const globalResponse = await handler(
			new Request("http://localhost/cms/globals/settings/rpc/refresh", {
				method: "POST",
				body: JSON.stringify({ ok: true }),
			}),
		);
		expect(await globalResponse?.json()).toEqual({ ok: true });
	});

	it("handles raw functions without JSON parsing", async () => {
		const handler = createCMSFetchHandler(setup.cms);
		const response = await handler(
			new Request("http://localhost/cms/rpc/webhook", {
				method: "POST",
				body: "raw-payload",
			}),
		);

		expect(await response?.text()).toBe("raw-payload");
	});

	it("returns 400 on invalid JSON input", async () => {
		const handler = createCMSFetchHandler(setup.cms);
		const response = await handler(
			new Request("http://localhost/cms/rpc/ping", {
				method: "POST",
				body: "{invalid",
			}),
		);

		expect(response?.status).toBe(400);
	});
});
