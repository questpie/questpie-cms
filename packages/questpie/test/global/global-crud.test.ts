import { describe, it, beforeEach, afterEach, expect } from "bun:test";
import { text, varchar } from "drizzle-orm/pg-core";
import { runTestDbMigrations } from "../utils/test-db";
import { buildMockApp } from "../utils/mocks/mock-app-builder";
import { createTestContext } from "../utils/test-context";
import { collection, global, questpie } from "../../src/server/index.js";

const testModule = questpie({ name: "test-module" })
  .collections({
    posts: collection("posts")
      .fields({
        title: text("title").notNull(),
      })
      .options({
        versioning: true,
      })
      .build(),
  })
  .globals({
    site_config: global("site_config")
      .fields({
        siteName: varchar("site_name", { length: 100 }).notNull(),
        featuredPostId: text("featured_post_id"),
      })
      .relations(({ table, one }) => ({
        featuredPost: one("posts", {
          fields: [table.featuredPostId],
          references: ["id"],
        }),
      }))
      .options({
        versioning: {
          enabled: true,
          maxVersions: 2,
        },
      })
      .build(),
    localized_config: global("localized_config")
      .fields({
        title: text("title"),
      })
      .localized(["title"] as const)
      .build(),
    auto_config: global("auto_config")
      .fields({
        mode: varchar("mode", { length: 20 }).default("auto"),
      })
      .build(),
    read_only_config: global("read_only_config")
      .fields({
        mode: varchar("mode", { length: 20 }).default("read"),
      })
      .access({
        read: true,
        update: false,
      })
      .build(),
  });

describe("global CRUD", () => {
  let setup: Awaited<ReturnType<typeof buildMockApp<typeof testModule>>>;

  beforeEach(async () => {
    setup = await buildMockApp(testModule);
    await runTestDbMigrations(setup.cms);
  });

  afterEach(async () => {
    await setup.cleanup();
  });

  it("supports globals API, versioning, and relations", async () => {
    const ctx = createTestContext({ accessMode: "system" });

    const post = await setup.cms.api.collections.posts.create(
      {
        id: crypto.randomUUID(),
        title: "Hello",
      },
      ctx,
    );

    await setup.cms.api.globals.site_config.update(
      {
        siteName: "One",
      },
      ctx,
    );
    await setup.cms.api.globals.site_config.update(
      {
        siteName: "Two",
      },
      ctx,
    );
    await setup.cms.api.globals.site_config.update(
      {
        siteName: "Three",
        featuredPostId: post.id,
      },
      ctx,
    );

    const versions = await setup.cms.api.globals.site_config.findVersions(
      {},
      ctx,
    );
    expect(versions).toHaveLength(2);
    expect(versions[0].siteName).toBe("Two");

    const fetched = await setup.cms.api.globals.site_config.get(
      { with: { featuredPost: true } },
      ctx,
    );
    expect(fetched?.featuredPost?.title).toBe("Hello");

    await setup.cms.api.globals.site_config.revertToVersion(
      { version: versions[0].versionNumber },
      ctx,
    );

    const reverted = await setup.cms.api.globals.site_config.get({}, ctx);
    expect(reverted?.siteName).toBe("Two");
  });

  it("reverts global versions by versionId", async () => {
    const ctx = createTestContext({ accessMode: "system" });

    await setup.cms.api.globals.site_config.update(
      {
        siteName: "First",
      },
      ctx,
    );
    await setup.cms.api.globals.site_config.update(
      {
        siteName: "Second",
      },
      ctx,
    );

    const versions = await setup.cms.api.globals.site_config.findVersions(
      {},
      ctx,
    );
    await setup.cms.api.globals.site_config.revertToVersion(
      { versionId: versions[0].versionId },
      ctx,
    );

    const reverted = await setup.cms.api.globals.site_config.get({}, ctx);
    expect(reverted?.siteName).toBe("First");
  });

  it("supports localized globals with fallback", async () => {
    const ctxEn = createTestContext({
      accessMode: "system",
      locale: "en",
      defaultLocale: "en",
    });
    const ctxSk = createTestContext({
      accessMode: "system",
      locale: "sk",
      defaultLocale: "en",
    });
    const ctxFr = createTestContext({
      accessMode: "system",
      locale: "fr",
      defaultLocale: "en",
    });

    await setup.cms.api.globals.localized_config.update(
      {
        title: "Hello",
      },
      ctxEn,
    );
    await setup.cms.api.globals.localized_config.update(
      {
        title: "Ahoj",
      },
      ctxSk,
    );

    const sk = await setup.cms.api.globals.localized_config.get({}, ctxSk);
    expect(sk?.title).toBe("Ahoj");

    const fr = await setup.cms.api.globals.localized_config.get({}, ctxFr);
    expect(fr?.title).toBe("Hello");
  });

  it("auto-creates globals on get", async () => {
    const ctx = createTestContext({ accessMode: "system" });

    const created = await setup.cms.api.globals.auto_config.get({}, ctx);
    expect(created?.mode).toBe("auto");
  });

  it("auto-creates globals without update access", async () => {
    const ctx = createTestContext({ accessMode: "user" });

    const created = await setup.cms.api.globals.read_only_config.get({}, ctx);
    expect(created?.mode).toBe("read");
  });
});
