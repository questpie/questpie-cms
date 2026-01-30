/**
 * Sidebar Builder Tests
 *
 * Tests for SidebarBuilder, SectionBuilder, sidebar() and section() factories.
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import {
  sidebar,
  section,
  SidebarBuilder,
  SectionBuilder,
} from "#questpie/admin/client/builder/sidebar/sidebar-builder";
import { MockIcon } from "../utils/helpers";

describe("SectionBuilder.create()", () => {
  it("should create a section with the given id", () => {
    const sec = SectionBuilder.create("content");

    expect(sec.id).toBe("content");
  });

  it("should initialize with empty items", () => {
    const sec = SectionBuilder.create("content");
    const built = sec.build();

    expect(built.items).toEqual([]);
  });
});

describe("SectionBuilder.title()", () => {
  it("should set section title", () => {
    const sec = SectionBuilder.create("content").title("Content");
    const built = sec.build();

    expect(built.title).toBe("Content");
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.title("Content");

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.icon()", () => {
  it("should set section icon", () => {
    const sec = SectionBuilder.create("content").icon(MockIcon);
    const built = sec.build();

    expect(built.icon).toBe(MockIcon);
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.icon(MockIcon);

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.collapsed()", () => {
  it("should set collapsed to true by default", () => {
    const sec = SectionBuilder.create("settings").collapsed();
    const built = sec.build();

    expect(built.collapsed).toBe(true);
  });

  it("should accept explicit false", () => {
    const sec = SectionBuilder.create("settings").collapsed(false);
    const built = sec.build();

    expect(built.collapsed).toBe(false);
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.collapsed();

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.items()", () => {
  it("should set section items (replaces existing)", () => {
    const sec = SectionBuilder.create("content")
      .items([{ type: "collection", collection: "posts" }])
      .items([{ type: "collection", collection: "pages" }]);

    const built = sec.build();

    expect(built.items).toHaveLength(1);
    expect((built.items[0] as any).collection).toBe("pages");
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.items([]);

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.addItems()", () => {
  it("should add items to the end", () => {
    const sec = SectionBuilder.create("content")
      .items([{ type: "collection", collection: "posts" }])
      .addItems([{ type: "collection", collection: "pages" }]);

    const built = sec.build();

    expect(built.items).toHaveLength(2);
    expect((built.items[0] as any).collection).toBe("posts");
    expect((built.items[1] as any).collection).toBe("pages");
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.addItems([]);

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.prependItems()", () => {
  it("should add items to the beginning", () => {
    const sec = SectionBuilder.create("content")
      .items([{ type: "collection", collection: "posts" }])
      .prependItems([{ type: "collection", collection: "pages" }]);

    const built = sec.build();

    expect(built.items).toHaveLength(2);
    expect((built.items[0] as any).collection).toBe("pages");
    expect((built.items[1] as any).collection).toBe("posts");
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.prependItems([]);

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.item()", () => {
  it("should add a single item", () => {
    const sec = SectionBuilder.create("content").item({
      type: "collection",
      collection: "posts",
    });

    const built = sec.build();

    expect(built.items).toHaveLength(1);
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.item({ type: "divider" });

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.collection()", () => {
  it("should add a collection item", () => {
    const sec = SectionBuilder.create("content").collection("posts");

    const built = sec.build();

    expect(built.items).toHaveLength(1);
    expect(built.items[0]).toEqual({
      type: "collection",
      collection: "posts",
    });
  });

  it("should accept options", () => {
    const sec = SectionBuilder.create("content").collection("posts", {
      label: "Blog Posts",
      icon: MockIcon,
    });

    const built = sec.build();

    expect(built.items[0]).toEqual({
      type: "collection",
      collection: "posts",
      label: "Blog Posts",
      icon: MockIcon,
    });
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.collection("posts");

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.global()", () => {
  it("should add a global item", () => {
    const sec = SectionBuilder.create("settings").global("siteSettings");

    const built = sec.build();

    expect(built.items).toHaveLength(1);
    expect(built.items[0]).toEqual({
      type: "global",
      global: "siteSettings",
    });
  });

  it("should accept options", () => {
    const sec = SectionBuilder.create("settings").global("siteSettings", {
      label: "Site Settings",
      icon: MockIcon,
    });

    const built = sec.build();

    expect(built.items[0]).toEqual({
      type: "global",
      global: "siteSettings",
      label: "Site Settings",
      icon: MockIcon,
    });
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("settings");
    const result = sec.global("settings");

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.link()", () => {
  it("should add a link item", () => {
    const sec = SectionBuilder.create("external").link("Docs", "/docs");

    const built = sec.build();

    expect(built.items).toHaveLength(1);
    expect(built.items[0]).toEqual({
      type: "link",
      label: "Docs",
      href: "/docs",
    });
  });

  it("should accept options", () => {
    const sec = SectionBuilder.create("external").link(
      "GitHub",
      "https://github.com",
      {
        icon: MockIcon,
        external: true,
      },
    );

    const built = sec.build();

    expect(built.items[0]).toEqual({
      type: "link",
      label: "GitHub",
      href: "https://github.com",
      icon: MockIcon,
      external: true,
    });
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("external");
    const result = sec.link("Docs", "/docs");

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.page()", () => {
  it("should add a page item", () => {
    const sec = SectionBuilder.create("pages").page("dashboard");

    const built = sec.build();

    expect(built.items).toHaveLength(1);
    expect(built.items[0]).toEqual({
      type: "page",
      pageId: "dashboard",
    });
  });

  it("should accept options", () => {
    const sec = SectionBuilder.create("pages").page("dashboard", {
      label: "Dashboard",
      icon: MockIcon,
    });

    const built = sec.build();

    expect(built.items[0]).toEqual({
      type: "page",
      pageId: "dashboard",
      label: "Dashboard",
      icon: MockIcon,
    });
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("pages");
    const result = sec.page("dashboard");

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.divider()", () => {
  it("should add a divider item", () => {
    const sec = SectionBuilder.create("content")
      .collection("posts")
      .divider()
      .collection("pages");

    const built = sec.build();

    expect(built.items).toHaveLength(3);
    expect(built.items[1]).toEqual({ type: "divider" });
  });

  it("should return this for chaining", () => {
    const sec = SectionBuilder.create("content");
    const result = sec.divider();

    expect(result).toBe(sec);
  });
});

describe("SectionBuilder.build()", () => {
  it("should return complete SidebarSection", () => {
    const sec = SectionBuilder.create("content")
      .title("Content")
      .icon(MockIcon)
      .collapsed()
      .collection("posts")
      .collection("pages");

    const built = sec.build();

    expect(built).toEqual({
      id: "content",
      title: "Content",
      icon: MockIcon,
      collapsed: true,
      items: [
        { type: "collection", collection: "posts" },
        { type: "collection", collection: "pages" },
      ],
    });
  });
});

describe("section() factory", () => {
  it("should create SectionBuilder with id", () => {
    const sec = section("content");

    expect(sec).toBeInstanceOf(SectionBuilder);
    expect(sec.id).toBe("content");
  });
});

// ============================================================================
// SidebarBuilder Tests
// ============================================================================

describe("SidebarBuilder.create()", () => {
  it("should create empty sidebar builder", () => {
    const sb = SidebarBuilder.create();
    const built = sb.build();

    expect(built.sections).toEqual([]);
  });
});

describe("SidebarBuilder.from()", () => {
  it("should create builder from existing config", () => {
    const config = {
      sections: [
        { id: "content", title: "Content", items: [] },
        { id: "settings", title: "Settings", items: [] },
      ],
    };

    const sb = SidebarBuilder.from(config);
    const built = sb.build();

    expect(built.sections).toHaveLength(2);
    expect(built.sections[0].id).toBe("content");
    expect(built.sections[1].id).toBe("settings");
  });

  it("should preserve section order from config", () => {
    const config = {
      sections: [
        { id: "z", items: [] },
        { id: "a", items: [] },
        { id: "m", items: [] },
      ],
    };

    const sb = SidebarBuilder.from(config);
    const built = sb.build();

    expect(built.sections.map((s) => s.id)).toEqual(["z", "a", "m"]);
  });
});

describe("SidebarBuilder.section()", () => {
  it("should add a section", () => {
    const sb = SidebarBuilder.create().section("content", (s) =>
      s.title("Content").items([]),
    );

    const built = sb.build();

    expect(built.sections).toHaveLength(1);
    expect(built.sections[0].id).toBe("content");
    expect(built.sections[0].title).toBe("Content");
  });

  it("should add multiple sections in order", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) => s.title("Content").items([]))
      .section("settings", (s) => s.title("Settings").items([]));

    const built = sb.build();

    expect(built.sections).toHaveLength(2);
    expect(built.sections[0].id).toBe("content");
    expect(built.sections[1].id).toBe("settings");
  });

  it("should update existing section if same id", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) => s.title("Content 1").items([]))
      .section("content", (s) => s.title("Content 2").items([]));

    const built = sb.build();

    expect(built.sections).toHaveLength(1);
    expect(built.sections[0].title).toBe("Content 2");
  });
});

describe("SidebarBuilder.prepend()", () => {
  it("should add section at the beginning", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) => s.title("Content").items([]))
      .prepend("dashboard", (s) => s.title("Dashboard").items([]));

    const built = sb.build();

    expect(built.sections).toHaveLength(2);
    expect(built.sections[0].id).toBe("dashboard");
    expect(built.sections[1].id).toBe("content");
  });

  it("should move existing section to beginning if same id", () => {
    const sb = SidebarBuilder.create()
      .section("a", (s) => s.items([]))
      .section("b", (s) => s.items([]))
      .section("c", (s) => s.items([]))
      .prepend("c", (s) => s.title("C Updated").items([]));

    const built = sb.build();

    expect(built.sections.map((s) => s.id)).toEqual(["c", "a", "b"]);
    expect(built.sections[0].title).toBe("C Updated");
  });
});

describe("SidebarBuilder.append()", () => {
  it("should add section at the end", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) => s.title("Content").items([]))
      .append("settings", (s) => s.title("Settings").items([]));

    const built = sb.build();

    expect(built.sections).toHaveLength(2);
    expect(built.sections[0].id).toBe("content");
    expect(built.sections[1].id).toBe("settings");
  });

  it("should move existing section to end if same id", () => {
    const sb = SidebarBuilder.create()
      .section("a", (s) => s.items([]))
      .section("b", (s) => s.items([]))
      .section("c", (s) => s.items([]))
      .append("a", (s) => s.title("A Updated").items([]));

    const built = sb.build();

    expect(built.sections.map((s) => s.id)).toEqual(["b", "c", "a"]);
    expect(built.sections[2].title).toBe("A Updated");
  });
});

describe("SidebarBuilder.insertBefore()", () => {
  it("should insert section before specified section", () => {
    const sb = SidebarBuilder.create()
      .section("a", (s) => s.items([]))
      .section("c", (s) => s.items([]))
      .insertBefore("c", "b", (s) => s.items([]));

    const built = sb.build();

    expect(built.sections.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("should append if beforeId not found", () => {
    const sb = SidebarBuilder.create()
      .section("a", (s) => s.items([]))
      .insertBefore("nonexistent" as any, "b", (s) => s.items([]));

    const built = sb.build();

    expect(built.sections.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("SidebarBuilder.insertAfter()", () => {
  it("should insert section after specified section", () => {
    const sb = SidebarBuilder.create()
      .section("a", (s) => s.items([]))
      .section("c", (s) => s.items([]))
      .insertAfter("a", "b", (s) => s.items([]));

    const built = sb.build();

    expect(built.sections.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("should append if afterId not found", () => {
    const sb = SidebarBuilder.create()
      .section("a", (s) => s.items([]))
      .insertAfter("nonexistent" as any, "b", (s) => s.items([]));

    const built = sb.build();

    expect(built.sections.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("SidebarBuilder.extend()", () => {
  it("should modify existing section", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) =>
        s.title("Content").items([{ type: "collection", collection: "posts" }]),
      )
      .extend("content", (s) =>
        s.addItems([{ type: "collection", collection: "pages" }]),
      );

    const built = sb.build();

    expect(built.sections[0].items).toHaveLength(2);
    expect((built.sections[0].items[0] as any).collection).toBe("posts");
    expect((built.sections[0].items[1] as any).collection).toBe("pages");
  });

  it("should preserve section properties when extending", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) =>
        s.title("Content").icon(MockIcon).collapsed().items([]),
      )
      .extend("content", (s) => s.addItems([{ type: "divider" }]));

    const built = sb.build();

    expect(built.sections[0].title).toBe("Content");
    expect(built.sections[0].icon).toBe(MockIcon);
    expect(built.sections[0].collapsed).toBe(true);
  });

  it("should return this (no change) if section not found", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) => s.items([]))
      .extend("nonexistent" as any, (s) => s.title("Updated"));

    const built = sb.build();

    // Should not add new section
    expect(built.sections).toHaveLength(1);
    expect(built.sections[0].id).toBe("content");
  });
});

describe("SidebarBuilder.remove()", () => {
  it("should remove a section", () => {
    const sb = SidebarBuilder.create()
      .section("a", (s) => s.items([]))
      .section("b", (s) => s.items([]))
      .section("c", (s) => s.items([]))
      .remove("b");

    const built = sb.build();

    expect(built.sections.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("should return this for chaining", () => {
    const sb = SidebarBuilder.create().section("a", (s) => s.items([]));
    const result = sb.remove("a");

    expect(result).toBe(sb);
  });
});

describe("SidebarBuilder.merge()", () => {
  it("should merge sections from another builder", () => {
    const sb1 = SidebarBuilder.create().section("content", (s) => s.items([]));

    const sb2 = SidebarBuilder.create().section("settings", (s) => s.items([]));

    const merged = sb1.merge(sb2);
    const built = merged.build();

    expect(built.sections).toHaveLength(2);
    expect(built.sections.map((s) => s.id)).toEqual(["content", "settings"]);
  });

  it("should not overwrite existing sections", () => {
    const sb1 = SidebarBuilder.create().section("content", (s) =>
      s.title("Original").items([]),
    );

    const sb2 = SidebarBuilder.create().section("content", (s) =>
      s.title("New").items([]),
    );

    const merged = sb1.merge(sb2);
    const built = merged.build();

    expect(built.sections).toHaveLength(1);
    expect(built.sections[0].title).toBe("Original");
  });
});

describe("SidebarBuilder.build()", () => {
  it("should return SidebarConfig", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) =>
        s
          .title("Content")
          .icon(MockIcon)
          .collection("posts")
          .collection("pages"),
      )
      .section("settings", (s) =>
        s.title("Settings").collapsed().global("siteSettings"),
      );

    const built = sb.build();

    expect(built).toEqual({
      sections: [
        {
          id: "content",
          title: "Content",
          icon: MockIcon,
          collapsed: undefined,
          items: [
            { type: "collection", collection: "posts" },
            { type: "collection", collection: "pages" },
          ],
        },
        {
          id: "settings",
          title: "Settings",
          icon: undefined,
          collapsed: true,
          items: [{ type: "global", global: "siteSettings" }],
        },
      ],
    });
  });
});

describe("SidebarBuilder.sectionIds", () => {
  it("should return array of section ids", () => {
    const sb = SidebarBuilder.create()
      .section("a", (s) => s.items([]))
      .section("b", (s) => s.items([]))
      .section("c", (s) => s.items([]));

    expect(sb.sectionIds).toEqual(["a", "b", "c"]);
  });
});

describe("sidebar() factory", () => {
  it("should create empty SidebarBuilder when called without args", () => {
    const sb = sidebar();

    expect(sb).toBeInstanceOf(SidebarBuilder);
    expect(sb.build().sections).toEqual([]);
  });

  it("should allow building sidebar with fluent API", () => {
    const sb = sidebar().section("content", (s) =>
      s.title("Content").items([]),
    );

    const built = sb.build();

    expect(built.sections).toHaveLength(1);
    expect(built.sections[0].id).toBe("content");
  });
});

describe("sidebar.from()", () => {
  it("should create builder from existing config", () => {
    const config = {
      sections: [{ id: "content", title: "Content", items: [] }],
    };

    const sb = sidebar.from(config);

    expect(sb).toBeInstanceOf(SidebarBuilder);
    expect(sb.build().sections[0].id).toBe("content");
  });
});

describe("Sidebar Builder - Type Safety", () => {
  it("should track section ids in type", () => {
    const sb = SidebarBuilder.create()
      .section("content", (s) => s.items([]))
      .section("settings", (s) => s.items([]));

    // Type-level: sectionIds should include "content" and "settings"
    expectTypeOf(sb.sectionIds).toEqualTypeOf<("content" | "settings")[]>();
  });

  it("should constrain extend to existing section ids", () => {
    const sb = SidebarBuilder.create().section("content", (s) => s.items([]));

    // This should work
    sb.extend("content", (s) => s.title("Updated"));

    // Type-level: extend should only accept existing section ids
    // @ts-expect-error - "nonexistent" is not a valid section id
    sb.extend("nonexistent", (s) => s.title("Test"));
  });
});

describe("Complex Sidebar Configuration", () => {
  it("should handle complex nested configuration", () => {
    const sb = sidebar()
      .section("dashboard", (s) =>
        s.title("Dashboard").icon(MockIcon).page("home", { label: "Home" }),
      )
      .section("content", (s) =>
        s
          .title("Content")
          .collection("posts", { label: "Blog Posts" })
          .collection("pages")
          .divider()
          .collection("media", { label: "Media Library" }),
      )
      .section("settings", (s) =>
        s.title("Settings").collapsed().global("siteSettings").global("theme"),
      )
      .section("external", (s) =>
        s
          .title("Links")
          .link("Documentation", "/docs")
          .link("GitHub", "https://github.com", { external: true }),
      );

    const built = sb.build();

    expect(built.sections).toHaveLength(4);
    expect(built.sections[0].items).toHaveLength(1);
    expect(built.sections[1].items).toHaveLength(4); // 3 collections + 1 divider
    expect(built.sections[2].items).toHaveLength(2);
    expect(built.sections[2].collapsed).toBe(true);
    expect(built.sections[3].items).toHaveLength(2);
  });
});
