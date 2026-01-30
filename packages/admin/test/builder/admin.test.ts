/**
 * Admin Runtime Tests
 *
 * Tests for Admin class - runtime wrapper around AdminBuilder state.
 */

import { describe, it, expect } from "vitest";
import { Admin } from "#questpie/admin/client/builder/admin";
import { AdminBuilder } from "#questpie/admin/client/builder/admin-builder";
import { collection } from "#questpie/admin/client/builder/collection/collection";
import { global } from "#questpie/admin/client/builder/global/global";
import { page } from "#questpie/admin/client/builder/page/page";
import {
  createTextField,
  createEmailField,
  createTableView,
  createFormView,
  createStatsWidget,
  createDashboardPage,
} from "../utils/helpers";

describe("Admin.from()", () => {
  it("should create Admin from AdminBuilder", () => {
    const builder = AdminBuilder.empty();
    const admin = Admin.from(builder);

    expect(admin).toBeInstanceOf(Admin);
  });

  it("should extract state from builder", () => {
    const builder = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const admin = Admin.from(builder);

    expect(admin.state).toBe(builder.state);
  });
});

describe("Admin constructor", () => {
  it("should accept state directly", () => {
    const state = {
      "~app": undefined,
      fields: { text: createTextField() },
      listViews: {},
      editViews: {},
      widgets: {},
      pages: {},
      collections: {},
      globals: {},
      dashboard: { layout: "grid" as const, widgets: [] },
      sidebar: { sections: [] },
      branding: {},
      locale: { default: "en", supported: ["en"] },
      defaultViews: {},
    };

    const admin = new Admin(state);

    expect(admin.state).toBe(state);
  });
});

describe("Admin.getCollectionNames()", () => {
  it("should return all collection names", () => {
    const builder = AdminBuilder.empty().collections({
      posts: { name: "posts" },
      pages: { name: "pages" },
      users: { name: "users" },
    });

    const admin = Admin.from(builder);

    expect(admin.getCollectionNames()).toEqual(["posts", "pages", "users"]);
  });

  it("should return empty array when no collections", () => {
    const admin = Admin.from(AdminBuilder.empty());

    expect(admin.getCollectionNames()).toEqual([]);
  });
});

describe("Admin.getCollections()", () => {
  it("should return all collection configurations", () => {
    const builder = AdminBuilder.empty().collections({
      posts: { name: "posts", fields: {} },
      pages: { name: "pages", fields: {} },
    });

    const admin = Admin.from(builder);
    const collections = admin.getCollections();

    expect(collections.posts).toBeDefined();
    expect(collections.pages).toBeDefined();
  });

  it("should extract state from collection builders", () => {
    const postsBuilder = collection("posts").meta({ label: "Blog Posts" });

    const builder = AdminBuilder.empty().collections({
      posts: postsBuilder,
    });

    const admin = Admin.from(builder);
    const collections = admin.getCollections();

    // Should extract .state from builder
    expect(collections.posts.name).toBe("posts");
    expect(collections.posts.label).toBe("Blog Posts");
  });

  it("should pass through plain config objects", () => {
    const builder = AdminBuilder.empty().collections({
      posts: { name: "posts", label: "Posts" },
    });

    const admin = Admin.from(builder);
    const collections = admin.getCollections();

    expect(collections.posts).toEqual({ name: "posts", label: "Posts" });
  });
});

describe("Admin.getCollectionConfig()", () => {
  it("should return specific collection config", () => {
    const builder = AdminBuilder.empty().collections({
      posts: { name: "posts", label: "Blog Posts" },
    });

    const admin = Admin.from(builder);
    const config = admin.getCollectionConfig("posts");

    expect(config).toEqual({ name: "posts", label: "Blog Posts" });
  });

  it("should return undefined for non-existent collection", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const config = admin.getCollectionConfig("nonexistent");

    expect(config).toBeUndefined();
  });

  it("should extract state from builder", () => {
    const postsBuilder = collection("posts").meta({ label: "Posts" });

    const builder = AdminBuilder.empty().collections({
      posts: postsBuilder,
    });

    const admin = Admin.from(builder);
    const config = admin.getCollectionConfig("posts");

    expect(config?.name).toBe("posts");
    expect(config?.label).toBe("Posts");
  });
});

