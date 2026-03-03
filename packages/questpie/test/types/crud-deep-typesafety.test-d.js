/**
 * CRUD Deep Type Safety Tests
 *
 * Comprehensive compile-time tests covering:
 * - Many-to-many relations (with junction table)
 * - Nested with result types (ApplyQuery depth)
 * - Columns + With interaction in result types
 * - Object/Array field type inference
 * - Select (enum) field types
 * - Boolean field operators
 * - Aggregation result types (_count, _sum, _avg)
 * - Create input: FK optionalization, required relation enforcement
 * - Update input: nested relation mutations
 * - Circular relation depth handling
 *
 * IMPORTANT: Uses $inferApp as TApp to test the REAL public API surface.
 * If tests fail here, it means the type system has real bugs that users would hit.
 *
 * Run with: bunx tsc --noEmit
 */
import { defaultFields } from "#questpie/server/fields/builtin/defaults.js";
import { questpie } from "#questpie/server/index.js";
// ============================================================================
// Test Fixtures — rich collection graph with diverse field types
// ============================================================================
const q = questpie({ name: "deep-test" }).fields(defaultFields);
const authors = q
    .collection("authors")
    .fields(({ f }) => ({
    name: f.text({ required: true, maxLength: 100 }),
    email: f.text({ required: true }),
    bio: f.textarea({ localized: true }),
    active: f.boolean({ default: true }),
}))
    .options({ timestamps: true });
const categories = q.collection("categories").fields(({ f }) => ({
    name: f.text({ required: true, maxLength: 100 }),
    slug: f.text({ required: true }),
    description: f.textarea(),
}));
const articles = q
    .collection("articles")
    .fields(({ f }) => ({
    title: f.text({ required: true, maxLength: 255 }),
    content: f.textarea({ localized: true }),
    slug: f.text({ required: true }),
    views: f.number({ default: 0 }),
    rating: f.number(),
    published: f.boolean({ default: false }),
    status: f.select({
        options: [
            { value: "draft", label: "Draft" },
            { value: "review", label: "In Review" },
            { value: "published", label: "Published" },
        ],
    }),
    metadata: f.object({
        fields: {
            seoTitle: f.text({ maxLength: 60 }),
            seoDescription: f.textarea({ maxLength: 160 }),
            featured: f.boolean({ default: false }),
        },
    }),
    tagList: f.array({
        of: f.text({ required: true }),
    }),
    author: f.relation({
        to: "authors",
        required: true,
        relationName: "articleAuthor",
    }),
    categories: f.relation({
        to: "categories",
        hasMany: true,
        through: "article_categories",
        sourceField: "article",
        targetField: "category",
    }),
    comments: f.relation({
        to: "article_comments",
        hasMany: true,
        foreignKey: "article",
        relationName: "article",
    }),
    publishedAt: f.datetime(),
}))
    .options({ softDelete: true, versioning: true });
const articleComments = q.collection("article_comments").fields(({ f }) => ({
    content: f.textarea({ required: true }),
    article: f.relation({
        to: "articles",
        required: true,
        relationName: "article",
    }),
    author: f.relation({
        to: "authors",
        required: true,
        relationName: "commentAuthor",
    }),
}));
const articleCategories = q
    .collection("article_categories")
    .fields(({ f }) => ({
    article: f.relation({
        to: "articles",
        required: true,
        onDelete: "cascade",
    }),
    category: f.relation({
        to: "categories",
        required: true,
        onDelete: "cascade",
    }),
}));
const media = q
    .collection("media")
    .fields(({ f }) => ({
    alt: f.text({ maxLength: 255 }),
    caption: f.textarea({ localized: true }),
}))
    .upload({ visibility: "public" });
