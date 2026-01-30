/**
 * Admin Builder Tests
 *
 * Tests for AdminBuilder class - the main orchestrator for admin configuration.
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { AdminBuilder } from "#questpie/admin/client/builder/admin-builder";
import { SidebarBuilder } from "#questpie/admin/client/builder/sidebar/sidebar-builder";
import {
  createTextField,
  createEmailField,
  createTableView,
  createFormView,
  createStatsWidget,
  createDashboardPage,
  MockIcon,
} from "../utils/helpers";

describe("AdminBuilder.empty()", () => {
  it("should create an empty builder with correct initial state", () => {
    const admin = AdminBuilder.empty();

    expect(admin.state.fields).toEqual({});
    expect(admin.state.listViews).toEqual({});
    expect(admin.state.editViews).toEqual({});
    expect(admin.state.widgets).toEqual({});
    expect(admin.state.pages).toEqual({});
    expect(admin.state.collections).toEqual({});
    expect(admin.state.globals).toEqual({});
  });

  it("should have default dashboard config", () => {
    const admin = AdminBuilder.empty();

    expect(admin.state.dashboard).toEqual({
      layout: "grid",
      widgets: [],
    });
  });

  it("should have default sidebar config", () => {
    const admin = AdminBuilder.empty();

    expect(admin.state.sidebar).toEqual({ sections: [] });
  });

  it("should have default branding config (empty)", () => {
    const admin = AdminBuilder.empty();

    expect(admin.state.branding).toEqual({});
  });

  it("should have default locale config", () => {
    const admin = AdminBuilder.empty();

    expect(admin.state.locale).toEqual({
      default: "en",
      supported: ["en"],
    });
  });

  it("should accept TApp generic parameter", () => {
    type MockCMS = { collections: { posts: any } };
    const admin = AdminBuilder.empty<MockCMS>();

    expect(admin.state["~app"]).toBeUndefined();
    // Type-level: ~app should be MockCMS
    expectTypeOf(admin.state["~app"]).toEqualTypeOf<MockCMS>();
  });
});

describe("AdminBuilder.fields()", () => {
  it("should add field definitions to registry", () => {
    const admin = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    expect(admin.state.fields.text).toBeDefined();
    expect(admin.state.fields.text.name).toBe("text");
  });

  it("should merge with existing fields", () => {
    const admin = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .fields({ email: createEmailField() });

    expect(admin.state.fields.text).toBeDefined();
    expect(admin.state.fields.email).toBeDefined();
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withFields = original.fields({ text: createTextField() });

    expect(original.state.fields).toEqual({});
    expect(withFields.state.fields.text).toBeDefined();
  });

  it("should allow overwriting fields with same key", () => {
    const field1 = createTextField().$options({ maxLength: 100 });
    const field2 = createTextField().$options({ maxLength: 200 });

    const admin = AdminBuilder.empty()
      .fields({ text: field1 })
      .fields({ text: field2 });

    expect(admin.state.fields.text["~options"]).toEqual({ maxLength: 200 });
  });
});

describe("AdminBuilder.views()", () => {
  it("should automatically separate list and edit views", () => {
    const admin = AdminBuilder.empty().views({
      table: createTableView(),
      form: createFormView(),
    });

    expect(admin.state.listViews.table).toBeDefined();
    expect(admin.state.editViews.form).toBeDefined();
  });

  it("should place list views only in listViews", () => {
    const admin = AdminBuilder.empty().views({
      table: createTableView(),
    });

    expect(admin.state.listViews.table).toBeDefined();
    expect((admin.state.editViews as any).table).toBeUndefined();
  });

  it("should place edit views only in editViews", () => {
    const admin = AdminBuilder.empty().views({
      form: createFormView(),
    });

    expect(admin.state.editViews.form).toBeDefined();
    expect((admin.state.listViews as any).form).toBeUndefined();
  });

  it("should merge with existing views", () => {
    const admin = AdminBuilder.empty()
      .views({ table: createTableView() })
      .views({ form: createFormView() });

    expect(admin.state.listViews.table).toBeDefined();
    expect(admin.state.editViews.form).toBeDefined();
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withViews = original.views({ table: createTableView() });

    expect(original.state.listViews).toEqual({});
    expect(withViews.state.listViews.table).toBeDefined();
  });
});

describe("AdminBuilder.widgets()", () => {
  it("should add widget definitions", () => {
    const admin = AdminBuilder.empty().widgets({
      stats: createStatsWidget(),
    });

    expect(admin.state.widgets.stats).toBeDefined();
  });

  it("should merge with existing widgets", () => {
    const admin = AdminBuilder.empty()
      .widgets({ stats: createStatsWidget() })
      .widgets({ chart: createStatsWidget() });

    expect(admin.state.widgets.stats).toBeDefined();
    expect(admin.state.widgets.chart).toBeDefined();
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withWidgets = original.widgets({ stats: createStatsWidget() });

    expect(original.state.widgets).toEqual({});
    expect(withWidgets.state.widgets.stats).toBeDefined();
  });
});

describe("AdminBuilder.pages()", () => {
  it("should add page definitions", () => {
    const admin = AdminBuilder.empty().pages({
      dashboard: createDashboardPage(),
    });

    expect(admin.state.pages.dashboard).toBeDefined();
  });

  it("should merge with existing pages", () => {
    const admin = AdminBuilder.empty()
      .pages({ dashboard: createDashboardPage() })
      .pages({ settings: createDashboardPage() });

    expect(admin.state.pages.dashboard).toBeDefined();
    expect(admin.state.pages.settings).toBeDefined();
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withPages = original.pages({ dashboard: createDashboardPage() });

    expect(original.state.pages).toEqual({});
    expect(withPages.state.pages.dashboard).toBeDefined();
  });
});

describe("AdminBuilder.collections()", () => {
  it("should accept collection config objects", () => {
    const admin = AdminBuilder.empty().collections({
      posts: { name: "posts", fields: {} },
    });

    expect(admin.state.collections.posts).toBeDefined();
    expect(admin.state.collections.posts.name).toBe("posts");
  });

  it("should accept collection builders", async () => {
    const { collection } =
      await import("#questpie/admin/client/builder/collection/collection");
    const postsBuilder = collection("posts");

    const admin = AdminBuilder.empty().collections({
      posts: postsBuilder,
    });

    expect(admin.state.collections.posts).toBeDefined();
  });

  it("should merge with existing collections", () => {
    const admin = AdminBuilder.empty()
      .collections({ posts: { name: "posts" } })
      .collections({ pages: { name: "pages" } });

    expect(admin.state.collections.posts).toBeDefined();
    expect(admin.state.collections.pages).toBeDefined();
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withCollections = original.collections({
      posts: { name: "posts" },
    });

    expect(original.state.collections).toEqual({});
    expect(withCollections.state.collections.posts).toBeDefined();
  });
});

describe("AdminBuilder.globals()", () => {
  it("should accept global config objects", () => {
    const admin = AdminBuilder.empty().globals({
      settings: { name: "settings", fields: {} },
    });

    expect(admin.state.globals.settings).toBeDefined();
  });

  it("should accept global builders", async () => {
    const { global } =
      await import("#questpie/admin/client/builder/global/global");
    const settingsBuilder = global("settings");

    const admin = AdminBuilder.empty().globals({
      settings: settingsBuilder,
    });

    expect(admin.state.globals.settings).toBeDefined();
  });

  it("should merge with existing globals", () => {
    const admin = AdminBuilder.empty()
      .globals({ settings: { name: "settings" } })
      .globals({ theme: { name: "theme" } });

    expect(admin.state.globals.settings).toBeDefined();
    expect(admin.state.globals.theme).toBeDefined();
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withGlobals = original.globals({
      settings: { name: "settings" },
    });

    expect(original.state.globals).toEqual({});
    expect(withGlobals.state.globals.settings).toBeDefined();
  });
});

describe("AdminBuilder.dashboard()", () => {
  it("should set dashboard config", () => {
    const admin = AdminBuilder.empty().dashboard({
      layout: "custom",
      widgets: [{ id: "stats", type: "stats" }],
    });

    expect(admin.state.dashboard).toEqual({
      layout: "custom",
      widgets: [{ id: "stats", type: "stats" }],
    });
  });

  it("should replace existing dashboard config", () => {
    const admin = AdminBuilder.empty()
      .dashboard({ layout: "grid", widgets: [] })
      .dashboard({ layout: "custom", widgets: [{ id: "a" }] });

    expect(admin.state.dashboard.layout).toBe("custom");
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withDashboard = original.dashboard({ layout: "custom", widgets: [] });

    expect(original.state.dashboard.layout).toBe("grid");
    expect(withDashboard.state.dashboard.layout).toBe("custom");
  });
});

describe("AdminBuilder.sidebar()", () => {
  it("should accept SidebarConfig object", () => {
    const admin = AdminBuilder.empty().sidebar({
      sections: [
        {
          id: "content",
          title: "Content",
          items: [],
        },
      ],
    });

    expect(admin.state.sidebar.sections).toHaveLength(1);
    expect(admin.state.sidebar.sections[0].id).toBe("content");
  });

  it("should accept SidebarBuilder", () => {
    const sidebarBuilder = SidebarBuilder.create().section("content", (s) =>
      s.title("Content").items([]),
    );

    const admin = AdminBuilder.empty().sidebar(sidebarBuilder);

    expect(admin.state.sidebar.sections).toHaveLength(1);
    expect(admin.state.sidebar.sections[0].id).toBe("content");
  });

  it("should merge sections (new appends to existing)", () => {
    const admin = AdminBuilder.empty()
      .sidebar({ sections: [{ id: "a", items: [] }] })
      .sidebar({ sections: [{ id: "b", items: [] }] });

    // Both sections should be present (a first, then b appended)
    expect(admin.state.sidebar.sections).toHaveLength(2);
    expect(admin.state.sidebar.sections[0].id).toBe("a");
    expect(admin.state.sidebar.sections[1].id).toBe("b");
  });

  it("should replace section with same id", () => {
    const admin = AdminBuilder.empty()
      .sidebar({ sections: [{ id: "content", title: "Original", items: [] }] })
      .sidebar({ sections: [{ id: "content", title: "Updated", items: [] }] });

    // Only one section, with the updated title
    expect(admin.state.sidebar.sections).toHaveLength(1);
    expect(admin.state.sidebar.sections[0].id).toBe("content");
    expect(admin.state.sidebar.sections[0].title).toBe("Updated");
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withSidebar = original.sidebar({
      sections: [{ id: "content", items: [] }],
    });

    expect(original.state.sidebar.sections).toHaveLength(0);
    expect(withSidebar.state.sidebar.sections).toHaveLength(1);
  });
});

describe("AdminBuilder.extendSidebar()", () => {
  it("should extend existing sidebar sections", () => {
    const admin = AdminBuilder.empty()
      .sidebar({
        sections: [{ id: "content", title: "Content", items: [] }],
      })
      .extendSidebar((s) =>
        s.extend("content", (sec) =>
          sec.addItems([{ type: "collection", collection: "posts" }]),
        ),
      );

    expect(admin.state.sidebar.sections[0].items).toHaveLength(1);
  });

  it("should allow adding new sections", () => {
    const admin = AdminBuilder.empty()
      .sidebar({
        sections: [{ id: "content", title: "Content", items: [] }],
      })
      .extendSidebar((s) =>
        s.append("settings", (sec) => sec.title("Settings").items([])),
      );

    expect(admin.state.sidebar.sections).toHaveLength(2);
    expect(admin.state.sidebar.sections[1].id).toBe("settings");
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty().sidebar({
      sections: [{ id: "content", title: "Content", items: [] }],
    });

    const extended = original.extendSidebar((s) =>
      s.append("settings", (sec) => sec.title("Settings").items([])),
    );

    expect(original.state.sidebar.sections).toHaveLength(1);
    expect(extended.state.sidebar.sections).toHaveLength(2);
  });
});

describe("AdminBuilder.branding()", () => {
  it("should set branding config", () => {
    const admin = AdminBuilder.empty().branding({
      name: "My Admin",
      logo: "/logo.png",
      primaryColor: "#3b82f6",
    });

    expect(admin.state.branding).toEqual({
      name: "My Admin",
      logo: "/logo.png",
      primaryColor: "#3b82f6",
    });
  });

  it("should replace existing branding config", () => {
    const admin = AdminBuilder.empty()
      .branding({ name: "Admin 1" })
      .branding({ name: "Admin 2" });

    expect(admin.state.branding.name).toBe("Admin 2");
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withBranding = original.branding({ name: "My Admin" });

    expect(original.state.branding).toEqual({});
    expect(withBranding.state.branding.name).toBe("My Admin");
  });
});

describe("AdminBuilder.locale()", () => {
  it("should set locale config", () => {
    const admin = AdminBuilder.empty().locale({
      default: "sk",
      supported: ["en", "sk", "cs"],
    });

    expect(admin.state.locale.default).toBe("sk");
    expect(admin.state.locale.supported).toEqual(["en", "sk", "cs"]);
  });

  it("should merge with existing locale config", () => {
    const admin = AdminBuilder.empty()
      .locale({ default: "en" })
      .locale({ supported: ["en", "fr"] });

    expect(admin.state.locale.default).toBe("en");
    expect(admin.state.locale.supported).toEqual(["en", "fr"]);
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withLocale = original.locale({ default: "sk" });

    expect(original.state.locale.default).toBe("en");
    expect(withLocale.state.locale.default).toBe("sk");
  });
});

describe("AdminBuilder.defaultViews()", () => {
  it("should set default views config", () => {
    const admin = AdminBuilder.empty().defaultViews({
      list: "table",
      edit: "form",
    });

    expect(admin.state.defaultViews).toEqual({
      list: "table",
      edit: "form",
    });
  });

  it("should merge with existing default views", () => {
    const admin = AdminBuilder.empty()
      .defaultViews({ list: "table" })
      .defaultViews({ edit: "form" });

    expect(admin.state.defaultViews.list).toBe("table");
    expect(admin.state.defaultViews.edit).toBe("form");
  });

  it("should not mutate original builder", () => {
    const original = AdminBuilder.empty();
    const withDefaultViews = original.defaultViews({ list: "table" });

    expect(original.state.defaultViews).toEqual({});
    expect(withDefaultViews.state.defaultViews.list).toBe("table");
  });
});

describe("AdminBuilder.collection() / .global()", () => {
  it("should create collection builder bound to admin module", () => {
    const admin = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const postsBuilder = admin.collection("posts");

    expect(postsBuilder.state.name).toBe("posts");
    // The builder should have ~adminApp bound
    expect(postsBuilder.state["~adminApp"]).toBe(admin);
  });

  it("should create global builder bound to admin module", () => {
    const admin = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const settingsBuilder = admin.global("settings");

    expect(settingsBuilder.state.name).toBe("settings");
    // The builder should have ~adminApp bound
    expect(settingsBuilder.state["~adminApp"]).toBe(admin);
  });

  it("should give access to module fields in collection", () => {
    const admin = AdminBuilder.empty().fields({
      text: createTextField(),
      email: createEmailField(),
    });

    let receivedR: any;
    admin.collection("posts").fields(({ r }) => {
      receivedR = r;
      return {};
    });

    expect(typeof receivedR.text).toBe("function");
    expect(typeof receivedR.email).toBe("function");
  });

  it("should give access to module fields in global", () => {
    const admin = AdminBuilder.empty().fields({
      text: createTextField(),
      email: createEmailField(),
    });

    let receivedR: any;
    admin.global("settings").fields(({ r }) => {
      receivedR = r;
      return {};
    });

    expect(typeof receivedR.text).toBe("function");
    expect(typeof receivedR.email).toBe("function");
  });
});

describe("AdminBuilder state immutability", () => {
  it("should create new instance on every mutation", () => {
    const a = AdminBuilder.empty();
    const b = a.fields({ text: createTextField() });
    const c = b.views({ table: createTableView() });

    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(a).not.toBe(c);
  });

  it("should allow long method chains", () => {
    const admin = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .views({ table: createTableView(), form: createFormView() })
      .widgets({ stats: createStatsWidget() })
      .pages({ dashboard: createDashboardPage() })
      .collections({ posts: { name: "posts" } })
      .globals({ settings: { name: "settings" } })
      .dashboard({ layout: "grid", widgets: [] })
      .branding({ name: "Test" })
      .locale({ default: "en", supported: ["en"] })
      .defaultViews({ list: "table" });

    expect(admin.state.fields.text).toBeDefined();
    expect(admin.state.listViews.table).toBeDefined();
    expect(admin.state.editViews.form).toBeDefined();
    expect(admin.state.widgets.stats).toBeDefined();
    expect(admin.state.pages.dashboard).toBeDefined();
    expect(admin.state.collections.posts).toBeDefined();
    expect(admin.state.globals.settings).toBeDefined();
    expect(admin.state.branding.name).toBe("Test");
  });
});

describe("AdminBuilder - Type Safety", () => {
  it("should accumulate field types through chain", () => {
    const admin = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .fields({ email: createEmailField() });

    // Type-level: both text and email should be present
    expectTypeOf(admin.state.fields).toHaveProperty("text");
    expectTypeOf(admin.state.fields).toHaveProperty("email");
  });

  it("should separate list and edit views in types", () => {
    const admin = AdminBuilder.empty().views({
      table: createTableView(),
      form: createFormView(),
    });

    // Type-level: table should be in listViews, form in editViews
    expectTypeOf(admin.state.listViews).toHaveProperty("table");
    expectTypeOf(admin.state.editViews).toHaveProperty("form");
  });
});