describe("Admin.getGlobalNames()", () => {
  it("should return all global names", () => {
    const builder = AdminBuilder.empty().globals({
      settings: { name: "settings" },
      theme: { name: "theme" },
    });

    const admin = Admin.from(builder);

    expect(admin.getGlobalNames()).toEqual(["settings", "theme"]);
  });

  it("should return empty array when no globals", () => {
    const admin = Admin.from(AdminBuilder.empty());

    expect(admin.getGlobalNames()).toEqual([]);
  });
});

describe("Admin.getGlobals()", () => {
  it("should return all global configurations", () => {
    const builder = AdminBuilder.empty().globals({
      settings: { name: "settings", fields: {} },
      theme: { name: "theme", fields: {} },
    });

    const admin = Admin.from(builder);
    const globals = admin.getGlobals();

    expect(globals.settings).toBeDefined();
    expect(globals.theme).toBeDefined();
  });

  it("should extract state from global builders", () => {
    const settingsBuilder = global("settings").meta({ label: "Site Settings" });

    const builder = AdminBuilder.empty().globals({
      settings: settingsBuilder,
    });

    const admin = Admin.from(builder);
    const globals = admin.getGlobals();

    expect(globals.settings.name).toBe("settings");
    expect(globals.settings.label).toBe("Site Settings");
  });
});

describe("Admin.getGlobalConfig()", () => {
  it("should return specific global config", () => {
    const builder = AdminBuilder.empty().globals({
      settings: { name: "settings", label: "Site Settings" },
    });

    const admin = Admin.from(builder);
    const config = admin.getGlobalConfig("settings");

    expect(config).toEqual({ name: "settings", label: "Site Settings" });
  });

  it("should return undefined for non-existent global", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const config = admin.getGlobalConfig("nonexistent");

    expect(config).toBeUndefined();
  });

  it("should extract state from builder", () => {
    const settingsBuilder = global("settings").meta({ label: "Settings" });

    const builder = AdminBuilder.empty().globals({
      settings: settingsBuilder,
    });

    const admin = Admin.from(builder);
    const config = admin.getGlobalConfig("settings");

    expect(config?.name).toBe("settings");
    expect(config?.label).toBe("Settings");
  });
});

describe("Admin.getPages()", () => {
  it("should return all page configurations", () => {
    const builder = AdminBuilder.empty().pages({
      dashboard: createDashboardPage(),
      analytics: createDashboardPage(),
    });

    const admin = Admin.from(builder);
    const pages = admin.getPages();

    expect(pages.dashboard).toBeDefined();
    expect(pages.analytics).toBeDefined();
  });

  it("should extract state from page builders", () => {
    const dashboardPage = page("dashboard", { component: () => null }).path(
      "/dashboard",
    );

    const builder = AdminBuilder.empty().pages({
      dashboard: dashboardPage,
    });

    const admin = Admin.from(builder);
    const pages = admin.getPages();

    expect(pages.dashboard.name).toBe("dashboard");
    expect(pages.dashboard.path).toBe("/dashboard");
  });
});

describe("Admin.getPageConfig()", () => {
  it("should return specific page config", () => {
    const dashboardPage = page("dashboard", { component: () => null });

    const builder = AdminBuilder.empty().pages({
      dashboard: dashboardPage,
    });

    const admin = Admin.from(builder);
    const config = admin.getPageConfig("dashboard");

    expect(config?.name).toBe("dashboard");
  });

  it("should return undefined for non-existent page", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const config = admin.getPageConfig("nonexistent");

    expect(config).toBeUndefined();
  });
});

describe("Admin.getDashboard()", () => {
  it("should return dashboard config", () => {
    const builder = AdminBuilder.empty().dashboard({
      layout: "custom",
      widgets: [{ id: "stats", type: "stats" }],
    });

    const admin = Admin.from(builder);
    const dashboard = admin.getDashboard();

    expect(dashboard).toEqual({
      layout: "custom",
      widgets: [{ id: "stats", type: "stats" }],
    });
  });

  it("should return default dashboard when not configured", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const dashboard = admin.getDashboard();

    expect(dashboard).toEqual({
      layout: "grid",
      widgets: [],
    });
  });
});

describe("Admin.getSidebar()", () => {
  it("should return sidebar config", () => {
    const builder = AdminBuilder.empty().sidebar({
      sections: [
        { id: "content", title: "Content", items: [] },
        { id: "settings", title: "Settings", items: [] },
      ],
    });

    const admin = Admin.from(builder);
    const sidebar = admin.getSidebar();

    expect(sidebar.sections).toHaveLength(2);
    expect(sidebar.sections[0].id).toBe("content");
  });

  it("should return empty sections when not configured", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const sidebar = admin.getSidebar();

    expect(sidebar.sections).toEqual([]);
  });
});

