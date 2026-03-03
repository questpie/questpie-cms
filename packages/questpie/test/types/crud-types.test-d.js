/**
 * CRUD Types Tests
 *
 * These tests verify that TypeScript correctly infers types for CRUD operations
 * including Where clauses, query options, and mutation inputs.
 *
 * Run with: tsc --noEmit
 */
import { questpie } from "#questpie/server/config/builder.js";
import { builtinFields } from "#questpie/server/fields/builtin/defaults.js";
// ============================================================================
// Test fixtures
// ============================================================================
const q = questpie({ name: "test" }).fields(builtinFields);
// Simple collection for basic tests
const postsCollection = q.collection("posts").fields(({ f }) => ({
    title: f.text({ required: true, maxLength: 255 }),
    content: f.textarea(),
    views: f.number({ default: 0 }),
    author: f.relation({
        to: "users",
        required: true,
        relationName: "author",
    }),
    publishedAt: f.datetime(),
    comments: f.relation({
        to: "comments",
        hasMany: true,
        foreignKey: "postId",
        relationName: "post",
    }),
}));
// Can use direct values
const _where1 = { title: "Hello" };
const _where2 = { views: 100 };
// Can use operators
const _where3 = { title: { like: "%hello%" } };
const _where4 = { views: { gt: 100 } };
const _where5 = { publishedAt: { gte: new Date() } };
// Logical operators
const _whereAnd = {
    AND: [{ title: "Hello" }, { views: { gt: 10 } }],
};
const _whereOr = {
    OR: [{ title: "Hello" }, { title: "World" }],
};
const _whereNot = {
    NOT: { title: "Excluded" },
};
// Combined conditions
const _whereCombined = {
    title: { like: "%hello%" },
    views: { gt: 100, lt: 1000 },
    AND: [{ author: { eq: "user-1" } }],
};
// Selecting specific columns
const _columns = {
    title: true,
    content: true,
};
// Excluding columns
const _columnsExclude = {
    content: false, // Exclude content
};
// Object syntax for ordering
const _orderBy = {
    createdAt: "desc",
    title: "asc",
};
// Combine all query options
const _options = {
    where: { title: { like: "%hello%" } },
    columns: { title: true, content: true },
    orderBy: { createdAt: "desc" },
    limit: 10,
    offset: 0,
};
// Locale options
const _optionsLocale = {
    locale: "en",
    localeFallback: true,
};
// Include deleted (soft delete)
const _optionsDeleted = {
    includeDeleted: true,
};
// Single connect
const _mutation1 = {
    connect: { id: "user-123" },
};
// Array connect
const _mutation2 = {
    connect: [{ id: "user-1" }, { id: "user-2" }],
};
const _mutationCreate1 = {
    create: { name: "John", email: "john@example.com" },
};
const _mutationCreate2 = {
    create: [
        { name: "John", email: "john@example.com" },
        { name: "Jane", email: "jane@example.com" },
    ],
};
// ConnectOrCreate operation
const _mutationConnectOrCreate = {
    connectOrCreate: {
        where: { id: "user-123" },
        create: { name: "John", email: "john@example.com" },
    },
};
// ============================================================================
// Complex query scenarios
// ============================================================================
// Deeply nested where conditions
const _complexWhere = {
    AND: [
        {
            OR: [{ title: { like: "%hello%" } }, { title: { like: "%world%" } }],
        },
        {
            views: { gt: 100 },
            publishedAt: { isNotNull: true },
        },
    ],
    NOT: {
        author: { eq: "excluded-author" },
    },
};
// Full query with all options
const _fullQuery = {
    where: {
        AND: [
            { title: { ilike: "%search%" } },
            { views: { gte: 10 } },
            {
                OR: [{ publishedAt: { isNotNull: true } }, { author: { eq: "admin" } }],
            },
        ],
    },
    columns: {
        id: true,
        title: true,
        views: true,
        publishedAt: true,
    },
    orderBy: {
        views: "desc",
        createdAt: "desc",
    },
    limit: 20,
    offset: 0,
    locale: "en",
    localeFallback: true,
    includeDeleted: false,
};
// ============================================================================
// Type safety edge cases
// ============================================================================
// Nullable fields should allow null checks
const _whereNullable = {
    content: { isNull: true },
};
const _whereDateNullable = {
    publishedAt: { isNull: false },
};
// Empty where clause
const _emptyWhere = {};
// Mixing direct values and operators
const _mixedWhere = {
    title: "Exact Match", // Direct value
    views: { gt: 100 }, // Operator
    author: { eq: "user-123" }, // Relation field uses operators
};
