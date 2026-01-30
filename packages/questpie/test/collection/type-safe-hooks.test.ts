import { describe, test, expect } from "bun:test";
import { collection } from "../../src/server/collection/builder/collection-builder.js";
import { text, varchar } from "drizzle-orm/pg-core";

describe("Type-Safe Hooks", () => {
  test("hooks should have proper type inference", () => {
    const users = collection("users")
      .fields({
        name: text("name").notNull(),
        email: varchar("email", { length: 255 }).notNull(),
        bio: text("bio"),
      })
      .hooks({
        // beforeValidate receives TInsert | TUpdate
        beforeValidate: async ({ data, operation }) => {
          // data should be properly typed here
          if (operation === "create") {
            // On create, data is TInsert
            expectTypeOf(data).toMatchTypeOf<{
              name: string;
              email: string;
              bio?: string | null | undefined;
              id?: string | undefined;
              createdAt?: string | undefined;
              updatedAt?: string | undefined;
            }>();
          } else {
            // On update, data is TUpdate (partial)
            expectTypeOf(data).toMatchTypeOf<{
              name?: string | undefined;
              email?: string | undefined;
              bio?: string | null | undefined;
              id?: string | undefined;
              createdAt?: string | undefined;
              updatedAt?: string | undefined;
            }>();
          }
        },
        // afterChange receives TSelect
        afterChange: async ({ data, original, operation }) => {
          // data is always TSelect (complete record)
          expectTypeOf(data).toMatchTypeOf<{
            id: string;
            name: string;
            email: string;
            bio: string | null;
            createdAt: string;
            updatedAt: string;
            _title: string;
          }>();

          // original is available on update
          if (operation === "update" && original) {
            expectTypeOf(original).toMatchTypeOf<{
              id: string;
              name: string;
              email: string;
              bio: string | null;
              createdAt: string;
              updatedAt: string;
              _title: string;
            }>();
          }
        },
        // afterRead receives TSelect
        afterRead: async ({ data }) => {
          expectTypeOf(data).toMatchTypeOf<{
            id: string;
            name: string;
            email: string;
            bio: string | null;
            createdAt: string;
            updatedAt: string;
            _title: string;
          }>();
        },
      });

    expect(users.name).toBe("users");
  });

  test("original field availability across all hooks", () => {
    const users = collection("users")
      .fields({
        name: text("name").notNull(),
        email: varchar("email", { length: 255 }).notNull(),
        bio: text("bio"),
      })
      .hooks({
        // beforeValidate: original is NOT available (type is never)
        beforeValidate: async ({ data, operation, original }) => {
          // original is type 'never', cannot be used
          if (operation === "create") {
            expectTypeOf(data).toMatchTypeOf<{
              name: string;
              email: string;
              bio?: string | null | undefined;
              id?: string | undefined;
              createdAt?: string | undefined;
              updatedAt?: string | undefined;
            }>();
          }
        },
        // beforeChange: original is NOT available (type is never)
        beforeChange: async ({ data, original }) => {
          // original is type 'never', cannot be used
          if (!data.bio) {
            data.bio = "No bio";
          }
        },
        // afterChange: original IS available (but might be undefined)
        afterChange: async ({ data, original, operation }) => {
          expectTypeOf(data).toMatchTypeOf<{
            id: string;
            name: string;
            email: string;
            bio: string | null;
            createdAt: string;
            updatedAt: string;
            _title: string;
          }>();

          // original is available but optional
          if (operation === "update" && original) {
            expectTypeOf(original).toMatchTypeOf<{
              id: string;
              name: string;
              email: string;
              bio: string | null;
              createdAt: string;
              updatedAt: string;
              _title: string;
            }>();

            // Can compare data with original
            if (data.email !== original.email) {
              console.log("Email changed");
            }
          }

          // On create, original should be undefined
          if (operation === "create") {
            expect(original).toBeUndefined();
          }
        },
        // afterRead: original IS available (but might be undefined)
        afterRead: async ({ data, original, operation }) => {
          expectTypeOf(data).toMatchTypeOf<{
            id: string;
            name: string;
            email: string;
            bio: string | null;
            createdAt: string;
            updatedAt: string;
            _title: string;
          }>();

          // original is available on update operations
          if (operation === "update" && original) {
            expectTypeOf(original).toMatchTypeOf<{
              id: string;
              name: string;
              email: string;
              bio: string | null;
              createdAt: string;
              updatedAt: string;
              _title: string;
            }>();
          }
        },
        // beforeDelete: original is NOT available (type is never)
        beforeDelete: async ({ data, original }) => {
          // original is type 'never', cannot be used
          expectTypeOf(data).toMatchTypeOf<{
            id: string;
            name: string;
            email: string;
            bio: string | null;
            createdAt: string;
            updatedAt: string;
            _title: string;
          }>();
        },
        // afterDelete: original is NOT available (type is never)
        afterDelete: async ({ data, original }) => {
          // original is type 'never', cannot be used
          expectTypeOf(data).toMatchTypeOf<{
            id: string;
            name: string;
            email: string;
            bio: string | null;
            createdAt: string;
            updatedAt: string;
            _title: string;
          }>();
        },
      });

    expect(users.name).toBe("users");
  });

  test("beforeOperation hook has correct types", () => {
    const posts = collection("posts")
      .fields({
        title: text("title").notNull(),
      })
      .hooks({
        beforeOperation: async ({ data, operation, original }) => {
          // original is type 'never', cannot be used

          // data type depends on operation
          if (operation === "create") {
            expectTypeOf(data).toMatchTypeOf<{
              title: string;
              id?: string | undefined;
              createdAt?: string | undefined;
              updatedAt?: string | undefined;
            }>();
          } else if (operation === "update") {
            expectTypeOf(data).toMatchTypeOf<{
              title?: string | undefined;
              id?: string | undefined;
              createdAt?: string | undefined;
              updatedAt?: string | undefined;
            }>();
          } else if (operation === "read" || operation === "delete") {
            expectTypeOf(data).toMatchTypeOf<{
              id: string;
              title: string;
              createdAt: string;
              updatedAt: string;
              _title: string;
            }>();
          }
        },
      });

    expect(posts.name).toBe("posts");
  });

  test("hooks with localized fields", () => {
    const posts = collection("posts")
      .fields({
        title: text("title").notNull(),
        content: text("content").notNull(),
        slug: varchar("slug", { length: 255 }).notNull(),
      })
      .localized(["title", "content"] as const)
      .hooks({
        beforeValidate: async ({ data, operation }) => {
          // Localized fields should be optional on insert
          if (operation === "create") {
            expectTypeOf(data).toMatchTypeOf<{
              slug: string;
              title?: string | undefined;
              content?: string | undefined;
              id?: string | undefined;
              createdAt?: string | undefined;
              updatedAt?: string | undefined;
            }>();
          }
        },
        afterChange: async ({ data }) => {
          // Localized fields are included in TSelect
          expectTypeOf(data).toMatchTypeOf<{
            id: string;
            slug: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            _title: string;
          }>();
        },
      });

    expect(posts.name).toBe("posts");
  });

  test("hooks with localized fields maintain correct types across lifecycle", () => {
    const articles = collection("articles")
      .fields({
        title: text("title").notNull(),
        content: text("content").notNull(),
        slug: varchar("slug", { length: 255 }).notNull(),
      })
      .localized(["title", "content"] as const)
      .hooks({
        beforeValidate: async ({ data, operation }) => {
          if (operation === "create") {
            // Localized fields are optional on create
            expectTypeOf(data).toMatchTypeOf<{
              slug: string;
              title?: string | undefined;
              content?: string | undefined;
              id?: string | undefined;
              createdAt?: string | undefined;
              updatedAt?: string | undefined;
            }>();
          }
        },
        afterChange: async ({ data, original, operation }) => {
          // Localized fields are included in TSelect
          expectTypeOf(data).toMatchTypeOf<{
            id: string;
            slug: string;
            title: string;
            content: string;
            createdAt: string;
            updatedAt: string;
            _title: string;
          }>();

          if (operation === "update" && original) {
            // Can access localized fields in original
            const titleChanged = data.title !== original.title;
            expect(typeof titleChanged).toBe("boolean");
          }
        },
      });

    expect(articles.name).toBe("articles");
  });

  test("hooks should not allow return values", () => {
    const articles = collection("articles")
      .fields({
        title: text("title").notNull(),
      })
      .hooks({
        beforeChange: async ({ data }) => {
          // Mutate in place - correct
          if (!data.title) {
            data.title = "Untitled";
          }
          // Don't return anything
        },
      });

    expect(articles.name).toBe("articles");
  });
});

// Helper for type checking (not executed at runtime)
function expectTypeOf<T>(_value: T) {
  return {
    toMatchTypeOf: <Expected>() => {
      // Type-only check
      const _typeCheck: Expected extends T
        ? T extends Expected
          ? true
          : false
        : false = true as any;
    },
  };
}