describe("Admin.getBranding()", () => {
  it("should return branding config", () => {
    const builder = AdminBuilder.empty().branding({
      name: "My Admin",
      logo: "/logo.png",
      primaryColor: "#3b82f6",
    });

    const admin = Admin.from(builder);
    const branding = admin.getBranding();

    expect(branding).toEqual({
      name: "My Admin",
      logo: "/logo.png",
      primaryColor: "#3b82f6",
    });
  });

  it("should return empty object when not configured", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const branding = admin.getBranding();

    expect(branding).toEqual({});
  });
});

describe("Admin.getDefaultViews()", () => {
  it("should return default views config", () => {
    const builder = AdminBuilder.empty().defaultViews({
      list: "table",
      edit: "form",
    });

    const admin = Admin.from(builder);
    const defaultViews = admin.getDefaultViews();

    expect(defaultViews).toEqual({
      list: "table",
      edit: "form",
    });
  });

  it("should return empty object when not configured", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const defaultViews = admin.getDefaultViews();

    expect(defaultViews).toEqual({});
  });
});

describe("Admin.getLocale()", () => {
  it("should return locale config", () => {
    const builder = AdminBuilder.empty().locale({
      default: "sk",
      supported: ["en", "sk", "cs"],
    });

    const admin = Admin.from(builder);
    const locale = admin.getLocale();

    expect(locale.default).toBe("sk");
    expect(locale.supported).toEqual(["en", "sk", "cs"]);
  });

  it("should return default locale when not configured", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const locale = admin.getLocale();

    expect(locale.default).toBe("en");
    expect(locale.supported).toEqual(["en"]);
  });
});

describe("Admin.getAvailableLocales()", () => {
  it("should return supported locales array", () => {
    const builder = AdminBuilder.empty().locale({
      default: "en",
      supported: ["en", "sk", "cs", "de"],
    });

    const admin = Admin.from(builder);

    expect(admin.getAvailableLocales()).toEqual(["en", "sk", "cs", "de"]);
  });

  it("should return default ['en'] when not configured", () => {
    const admin = Admin.from(AdminBuilder.empty());

    expect(admin.getAvailableLocales()).toEqual(["en"]);
  });
});

describe("Admin.getDefaultLocale()", () => {
  it("should return default locale", () => {
    const builder = AdminBuilder.empty().locale({
      default: "sk",
      supported: ["en", "sk"],
    });

    const admin = Admin.from(builder);

    expect(admin.getDefaultLocale()).toBe("sk");
  });

  it("should return 'en' when not configured", () => {
    const admin = Admin.from(AdminBuilder.empty());

    expect(admin.getDefaultLocale()).toBe("en");
  });
});

describe("Admin.getLocaleLabel()", () => {
  it("should return human-readable label for known locales", () => {
    const admin = Admin.from(AdminBuilder.empty());

    expect(admin.getLocaleLabel("en")).toBe("English");
    expect(admin.getLocaleLabel("sk")).toBe("Slovencina");
    expect(admin.getLocaleLabel("cs")).toBe("Cestina");
    expect(admin.getLocaleLabel("de")).toBe("Deutsch");
    expect(admin.getLocaleLabel("fr")).toBe("Francais");
  });

  it("should return uppercase code for unknown locales", () => {
    const admin = Admin.from(AdminBuilder.empty());

    expect(admin.getLocaleLabel("xyz")).toBe("XYZ");
    expect(admin.getLocaleLabel("unknown")).toBe("UNKNOWN");
  });
});

describe("Admin.getFields()", () => {
  it("should return all field definitions", () => {
    const builder = AdminBuilder.empty().fields({
      text: createTextField(),
      email: createEmailField(),
    });

    const admin = Admin.from(builder);
    const fields = admin.getFields();

    expect(fields.text).toBeDefined();
    expect(fields.email).toBeDefined();
  });

  it("should return empty object when no fields", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const fields = admin.getFields();

    expect(fields).toEqual({});
  });
});

describe("Admin.getField()", () => {
  it("should return specific field definition", () => {
    const textField = createTextField();
    const builder = AdminBuilder.empty().fields({
      text: textField,
    });

    const admin = Admin.from(builder);
    const field = admin.getField("text");

    expect(field).toBe(textField);
  });

  it("should return undefined for non-existent field", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const field = admin.getField("nonexistent");

    expect(field).toBeUndefined();
  });
});

