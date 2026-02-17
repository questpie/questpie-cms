import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createFetchHandler } from "../../src/server/adapters/http.js";
import { defaultFields } from "../../src/server/fields/builtin/defaults.js";
import { questpie } from "../../src/server/index.js";
import { buildMockApp } from "../utils/mocks/mock-app-builder";
import { runTestDbMigrations } from "../utils/test-db";

const createModule = () => {
	const q = questpie({ name: "adapter-version-routes-test" }).fields(
		defaultFields,
	);

	const posts = q
		.collection("posts")
		.fields((f) => ({
			title: f.text({ required: true }),
		}))
		.options({ softDelete: true, versioning: true });

	const settings = q
		.global("settings")
		.fields((f) => ({
			siteName: f.text({ required: true }),
		}))
		.options({ versioning: true });

	return q.collections({ posts }).globals({ settings });
};

describe("adapter versioning routes", () => {
	let setup: Awaited<
		ReturnType<typeof buildMockApp<ReturnType<typeof createModule>>>
	>;

	beforeEach(async () => {
		setup = await buildMockApp(createModule());
		await runTestDbMigrations(setup.cms);
	});

	afterEach(async () => {
		await setup.cleanup();
	});

	it("supports collection versions and revert endpoints", async () => {
		const handler = createFetchHandler(setup.cms);

		const createResponse = await handler(
			new Request("http://localhost/cms/posts", {
				method: "POST",
				body: JSON.stringify({ title: "Post v1" }),
			}),
		);

		expect(createResponse?.status).toBe(200);
		const created = (await createResponse?.json()) as { id: string };

		const updateV2 = await handler(
			new Request(`http://localhost/cms/posts/${created.id}`, {
				method: "PATCH",
				body: JSON.stringify({ title: "Post v2" }),
			}),
		);
		expect(updateV2?.status).toBe(200);

		const updateV3 = await handler(
			new Request(`http://localhost/cms/posts/${created.id}`, {
				method: "PATCH",
				body: JSON.stringify({ title: "Post v3" }),
			}),
		);
		expect(updateV3?.status).toBe(200);

		const versionsResponse = await handler(
			new Request(`http://localhost/cms/posts/${created.id}/versions`),
		);
		expect(versionsResponse?.status).toBe(200);

		const versions = (await versionsResponse?.json()) as Array<{
			versionNumber: number;
			versionOperation: string;
		}>;

		expect(Array.isArray(versions)).toBe(true);
		expect(versions.length).toBeGreaterThanOrEqual(3);
		expect(versions[0]?.versionNumber).toBe(1);
		expect(versions[0]?.versionOperation).toBe("create");

		const revertResponse = await handler(
			new Request(`http://localhost/cms/posts/${created.id}/revert`, {
				method: "POST",
				body: JSON.stringify({ version: 1 }),
			}),
		);

		expect(revertResponse?.status).toBe(200);
		const reverted = (await revertResponse?.json()) as { title: string };
		expect(reverted.title).toBe("Post v1");
	});

	it("supports global versions and revert endpoints", async () => {
		const handler = createFetchHandler(setup.cms);

		const updateV1 = await handler(
			new Request("http://localhost/cms/globals/settings", {
				method: "PATCH",
				body: JSON.stringify({ siteName: "Site v1" }),
			}),
		);
		expect(updateV1?.status).toBe(200);
		const updatedV1 = (await updateV1?.json()) as { id: string };

		const updateV2 = await handler(
			new Request("http://localhost/cms/globals/settings", {
				method: "PATCH",
				body: JSON.stringify({ siteName: "Site v2" }),
			}),
		);
		expect(updateV2?.status).toBe(200);

		const versionsResponse = await handler(
			new Request(
				`http://localhost/cms/globals/settings/versions?id=${updatedV1.id}`,
			),
		);
		expect(versionsResponse?.status).toBe(200);

		const versions = (await versionsResponse?.json()) as Array<{
			versionNumber: number;
			versionOperation: string;
		}>;

		expect(Array.isArray(versions)).toBe(true);
		expect(versions.length).toBeGreaterThanOrEqual(2);
		expect(versions[0]?.versionNumber).toBe(1);
		expect(versions[0]?.versionOperation).toBe("create");

		const revertResponse = await handler(
			new Request("http://localhost/cms/globals/settings/revert", {
				method: "POST",
				body: JSON.stringify({ version: 1 }),
			}),
		);

		expect(revertResponse?.status).toBe(200);
		const reverted = (await revertResponse?.json()) as { siteName: string };
		expect(reverted.siteName).toBe("Site v1");
	});
});