const testModule = q.collections({
    authors,
    categories,
    articles,
    article_comments: articleComments,
    article_categories: articleCategories,
    media,
});
// --- BelongsTo: author.is.{name} — should accept nested field where ---
// BUG INDICATOR: if $inferApp nested where doesn't know author fields
const _inferWhereAuthorIs = {
    author: { is: { name: { contains: "Jane" } } },
};
const _manualWhereAuthorIs = {
    author: { is: { name: { contains: "Jane" } } },
};
// --- BelongsTo: author.isNot ---
const _inferWhereAuthorIsNot = {
    author: { isNot: { active: { eq: false } } },
};
const _manualWhereAuthorIsNot = {
    author: { isNot: { active: { eq: false } } },
};
// --- BelongsTo: author direct shorthand (= .is) ---
const _inferWhereAuthorDirect = {
    author: { name: "Jane" },
};
const _manualWhereAuthorDirect = {
    author: { name: "Jane" },
};
// --- HasMany: comments.some ---
const _inferWhereCommentsSome = {
    comments: { some: { content: { contains: "great" } } },
};
const _manualWhereCommentsSome = {
    comments: { some: { content: { contains: "great" } } },
};
// --- HasMany: comments.none ---
const _inferWhereCommentsNone = {
    comments: { none: { content: { contains: "spam" } } },
};
// --- HasMany: comments.every ---
const _inferWhereCommentsEvery = {
    comments: { every: { content: { contains: "approved" } } },
};
// --- ManyToMany: categories.some ---
const _inferWhereCatSome = {
    categories: { some: { name: "TypeScript" } },
};
const _manualWhereCatSome = {
    categories: { some: { name: "TypeScript" } },
};
// --- ManyToMany: categories.none ---
const _inferWhereCatNone = {
    categories: { none: { slug: "deprecated" } },
};
// --- ManyToMany: categories.every ---
const _inferWhereCatEvery = {
    categories: { every: { name: { contains: "tech" } } },
};
// --- Deep nesting: comments → author (2 levels) ---
const _inferWhereNestedCommentAuthor = {
    comments: {
        some: {
            author: { is: { email: { endsWith: "@example.com" } } },
        },
    },
};
// --- Deep nesting: comments → article (circular, 2 levels) ---
const _inferWhereCircular = {
    comments: {
        some: {
            article: {
                is: { title: { like: "%featured%" } },
            },
        },
    },
};
// --- Complex combined where ---
const _inferWhereComplex = {
    AND: [
        { title: { contains: "typescript" } },
        { views: { gt: 100 } },
        {
            OR: [
                { author: { is: { name: "Jane" } } },
                { author: { is: { name: "John" } } },
            ],
        },
        { categories: { some: { slug: "programming" } } },
        { comments: { none: { content: { contains: "spam" } } } },
    ],
    NOT: {
        published: false,
    },
};
// --- Boolean field operators ---
const _inferWhereBool = { published: { eq: true } };
// --- Datetime field operators ---
const _inferWhereDatetime = {
    publishedAt: { gt: new Date("2024-01-01") },
};
const _inferWhereDatetimeStr = {
    publishedAt: { lte: "2024-12-31" },
};
// --- Number field operators ---
const _inferWhereNumber = { views: { gt: 1000 } };
const _inferWhereNumberIn = {
    views: { in: [100, 200, 300] },
};
const _inferWhereNumberRange = {
    views: { gte: 100, lte: 500 },
};
// --- String field operators ---
const _inferWhereString = {
    title: { contains: "hello" },
};
const _inferWhereStringStart = {
    title: { startsWith: "Breaking" },
};
// --- FK direct value ---
const _inferWhereFK = { author: "some-uuid" };
const _inferWhereFKEq = { author: { eq: "some-uuid" } };
// --- BelongsTo to article ---
const _inferCommentWhereArticle = {
    article: { is: { title: { like: "%featured%" } } },
};
const _manualCommentWhereArticle = {
    article: { is: { title: { like: "%featured%" } } },
};
// --- Nested: article → categories (manyToMany, 2 levels from comments) ---
const _inferCommentWhereArticleCat = {
    article: {
        is: {
            categories: { some: { name: "Tech" } },
        },
    },
};
// --- Nested: article → author (2 levels from comments) ---
const _inferCommentWhereArticleAuthor = {
    article: {
        is: {
            author: { is: { email: { endsWith: "@admin.com" } } },
        },
    },
};
// --- AND/OR at nested level ---
const _inferCommentWhereNestedLogic = {
    AND: [
        { content: { contains: "important" } },
        {
            article: {
                is: {
                    OR: [{ views: { gt: 1000 } }, { published: { eq: true } }],
                },
            },
        },
    ],
};
// --- Nested with: comments → author ---
const _inferWithNested = {
    with: {
        comments: {
            where: { content: { contains: "approved" } },
            with: {
                author: true,
            },
            limit: 10,
            orderBy: { createdAt: "desc" },
        },
    },
};
// --- ManyToMany with options ---
const _inferWithCatFiltered = {
    with: {
        categories: {
            where: { name: { contains: "tech" } },
            columns: { name: true, slug: true },
            limit: 5,
        },
    },
};
// --- All relations at once ---
const _inferWithAll = {
    with: {
        author: true,
        comments: {
            with: { author: true },
            limit: 20,
        },
        categories: true,
    },
};
// Text field should NOT accept numeric operator gt
// @ts-expect-error - gt is not valid for text fields
const _badTitleGt = { title: { gt: 100 } };
// Datetime field should NOT accept contains
const _badDateContains = {
    // @ts-expect-error - contains is not valid for datetime fields
    publishedAt: { contains: "2024" },
};
const _inferAuthorActive = { active: { eq: true } };
const _inferAuthorInactive = { active: { eq: false } };
const _inferAuthorIsNull = { active: { isNull: false } };
const _inferAuthorIsNotNull = {
    active: { isNotNull: true },
};
// ============================================================================
// BUG TEST: Full query scenario with $inferApp
// ============================================================================
const _inferFullQuery = {
    where: {
        AND: [
            { title: { contains: "typescript" } },
            { views: { gte: 10 } },
            { published: { eq: true } },
            { categories: { some: { slug: "programming" } } },
            { comments: { none: { content: { contains: "spam" } } } },
            { author: { is: { active: { eq: true } } } },
        ],
        NOT: {
            deletedAt: { isNotNull: true },
        },
    },
    columns: {
        id: true,
        title: true,
        slug: true,
        views: true,
        publishedAt: true,
    },
    with: {
        author: true,
        comments: {
            where: { content: { contains: "approved" } },
            with: { author: true },
            limit: 10,
            orderBy: { createdAt: "desc" },
        },
        categories: {
            columns: { name: true, slug: true },
        },
    },
    orderBy: { createdAt: "desc" },
    limit: 20,
    offset: 0,
    locale: "en",
    localeFallback: true,
    includeDeleted: false,
};
// ============================================================================
// Edge cases
// ============================================================================
// --- Empty where ---
const _emptyWhere = {};
// --- Nested NOT ---
const _whereNestedNot = {
    NOT: {
        AND: [{ title: { contains: "draft" } }, { published: false }],
    },
};
// --- Double NOT ---
const _whereDoubleNot = {
    NOT: {
        NOT: { title: "kept" },
    },
};
// --- Mixed AND + OR + NOT ---
const _whereMixedLogic = {
    AND: [
        {
            OR: [{ title: { startsWith: "A" } }, { title: { startsWith: "B" } }],
        },
        {
            NOT: { published: false },
        },
    ],
    OR: [{ views: { gt: 100 } }, { categories: { some: { name: "Featured" } } }],
};
