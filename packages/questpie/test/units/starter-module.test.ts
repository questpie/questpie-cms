import { describe, expect, test } from "bun:test";
import { starter } from "../../src/server/modules/starter/starter.module.js";

describe("starter()", () => {
	test("registers realtime cleanup cron job", () => {
		const mod = starter();
		const realtimeCleanup = mod.jobs!.realtimeCleanup;

		expect(realtimeCleanup).toBeDefined();
		expect(realtimeCleanup.name).toBe("questpie.realtime.cleanup");
		expect(realtimeCleanup.options?.cron).toBe("0 * * * *");
		expect(realtimeCleanup.schema.parse({})).toEqual({});
	});

	test("realtime cleanup job calls realtime service cleanup", async () => {
		const mod = starter();
		const realtimeCleanup = mod.jobs!.realtimeCleanup;
		let called = 0;

		await realtimeCleanup.handler({
			payload: {},
			app: {
				realtime: {
					cleanupOutbox: async (force: boolean) => {
						expect(force).toBe(true);
						called += 1;
					},
				},
			},
			db: {},
		} as any);

		expect(called).toBe(1);
	});

	test("includes all expected collections", () => {
		const mod = starter();
		expect(mod.collections).toBeDefined();
		expect(mod.collections!.user).toBeDefined();
		expect(mod.collections!.assets).toBeDefined();
		expect(mod.collections!.session).toBeDefined();
		expect(mod.collections!.account).toBeDefined();
		expect(mod.collections!.verification).toBeDefined();
		expect(mod.collections!.apikey).toBeDefined();
	});

	test("sets default access to require authentication", () => {
		const mod = starter();
		expect(mod.defaultAccess).toBeDefined();

		const ctx = { session: { id: "test" } } as any;
		const noAuth = { session: null } as any;

		expect(mod.defaultAccess!.read(ctx)).toBe(true);
		expect(mod.defaultAccess!.create(ctx)).toBe(true);
		expect(mod.defaultAccess!.update(ctx)).toBe(true);
		expect(mod.defaultAccess!.delete(ctx)).toBe(true);

		expect(mod.defaultAccess!.read(noAuth)).toBe(false);
		expect(mod.defaultAccess!.create(noAuth)).toBe(false);
		expect(mod.defaultAccess!.update(noAuth)).toBe(false);
		expect(mod.defaultAccess!.delete(noAuth)).toBe(false);
	});

	test("has module name", () => {
		const mod = starter();
		expect(mod.name).toBe("questpie-starter");
	});
});
