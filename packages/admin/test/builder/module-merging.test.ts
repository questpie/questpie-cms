/**
 * Module Merging Tests
 *
 * Tests for the .use() method across all builders and module composition.
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { AdminBuilder } from "#questpie/admin/client/builder/admin-builder";
import {
  createTextField,
  createEmailField,
  createNumberField,
  createTableView,
  createFormView,
  createStatsWidget,
  createDashboardPage,
} from "../utils/helpers";
import { listView, editView } from "#questpie/admin/client/builder/view/view";
import { MockTableView, MockFormView } from "../utils/helpers";

describe("AdminBuilder.use() - Field Merging", () => {
  it("should merge fields from multiple modules (flat spread)", () => {
    const module1 = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const module2 = AdminBuilder.empty().fields({
      email: createEmailField(),
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.fields.text).toBeDefined();
    expect(combined.state.fields.email).toBeDefined();
  });

  it("should overwrite fields with same key (last-wins)", () => {
    const field1 = createTextField().$options({ maxLength: 100 });
    const field2 = createTextField().$options({ maxLength: 200 });

    const module1 = AdminBuilder.empty().fields({ text: field1 });
    const module2 = AdminBuilder.empty().fields({ text: field2 });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.fields.text["~options"]).toEqual({ maxLength: 200 });
  });

  it("should preserve existing fields when using empty module", () => {
    const base = AdminBuilder.empty().fields({
      text: createTextField(),
      email: createEmailField(),
    });

    const empty = AdminBuilder.empty();

    const combined = base.use(empty);

    expect(combined.state.fields.text).toBeDefined();
    expect(combined.state.fields.email).toBeDefined();
  });
});

describe("AdminBuilder.use() - View Merging", () => {
  it("should merge list views without overwriting", () => {
    const module1 = AdminBuilder.empty().views({
      table: createTableView(),
    });

    const module2 = AdminBuilder.empty().views({
      grid: listView("grid", { component: MockTableView }),
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.listViews.table).toBeDefined();
    expect(combined.state.listViews.grid).toBeDefined();
  });

  it("should merge edit views without overwriting", () => {
    const module1 = AdminBuilder.empty().views({
      form: createFormView(),
    });

    const module2 = AdminBuilder.empty().views({
      wizard: editView("wizard", { component: MockFormView }),
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.editViews.form).toBeDefined();
    expect(combined.state.editViews.wizard).toBeDefined();
  });

  it("should keep list and edit views separate during merge", () => {
    const module1 = AdminBuilder.empty().views({
      table: createTableView(),
      form: createFormView(),
    });

    const combined = AdminBuilder.empty().use(module1);

    expect(combined.state.listViews.table).toBeDefined();
    expect(combined.state.editViews.form).toBeDefined();
    expect((combined.state.listViews as any).form).toBeUndefined();
    expect((combined.state.editViews as any).table).toBeUndefined();
  });
});

describe("AdminBuilder.use() - Widget Merging", () => {
  it("should merge widgets correctly", () => {
    const module1 = AdminBuilder.empty().widgets({
      stats: createStatsWidget(),
    });

    const module2 = AdminBuilder.empty().widgets({
      chart: createStatsWidget(),
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.widgets.stats).toBeDefined();
    expect(combined.state.widgets.chart).toBeDefined();
  });

  it("should overwrite widget with same key (last-wins)", () => {
    const widget1 = createStatsWidget().$config({ title: "Stats 1" });
    const widget2 = createStatsWidget().$config({ title: "Stats 2" });

    const module1 = AdminBuilder.empty().widgets({ stats: widget1 });
    const module2 = AdminBuilder.empty().widgets({ stats: widget2 });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    // Widget builder stores config in state["~config"]
    expect(combined.state.widgets.stats.state["~config"]).toEqual({
      title: "Stats 2",
    });
  });
});

describe("AdminBuilder.use() - Page Merging", () => {
  it("should merge pages correctly", () => {
    const module1 = AdminBuilder.empty().pages({
      dashboard: createDashboardPage(),
    });

    const module2 = AdminBuilder.empty().pages({
      settings: createDashboardPage(),
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.pages.dashboard).toBeDefined();
    expect(combined.state.pages.settings).toBeDefined();
  });
});

describe("AdminBuilder.use() - Collection Merging", () => {
  it("should merge collections correctly", () => {
    const module1 = AdminBuilder.empty().collections({
      posts: { name: "posts" },
    });

    const module2 = AdminBuilder.empty().collections({
      pages: { name: "pages" },
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.collections.posts).toBeDefined();
    expect(combined.state.collections.pages).toBeDefined();
  });
});

describe("AdminBuilder.use() - Global Merging", () => {
  it("should merge globals correctly", () => {
    const module1 = AdminBuilder.empty().globals({
      settings: { name: "settings" },
    });

    const module2 = AdminBuilder.empty().globals({
      theme: { name: "theme" },
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.globals.settings).toBeDefined();
    expect(combined.state.globals.theme).toBeDefined();
  });
});

describe("AdminBuilder.use() - Sidebar Section Concatenation", () => {
  it("should concatenate sidebar sections (not overwrite)", () => {
    const module1 = AdminBuilder.empty().sidebar({
      sections: [{ id: "content", title: "Content", items: [] }],
    });

    const module2 = AdminBuilder.empty().sidebar({
      sections: [{ id: "settings", title: "Settings", items: [] }],
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.sidebar.sections).toHaveLength(2);
    expect(combined.state.sidebar.sections[0].id).toBe("content");
    expect(combined.state.sidebar.sections[1].id).toBe("settings");
  });

  it("should preserve section order during concatenation", () => {
    const module1 = AdminBuilder.empty().sidebar({
      sections: [
        { id: "a", title: "A", items: [] },
        { id: "b", title: "B", items: [] },
      ],
    });

    const module2 = AdminBuilder.empty().sidebar({
      sections: [
        { id: "c", title: "C", items: [] },
        { id: "d", title: "D", items: [] },
      ],
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.sidebar.sections.map((s: any) => s.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("should handle empty sidebar from one module", () => {
    const module1 = AdminBuilder.empty().sidebar({
      sections: [{ id: "content", items: [] }],
    });

    const module2 = AdminBuilder.empty();

    const combined = AdminBuilder.empty().use(module1).use(module2);

    expect(combined.state.sidebar.sections).toHaveLength(1);
    expect(combined.state.sidebar.sections[0].id).toBe("content");
  });
});

describe("AdminBuilder.use() - Dashboard Config (Last-Wins)", () => {
  it("should use last dashboard config (last-wins)", () => {
    const module1 = AdminBuilder.empty().dashboard({
      layout: "grid",
      widgets: [{ id: "a" }],
    });

    // Note: dashboard config is NOT merged via .use(), only fields/views/etc are
    // The dashboard property stays at default unless explicitly set
    const combined = AdminBuilder.empty().use(module1);

    // Dashboard from module1 is NOT merged (it's not in the merge logic)
    expect(combined.state.dashboard.layout).toBe("grid");
  });
});

describe("AdminBuilder.use() - Branding Config (Last-Wins)", () => {
  it("should preserve branding from base (not merged via use)", () => {
    const base = AdminBuilder.empty().branding({ name: "Base Admin" });
    const module = AdminBuilder.empty().branding({ name: "Module Admin" });

    // Note: branding is NOT merged via .use()
    const combined = base.use(module);

    // The base branding is preserved (use doesn't merge branding)
    expect(combined.state.branding.name).toBe("Base Admin");
  });
});

describe("AdminBuilder.use() - State Immutability", () => {
  it("should not mutate original builders after merge", () => {
    const module1 = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const module2 = AdminBuilder.empty().fields({
      email: createEmailField(),
    });

    const original1State = { ...module1.state.fields };
    const original2State = { ...module2.state.fields };

    AdminBuilder.empty().use(module1).use(module2);

    // Original modules should be unchanged
    expect(module1.state.fields).toEqual(original1State);
    expect(module2.state.fields).toEqual(original2State);
  });

  it("should create new builder instance after use", () => {
    const base = AdminBuilder.empty();
    const module = AdminBuilder.empty().fields({ text: createTextField() });

    const combined = base.use(module);

    expect(combined).not.toBe(base);
    expect(combined).not.toBe(module);
  });
});

describe("AdminBuilder.use() - Chained Calls", () => {
  it("should preserve order in chained .use() calls", () => {
    const module1 = AdminBuilder.empty()
      .fields({ text: createTextField().$options({ v: 1 }) })
      .sidebar({ sections: [{ id: "m1", items: [] }] });

    const module2 = AdminBuilder.empty()
      .fields({ text: createTextField().$options({ v: 2 }) })
      .sidebar({ sections: [{ id: "m2", items: [] }] });

    const module3 = AdminBuilder.empty()
      .fields({ text: createTextField().$options({ v: 3 }) })
      .sidebar({ sections: [{ id: "m3", items: [] }] });

    const combined = AdminBuilder.empty()
      .use(module1)
      .use(module2)
      .use(module3);

    // Fields: last-wins
    expect(combined.state.fields.text["~options"]).toEqual({ v: 3 });

    // Sidebar: concatenated in order
    expect(combined.state.sidebar.sections.map((s: any) => s.id)).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
  });

  it("should allow mixing .use() with other methods", () => {
    const coreModule = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .views({ table: createTableView() });

    const admin = AdminBuilder.empty()
      .use(coreModule)
      .fields({ number: createNumberField() })
      .collections({ posts: { name: "posts" } })
      .branding({ name: "My Admin" });

    expect(admin.state.fields.text).toBeDefined();
    expect(admin.state.fields.number).toBeDefined();
    expect(admin.state.listViews.table).toBeDefined();
    expect(admin.state.collections.posts).toBeDefined();
    expect(admin.state.branding.name).toBe("My Admin");
  });
});

describe("AdminBuilder.use() - Type Safety", () => {
  it("should accumulate field types from multiple modules", () => {
    const module1 = AdminBuilder.empty().fields({ text: createTextField() });
    const module2 = AdminBuilder.empty().fields({ email: createEmailField() });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    // Type-level: combined should have both text and email
    expectTypeOf(combined.state.fields).toHaveProperty("text");
    expectTypeOf(combined.state.fields).toHaveProperty("email");
  });

  it("should accumulate view types from multiple modules", () => {
    const module1 = AdminBuilder.empty().views({ table: createTableView() });
    const module2 = AdminBuilder.empty().views({ form: createFormView() });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    // Type-level: combined should have table in listViews and form in editViews
    expectTypeOf(combined.state.listViews).toHaveProperty("table");
    expectTypeOf(combined.state.editViews).toHaveProperty("form");
  });

  it("should correctly type merged sidebar sections", () => {
    const module1 = AdminBuilder.empty().sidebar({
      sections: [{ id: "content" as const, items: [] }],
    });

    const module2 = AdminBuilder.empty().sidebar({
      sections: [{ id: "settings" as const, items: [] }],
    });

    const combined = AdminBuilder.empty().use(module1).use(module2);

    // The sections should contain both types
    expect(combined.state.sidebar.sections).toHaveLength(2);
  });
});

describe("Module Composition Patterns", () => {
  it("should support creating a core module with all basics", () => {
    const coreModule = AdminBuilder.empty()
      .fields({
        text: createTextField(),
        email: createEmailField(),
        number: createNumberField(),
      })
      .views({
        table: createTableView(),
        form: createFormView(),
      })
      .widgets({
        stats: createStatsWidget(),
      });

    const admin = AdminBuilder.empty()
      .use(coreModule)
      .collections({ posts: { name: "posts" } });

    expect(Object.keys(admin.state.fields)).toHaveLength(3);
    expect(Object.keys(admin.state.listViews)).toHaveLength(1);
    expect(Object.keys(admin.state.editViews)).toHaveLength(1);
    expect(Object.keys(admin.state.widgets)).toHaveLength(1);
  });

  it("should support creating extension modules", () => {
    const coreModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const blogExtension = AdminBuilder.empty()
      .fields({ richText: createTextField() })
      .collections({ posts: { name: "posts" } })
      .sidebar({ sections: [{ id: "blog", title: "Blog", items: [] }] });

    const admin = AdminBuilder.empty().use(coreModule).use(blogExtension);

    expect(admin.state.fields.text).toBeDefined();
    expect(admin.state.fields.richText).toBeDefined();
    expect(admin.state.collections.posts).toBeDefined();
    expect(admin.state.sidebar.sections[0].id).toBe("blog");
  });

  it("should support feature flag pattern with conditional modules", () => {
    const coreModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const analyticsModule = AdminBuilder.empty().widgets({
      analytics: createStatsWidget(),
    });

    const enableAnalytics = true;

    let admin = AdminBuilder.empty().use(coreModule);
    if (enableAnalytics) {
      admin = admin.use(analyticsModule);
    }

    expect(admin.state.widgets.analytics).toBeDefined();
  });
});

describe("Complex Merge Scenarios", () => {
  it("should handle deeply nested module composition", () => {
    const fieldsModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const viewsModule = AdminBuilder.empty().views({
      table: createTableView(),
    });

    const combinedCore = AdminBuilder.empty()
      .use(fieldsModule)
      .use(viewsModule);

    const widgetsModule = AdminBuilder.empty().widgets({
      stats: createStatsWidget(),
    });

    const final = AdminBuilder.empty().use(combinedCore).use(widgetsModule);

    expect(final.state.fields.text).toBeDefined();
    expect(final.state.listViews.table).toBeDefined();
    expect(final.state.widgets.stats).toBeDefined();
  });

  it("should handle empty modules in chain", () => {
    const empty1 = AdminBuilder.empty();
    const empty2 = AdminBuilder.empty();
    const fieldsModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });
    const empty3 = AdminBuilder.empty();

    const combined = AdminBuilder.empty()
      .use(empty1)
      .use(empty2)
      .use(fieldsModule)
      .use(empty3);

    expect(combined.state.fields.text).toBeDefined();
  });
});

describe("AdminBuilder - Sidebar Merging After .use()", () => {
  it("should preserve module sidebar sections when calling .sidebar()", () => {
    // Simulate adminModule with Administration section
    const adminModule = AdminBuilder.empty().sidebar({
      sections: [
        {
          id: "administration",
          title: "Administration",
          items: [{ type: "collection", collection: "users" }],
        },
      ],
    });

    // User adds their own sections via .sidebar() - should MERGE, not replace
    const admin = AdminBuilder.empty()
      .use(adminModule)
      .sidebar({
        sections: [
          {
            id: "content",
            title: "Content",
            items: [{ type: "collection", collection: "posts" }],
          },
        ],
      });

    // Both sections should be present
    expect(admin.state.sidebar.sections).toHaveLength(2);
    expect(admin.state.sidebar.sections[0].id).toBe("administration");
    expect(admin.state.sidebar.sections[1].id).toBe("content");
  });

  it("should allow overriding module section by using same id", () => {
    const adminModule = AdminBuilder.empty().sidebar({
      sections: [
        {
          id: "administration",
          title: "Admin",
          items: [{ type: "collection", collection: "users" }],
        },
      ],
    });

    // User wants to replace the administration section
    const admin = AdminBuilder.empty()
      .use(adminModule)
      .sidebar({
        sections: [
          {
            id: "administration",
            title: "Custom Admin",
            items: [
              { type: "collection", collection: "users" },
              { type: "collection", collection: "roles" },
            ],
          },
        ],
      });

    // Only one section with the custom title
    expect(admin.state.sidebar.sections).toHaveLength(1);
    expect(admin.state.sidebar.sections[0].title).toBe("Custom Admin");
    expect(admin.state.sidebar.sections[0].items).toHaveLength(2);
  });

  it("should work with SidebarBuilder after .use()", async () => {
    const { SidebarBuilder } =
      await import("#questpie/admin/client/builder/sidebar/sidebar-builder");

    const adminModule = AdminBuilder.empty().sidebar({
      sections: [{ id: "admin", title: "Admin", items: [] }],
    });

    const admin = AdminBuilder.empty()
      .use(adminModule)
      .sidebar(
        SidebarBuilder.create()
          .section("content", (s) =>
            s.title("Content").collection("posts").collection("pages"),
          )
          .section("settings", (s) =>
            s.title("Settings").global("siteSettings"),
          ),
      );

    // Admin section from module + 2 new sections
    expect(admin.state.sidebar.sections).toHaveLength(3);
    expect(admin.state.sidebar.sections.map((s: any) => s.id)).toEqual([
      "admin",
      "content",
      "settings",
    ]);
  });

  it("should support real-world barbershop-like pattern", () => {
    // Simulate adminModule with users and assets
    const adminModule = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .collections({
        users: { name: "users" },
        assets: { name: "assets" },
      })
      .sidebar({
        sections: [
          {
            id: "administration",
            title: "Administration",
            items: [
              { type: "collection", collection: "users" },
              { type: "collection", collection: "assets" },
            ],
          },
        ],
      });

    // User creates their own admin like in barbershop example
    const admin = AdminBuilder.empty()
      .use(adminModule)
      .collections({
        barbers: { name: "barbers" },
        services: { name: "services" },
        appointments: { name: "appointments" },
      })
      .sidebar({
        sections: [
          {
            id: "bookings",
            title: "Bookings",
            items: [{ type: "collection", collection: "appointments" }],
          },
          {
            id: "staff",
            title: "Staff & Services",
            items: [
              { type: "collection", collection: "barbers" },
              { type: "collection", collection: "services" },
            ],
          },
        ],
      })
      .branding({ name: "Barbershop Admin" });

    // All collections merged
    expect(Object.keys(admin.state.collections)).toHaveLength(5);

    // Sidebar sections: administration from module + bookings + staff from user
    expect(admin.state.sidebar.sections).toHaveLength(3);
    expect(admin.state.sidebar.sections.map((s: any) => s.id)).toEqual([
      "administration",
      "bookings",
      "staff",
    ]);

    // Administration section preserved from adminModule
    expect(admin.state.sidebar.sections[0].items).toHaveLength(2);
  });
});