describe("Admin.getListViews()", () => {
  it("should return all list view definitions", () => {
    const builder = AdminBuilder.empty().views({
      table: createTableView(),
      form: createFormView(), // This should NOT be in listViews
    });

    const admin = Admin.from(builder);
    const listViews = admin.getListViews();

    expect(listViews.table).toBeDefined();
    expect((listViews as any).form).toBeUndefined();
  });

  it("should return empty object when no list views", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const listViews = admin.getListViews();

    expect(listViews).toEqual({});
  });
});

describe("Admin.getEditViews()", () => {
  it("should return all edit view definitions", () => {
    const builder = AdminBuilder.empty().views({
      table: createTableView(), // This should NOT be in editViews
      form: createFormView(),
    });

    const admin = Admin.from(builder);
    const editViews = admin.getEditViews();

    expect(editViews.form).toBeDefined();
    expect((editViews as any).table).toBeUndefined();
  });

  it("should return empty object when no edit views", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const editViews = admin.getEditViews();

    expect(editViews).toEqual({});
  });
});

describe("Admin.getWidgets()", () => {
  it("should return all widget definitions", () => {
    const builder = AdminBuilder.empty().widgets({
      stats: createStatsWidget(),
    });

    const admin = Admin.from(builder);
    const widgets = admin.getWidgets();

    expect(widgets.stats).toBeDefined();
  });

  it("should return empty object when no widgets", () => {
    const admin = Admin.from(AdminBuilder.empty());
    const widgets = admin.getWidgets();

    expect(widgets).toEqual({});
  });
});

describe("Admin - Complex State Extraction", () => {
  it("should handle mixed builder and config objects", () => {
    const postsBuilder = collection("posts").meta({ label: "Posts" });
    const pagesConfig = { name: "pages", label: "Pages" };

    const settingsBuilder = global("settings").meta({ label: "Settings" });
    const themeConfig = { name: "theme", label: "Theme" };

    const builder = AdminBuilder.empty()
      .collections({
        posts: postsBuilder,
        pages: pagesConfig,
      })
      .globals({
        settings: settingsBuilder,
        theme: themeConfig,
      });

    const admin = Admin.from(builder);

    // Collections
    expect(admin.getCollectionConfig("posts")?.label).toBe("Posts");
    expect(admin.getCollectionConfig("pages")?.label).toBe("Pages");

    // Globals
    expect(admin.getGlobalConfig("settings")?.label).toBe("Settings");
    expect(admin.getGlobalConfig("theme")?.label).toBe("Theme");
  });

  it("should work with complete admin configuration", () => {
    const builder = AdminBuilder.empty()
      .fields({
        text: createTextField(),
        email: createEmailField(),
      })
      .views({
        table: createTableView(),
        form: createFormView(),
      })
      .widgets({
        stats: createStatsWidget(),
      })
      .pages({
        dashboard: createDashboardPage(),
      })
      .collections({
        posts: { name: "posts" },
      })
      .globals({
        settings: { name: "settings" },
      })
      .sidebar({
        sections: [{ id: "content", items: [] }],
      })
      .dashboard({
        layout: "grid",
        widgets: [],
      })
      .branding({
        name: "Test Admin",
      })
      .locale({
        default: "en",
        supported: ["en", "sk"],
      })
      .defaultViews({
        list: "table",
      });

    const admin = Admin.from(builder);

    // Verify all getters work
    expect(Object.keys(admin.getFields())).toHaveLength(2);
    expect(Object.keys(admin.getListViews())).toHaveLength(1);
    expect(Object.keys(admin.getEditViews())).toHaveLength(1);
    expect(Object.keys(admin.getWidgets())).toHaveLength(1);
    expect(Object.keys(admin.getPages())).toHaveLength(1);
    expect(admin.getCollectionNames()).toHaveLength(1);
    expect(admin.getGlobalNames()).toHaveLength(1);
    expect(admin.getSidebar().sections).toHaveLength(1);
    expect(admin.getDashboard().layout).toBe("grid");
    expect(admin.getBranding().name).toBe("Test Admin");
    expect(admin.getDefaultLocale()).toBe("en");
    expect(admin.getAvailableLocales()).toEqual(["en", "sk"]);
    expect(admin.getDefaultViews().list).toBe("table");
  });
});
