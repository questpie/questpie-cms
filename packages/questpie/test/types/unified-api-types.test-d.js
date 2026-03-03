/**
 * Unified API Type Inference Tests
 *
 * Comprehensive compile-time tests for the unified relation field API.
 * Tests table shapes, CRUD operations, where/with clauses, and type safety.
 *
 * Run with: bunx tsc --noEmit
 */
import { defaultFields } from "#questpie/server/fields/builtin/defaults.js";
import { questpie } from "#questpie/server/index.js";
// ============================================================================
// Test Setup - Define test module with unified API
// ============================================================================
const q = questpie({ name: "type-test" }).fields(defaultFields);
// Users collection
const users = q.collection("users").fields(({ f }) => ({
    name: f.text({ required: true, maxLength: 100 }),
    email: f.text({ required: true }),
    bio: f.textarea({ localized: true }),
}));
// Posts collection with relations
const posts = q
    .collection("posts")
    .fields(({ f }) => ({
    title: f.text({ required: true, maxLength: 255 }),
    content: f.textarea({ localized: true }),
    slug: f.text({ required: true }),
    views: f.number({ default: 0 }),
    published: f.boolean({ default: false }),
    author: f.relation({
        to: "users",
        required: true,
        relationName: "author",
    }),
    comments: f.relation({
        to: "comments",
        hasMany: true,
        foreignKey: "post",
        relationName: "post",
    }),
}))
    .options({ softDelete: true, versioning: true });
// Comments collection
const comments = q.collection("comments").fields(({ f }) => ({
    content: f.textarea({ required: true }),
    post: f.relation({
        to: "posts",
        required: true,
        relationName: "post",
    }),
    author: f.relation({
        to: "users",
        required: true,
        relationName: "commentAuthor",
    }),
}));
// Tags collection for many-to-many
const tags = q.collection("tags").fields(({ f }) => ({
    name: f.text({ required: true, maxLength: 50 }),
    slug: f.text({ required: true }),
}));
// Media collection with upload
const media = q
    .collection("media")
    .fields(({ f }) => ({
    alt: f.text({ maxLength: 255 }),
    caption: f.textarea({ localized: true }),
}))
    .upload({ visibility: "public" });
// Site settings global
const siteSettings = q
    .global("site_settings")
    .fields(({ f }) => ({
    siteName: f.text({ required: true, maxLength: 100 }),
    tagline: f.textarea({ localized: true }),
    featuredPost: f.relation({ to: "posts", relationName: "featured" }),
}))
    .options({ versioning: { enabled: true } });
// Build the module
const testModule = q
    .collections({ users, posts, comments, tags, media })
    .globals({ site_settings: siteSettings });
