/**
 * Global Builder Tests
 *
 * Tests for GlobalBuilder class and global() factory.
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import { global } from "#questpie/admin/client/builder/global/global";
import { GlobalBuilder } from "#questpie/admin/client/builder/global/global-builder";
import { AdminBuilder } from "#questpie/admin/client/builder/admin-builder";
import {
  createTextField,
  createEmailField,
  createFormView,
  MockIcon,
} from "../utils/helpers";

describe("global() factory", () => {
  it("should create a GlobalBuilder with the given name", () => {
    const settings = global("settings");

    expect(settings).toBeInstanceOf(GlobalBuilder);
    expect(settings.state.name).toBe("settings");
  });

  it("should initialize with undefined ~adminApp", () => {
    const settings = global("settings");

    expect(settings.state["~adminApp"]).toBeUndefined();
  });

  it("should allow any string as global name", () => {
    const siteSettings = global("siteSettings");
    const siteConfig = global("site-config");
    const theme_settings = global("theme_settings");

    expect(siteSettings.state.name).toBe("siteSettings");
    expect(siteConfig.state.name).toBe("site-config");
    expect(theme_settings.state.name).toBe("theme_settings");
  });
});

describe("GlobalBuilder.use()", () => {
  it("should bind admin module to global", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const settings = global("settings").use(adminModule);

    expect(settings.state["~adminApp"]).toBe(adminModule);
  });

  it("should return new builder instance", () => {
    const adminModule = AdminBuilder.empty();
    const original = global("settings");
    const withModule = original.use(adminModule);

    expect(original).not.toBe(withModule);
  });

  it("should not mutate original builder", () => {
    const adminModule = AdminBuilder.empty();
    const original = global("settings");

    original.use(adminModule);

    expect(original.state["~adminApp"]).toBeUndefined();
  });

  it("should allow replacing admin module", () => {
    const module1 = AdminBuilder.empty().fields({ text: createTextField() });
    const module2 = AdminBuilder.empty().fields({ email: createEmailField() });

    const settings = global("settings").use(module1).use(module2);

    expect(settings.state["~adminApp"]).toBe(module2);
  });
});

describe("GlobalBuilder.meta()", () => {
  it("should set label", () => {
    const settings = global("settings").meta({ label: "Site Settings" });

    expect(settings.state.label).toBe("Site Settings");
  });

  it("should set icon", () => {
    const settings = global("settings").meta({ icon: MockIcon });

    expect(settings.state.icon).toBe(MockIcon);
  });

  it("should set description", () => {
    const settings = global("settings").meta({
      description: "Configure site-wide settings",
    });

    expect(settings.state.description).toBe("Configure site-wide settings");
  });

  it("should set multiple metadata at once", () => {
    const settings = global("settings").meta({
      label: "Site Settings",
      icon: MockIcon,
      description: "Configure site-wide settings",
    });

    expect(settings.state.label).toBe("Site Settings");
    expect(settings.state.icon).toBe(MockIcon);
    expect(settings.state.description).toBe("Configure site-wide settings");
  });

  it("should return new builder instance", () => {
    const original = global("settings");
    const withMeta = original.meta({ label: "Settings" });

    expect(original).not.toBe(withMeta);
  });

  it("should not mutate original builder", () => {
    const original = global("settings");

    original.meta({ label: "Settings" });

    expect(original.state.label).toBeUndefined();
  });

  it("should preserve existing state", () => {
    const settings = global("settings")
      .meta({ label: "Settings" })
      .meta({ description: "Site settings" });

    expect(settings.state.label).toBe("Settings");
    expect(settings.state.description).toBe("Site settings");
  });
});

describe("GlobalBuilder.fields()", () => {
  it("should receive r (FieldRegistryProxy) in callback", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
      email: createEmailField(),
    });

    let receivedR: any;
    global("settings")
      .use(adminModule)
      .fields(({ r }) => {
        receivedR = r;
        return {};
      });

    expect(receivedR).toBeDefined();
    expect(typeof receivedR.text).toBe("function");
    expect(typeof receivedR.email).toBe("function");
  });

  it("should allow defining fields using registry proxy", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const settings = global("settings")
      .use(adminModule)
      .fields(({ r }) => ({
        siteName: r.text(),
        siteDescription: r.text(),
      }));

    expect(settings.state.fields).toBeDefined();
    expect(settings.state.fields?.siteName).toBeDefined();
    expect(settings.state.fields?.siteDescription).toBeDefined();
  });

  it("should pass options through r.fieldType(options)", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const settings = global("settings")
      .use(adminModule)
      .fields(({ r }) => ({
        siteName: r.text({ maxLength: 100 } as any),
      }));

    expect(settings.state.fields?.siteName["~options"]).toEqual({
      maxLength: 100,
    });
  });

  it("should preserve field type (name property)", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
      email: createEmailField(),
    });

    const settings = global("settings")
      .use(adminModule)
      .fields(({ r }) => ({
        siteName: r.text(),
        contactEmail: r.email(),
      }));

    expect(settings.state.fields?.siteName.name).toBe("text");
    expect(settings.state.fields?.contactEmail.name).toBe("email");
  });

  it("should return new builder instance", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const original = global("settings").use(adminModule);
    const withFields = original.fields(({ r }) => ({ siteName: r.text() }));

    expect(original).not.toBe(withFields);
  });

  it("should not mutate original builder", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    const original = global("settings").use(adminModule);
    original.fields(({ r }) => ({ siteName: r.text() }));

    expect(original.state.fields).toBeUndefined();
  });

  it("should work without admin module (empty registry)", () => {
    let receivedR: any;
    global("settings").fields(({ r }) => {
      receivedR = r;
      return {};
    });

    // r should be empty object
    expect(Object.keys(receivedR)).toHaveLength(0);
  });
});

describe("GlobalBuilder.form()", () => {
  it("should receive v (ViewRegistryProxy) and f (FieldProxy) in callback", () => {
    const adminModule = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .views({ form: createFormView() });

    let receivedV: any;
    let receivedF: any;

    global("settings")
      .use(adminModule)
      .fields(({ r }) => ({
        siteName: r.text(),
        siteDescription: r.text(),
      }))
      .form(({ v, f }) => {
        receivedV = v;
        receivedF = f;
        return {};
      });

    expect(receivedV).toBeDefined();
    expect(typeof receivedV.form).toBe("function");
    expect(receivedF).toBeDefined();
    expect(receivedF.siteName).toBe("siteName");
    expect(receivedF.siteDescription).toBe("siteDescription");
  });

  it("should allow selecting view using view proxy", () => {
    const adminModule = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .views({ form: createFormView() });

    const settings = global("settings")
      .use(adminModule)
      .fields(({ r }) => ({
        siteName: r.text(),
      }))
      .form(({ v, f }) => v.form({ sections: [] }));

    expect(settings.state.form).toBeDefined();
  });

  it("should return new builder instance", () => {
    const adminModule = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .views({ form: createFormView() });

    const original = global("settings")
      .use(adminModule)
      .fields(({ r }) => ({ siteName: r.text() }));

    const withForm = original.form(({ v, f }) => ({}));

    expect(original).not.toBe(withForm);
  });

  it("should not mutate original builder", () => {
    const adminModule = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .views({ form: createFormView() });

    const original = global("settings")
      .use(adminModule)
      .fields(({ r }) => ({ siteName: r.text() }));

    original.form(({ v, f }) => ({}));

    expect(original.state.form).toBeUndefined();
  });
});

describe("GlobalBuilder.state", () => {
  it("should expose readonly state", () => {
    const settings = global("settings")
      .meta({ label: "Site Settings" })
      .fields(({ r }) => ({}));

    expect(settings.state).toBeDefined();
    expect(settings.state.name).toBe("settings");
    expect(settings.state.label).toBe("Site Settings");
  });
});

describe("GlobalBuilder - Full Configuration Chain", () => {
  it("should allow complete configuration chain", () => {
    const adminModule = AdminBuilder.empty()
      .fields({
        text: createTextField(),
        email: createEmailField(),
      })
      .views({
        form: createFormView(),
      });

    const settings = global("settings")
      .use(adminModule)
      .meta({
        label: "Site Settings",
        icon: MockIcon,
        description: "Configure your site",
      })
      .fields(({ r }) => ({
        siteName: r.text({ maxLength: 100 } as any),
        siteDescription: r.text(),
        contactEmail: r.email(),
      }))
      .form(({ v, f }) =>
        v.form({
          sections: [
            {
              title: "General",
              fields: [f.siteName, f.siteDescription],
            },
            {
              title: "Contact",
              fields: [f.contactEmail],
            },
          ],
        }),
      );

    // Verify all state is correctly set
    expect(settings.state.name).toBe("settings");
    expect(settings.state.label).toBe("Site Settings");
    expect(settings.state.icon).toBe(MockIcon);
    expect(settings.state.description).toBe("Configure your site");
    expect(settings.state.fields?.siteName.name).toBe("text");
    expect(settings.state.fields?.contactEmail.name).toBe("email");
    expect(settings.state.form).toBeDefined();
  });
});

describe("GlobalBuilder - Type Safety", () => {
  it("should type field proxy based on defined fields", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    global("settings")
      .use(adminModule)
      .fields(({ r }) => ({
        siteName: r.text(),
        siteDescription: r.text(),
      }))
      .form(({ v, f }) => {
        // Type-level: f should have siteName and siteDescription
        expectTypeOf(f.siteName).toEqualTypeOf<"siteName">();
        expectTypeOf(f.siteDescription).toEqualTypeOf<"siteDescription">();
        return {};
      });
  });

  it("should type registry proxy based on admin module fields", () => {
    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
      email: createEmailField(),
    });

    global("settings")
      .use(adminModule)
      .fields(({ r }) => {
        // Type-level: r should have text and email
        expectTypeOf(r.text).toBeFunction();
        expectTypeOf(r.email).toBeFunction();
        return {};
      });
  });
});

describe("GlobalBuilder immutability", () => {
  it("should create new instance on every method call", () => {
    const adminModule = AdminBuilder.empty()
      .fields({ text: createTextField() })
      .views({ form: createFormView() });

    const a = global("settings");
    const b = a.use(adminModule);
    const c = b.meta({ label: "Settings" });
    const d = c.fields(({ r }) => ({ siteName: r.text() }));
    const e = d.form(({ v, f }) => ({}));

    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(c).not.toBe(d);
    expect(d).not.toBe(e);
  });
});

describe("GlobalBuilder vs CollectionBuilder", () => {
  it("should have similar API to CollectionBuilder", async () => {
    // GlobalBuilder and CollectionBuilder should have matching APIs for:
    // - use()
    // - meta()
    // - fields()
    // But GlobalBuilder doesn't have list() (only form())

    const adminModule = AdminBuilder.empty().fields({
      text: createTextField(),
    });

    // Both support use/meta/fields
    const { collection } =
      await import("#questpie/admin/client/builder/collection/collection");
    const collectionBuilder = collection("posts")
      .use(adminModule)
      .meta({ label: "Posts" })
      .fields(({ r }) => ({ title: r.text() }));

    const globalBuilder = global("settings")
      .use(adminModule)
      .meta({ label: "Settings" })
      .fields(({ r }) => ({ siteName: r.text() }));

    // Global doesn't have list(), collection does
    expect(typeof (collectionBuilder as any).list).toBe("function");
    expect((globalBuilder as any).list).toBeUndefined();

    // Both have form()
    expect(typeof collectionBuilder.form).toBe("function");
    expect(typeof globalBuilder.form).toBe("function");
  });
});