const _postsWhereByAuthor = {
    author: { name: "Jane" },
};
const _postsWhereByAuthorIs = {
    author: { is: { email: "jane@example.com" } },
};
const _postsWhereByCommentsSome = {
    comments: { some: { content: { like: "%trim%" } } },
};
const _postsWhereByCommentsNone = {
    comments: { none: { content: { like: "%spam%" } } },
};
const _postsWhereByCommentsEvery = {
    comments: { every: { content: { like: "%nice%" } } },
};
const _commentsWhereByPost = {
    post: { title: "Hello" },
};
// ============================================================================
// Deeply Nested Where Tests (posts → comments → author)
// ============================================================================
// Nested where: posts → comments → author (2 levels deep)
const _postsWhereNestedCommentAuthor = {
    comments: {
        some: {
            author: {
                is: { name: { like: "%Jane%" } },
            },
        },
    },
};
// Nested where: posts → author with operators
const _postsWhereAuthorOps = {
    author: {
        is: {
            name: { contains: "admin" },
            email: { endsWith: "@example.com" },
        },
    },
};
// Nested where with AND/OR at nested level
const _postsWhereNestedLogical = {
    comments: {
        some: {
            AND: [
                { content: { like: "%important%" } },
                { author: { is: { name: "Admin" } } },
            ],
        },
    },
};
// Comments → post → author (2 levels deep from comments)
const _commentsWhereNestedPostAuthor = {
    post: {
        is: {
            author: {
                is: { email: "admin@example.com" },
            },
        },
    },
};
// Comments → post → comments (circular, but should type-check within depth limit)
const _commentsWhereCircular = {
    post: {
        is: {
            comments: {
                some: { content: { like: "%reply%" } },
            },
        },
    },
};
// Combine field-level and relation-level where
const _postsWhereMixed = {
    title: { like: "%breaking%" },
    views: { gt: 100 },
    author: { is: { name: "Editor" } },
    comments: { none: { content: { like: "%spam%" } } },
};
// Basic with: posts → author
const _postsWithAuthor = {
    with: {
        author: true,
    },
};
// Aggregation on nested relation
const _postsWithAggregation = {
    with: {
        comments: {
            _count: true,
        },
    },
};
// "title" should accept string value directly
const _whereTitleDirect = { title: "hello" };
// "title" should accept operator object with string operators
const _whereTitleOps = {
    title: { contains: "hello", startsWith: "A" },
};
// "views" should accept number operator
const _whereViewsOps = { views: { gt: 100 } };
// Check: title operators should NOT have "gt" (numeric) — or at least, gt should not accept number
// This test verifies that field-definition-aware operators work, not the legacy ones
// (If using WhereOperatorsLegacy, gt would accept string which is wrong for a text field)
// ============================================================================
// C) Where clause: relation filter "is" — author.is.{fields}
// ============================================================================
// author: { is: { ... } } — the inner object should have user fields
const _whereAuthorIsName = {
    author: { is: { name: "Jane" } },
};
// author: { is: { name: { contains: ... } } } — name inside is should accept text operators
const _whereAuthorIsNameOps = {
    author: { is: { name: { contains: "Jane" } } },
};
// author: { is: { email: ... } } — email should be available
const _whereAuthorIsEmail = {
    author: { is: { email: "jane@example.com" } },
};
// ============================================================================
// D) Where clause: relation filter "some/none" — comments.some.{fields}
// ============================================================================
const _whereCommentsSome = {
    comments: { some: { createdAt: { eq: new Date("2024-01-01") } } },
};
// ============================================================================
// E) Where clause: nested relation (depth 2) — comments.some.author.is.name
// ============================================================================
const _whereCommentsAuthor = {
    comments: {
        some: {
            author: { contains: "Admin" },
        },
    },
};
// author.is.name inside comments.some should accept operators
const _whereCommentsAuthorOps = {
    comments: {
        some: {
            author: { is: { name: { contains: "Admin" } } },
        },
    },
};
// ============================================================================
// J) Assignment tests — do real values work?
// ============================================================================
// Basic with: author
const _withAuthorBasic = {
    with: { author: true },
};
// With: comments with aggregation
const _withCommentsAgg = {
    with: { comments: { _count: true } },
};
// Nested with: comments → author
const _withNestedCommentAuthor = {
    with: {
        author: true,
        comments: {
            with: {
                author: true,
            },
        },
    },
};
// Nested with + where: comments with where + inner with
const _withNestedAndWhere = {
    with: {
        comments: {
            where: { content: { like: "%test%" } },
            with: {
                author: true,
            },
        },
    },
};
// author where should accept a direct string value
const _whereAuthorDirect = { author: "some-uuid" };
// Note: These negative tests now pass correctly - operators properly typed!
// --- Where: nested relation filter ---
const _whereAuthorIs = {
    author: { is: { name: { contains: "Jane" } } },
};
// --- With: nested with assignment ---
const _nestedWith = {
    with: {
        comments: {
            where: { content: { like: "%hello%" } },
            with: { author: true },
        },
    },
};
// title should accept string directly or operator object with string operators
const _whereTitleContains = { title: { contains: "hello" } };
const _whereTitleStartsWith = {
    title: { startsWith: "A" },
};
const _whereTitleLike = { title: { like: "%foo%" } };
// --- Top-level: views operators are concrete numeric ---
const _whereViewsGt = { views: { gt: 100 } };
const _whereViewsLte = { views: { lte: 500 } };
const _whereViewsIn = { views: { in: [1, 2, 3] } };
// --- Top-level: system fields where operators ---
const _whereCreatedAtGt = {
    createdAt: { gt: new Date() },
};
const _whereIdEq = { id: "some-uuid" };
const _whereIdIn = { id: { in: ["a", "b"] } };
const _whereDeletedAtIsNull = {
    deletedAt: { isNull: true },
};
// --- Nested: author.is.{name} operators are concrete text operators ---
const _whereAuthorIsNameContains = {
    author: { is: { name: { contains: "Jane" } } },
};
const _whereAuthorIsNameStartsWith = {
    author: { is: { name: { startsWith: "J" } } },
};
const _whereAuthorIsEmailLike = {
    author: { is: { email: { like: "%@example.com" } } },
};
const _whereAuthorIsNameIn = {
    author: { is: { name: { in: ["Jane", "John"] } } },
};
// --- Nested: comments.some.{content} operators are concrete text operators ---
const _whereCommentsSomeContentLike = {
    comments: { some: { content: { like: "%test%" } } },
};
const _whereCommentsSomeContentContains = {
    comments: { some: { content: { contains: "great" } } },
};
// --- Nested depth 2: comments.some.author.is.{name} operators concrete ---
const _whereCommentsSomeAuthorName = {
    comments: {
        some: {
            author: { is: { name: { contains: "Admin" } } },
        },
    },
};
const _whereCommentsSomeAuthorEmail = {
    comments: {
        some: {
            author: { is: { email: { endsWith: "@example.com" } } },
        },
    },
};
// --- Nested depth 2: comments.some.post.is.{title} operators concrete ---
const _whereCommentsSomePostTitle = {
    comments: {
        some: {
            post: { is: { title: { like: "%breaking%" } } },
        },
    },
};
const _commWherePostTitle = {
    post: { is: { title: { contains: "hello" } } },
};
const _commWherePostViews = {
    post: { is: { views: { gt: 50 } } },
};
const _commWherePostCreatedAt = {
    post: { is: { createdAt: { gt: new Date("2024-01-01") } } },
};
// ============================================================================
// Q) Standalone Field Operator Inference — concrete types from field
// ============================================================================
import { datetimeField } from "#questpie/server/fields/builtin/datetime.js";
import { numberField } from "#questpie/server/fields/builtin/number.js";
import { textField } from "#questpie/server/fields/builtin/text.js";
import { createFieldDefinition } from "#questpie/server/fields/field.js";
// --- Standalone text field: FieldWhere should have concrete string operators ---
const myTextField = createFieldDefinition(textField, {
    required: true,
});
// --- Standalone number field: FieldWhere should have concrete number operators ---
const myNumberField = createFieldDefinition(numberField, {
    required: true,
});
// --- Standalone datetime field: FieldWhere should have concrete date operators ---
const myDatetimeField = createFieldDefinition(datetimeField, {
    required: true,
});
// ============================================================================
// R) Collection-level where: concrete operators (NEGATIVE tests)
// ============================================================================
// These prove that the where clause REJECTS invalid operators.
// title is a text field — should NOT accept gt (numeric operator)
// @ts-expect-error - gt is not a valid operator for text fields
const _badTitleGt = { title: { gt: 100 } };
// views is a number field — should NOT accept contains (string operator)
// @ts-expect-error - contains is not a valid operator for number fields
const _badViewsContains = { views: { contains: "abc" } };
// published is a boolean field — should NOT accept like (string operator)
// @ts-expect-error - like is not a valid operator for boolean fields
const _badPublishedLike = { published: { like: "%test%" } };
// createdAt is a datetime field — should NOT accept contains
// This correctly produces a type error — `contains` does not exist on datetime operators
const _badCreatedAtContains = {
    // @ts-expect-error - contains is not a valid operator for datetime fields
    createdAt: { contains: "2024" },
};
