/**
 * Collection Builder Type Tests
 *
 * Compile-time only - run with: tsc --noEmit
 * If any Expect<> fails, TypeScript compilation fails.
 *
 * Note: Some tests are disabled pending field builder implementation for:
 * - .localized() via f.text({ localized: true })
 * - .virtuals() via f.text({ virtual: true })
 */
import { questpie } from "#questpie/server/config/builder.js";
import { builtinFields } from "#questpie/server/fields/builtin/defaults.js";
// ============================================================================
// Test fixtures — use q.collection() for proper field type inference
// ============================================================================
const q = questpie({ name: "test" }).fields(builtinFields);
const postsCollection = q.collection("posts").fields(({ f }) => ({
    title: f.text({ required: true, maxLength: 255 }),
    content: f.textarea(),
    views: f.number({ default: 0 }),
    published: f.boolean({ default: false }),
    authorId: f.textarea(),
}));
// ============================================================================
// .options() - conditional fields
// ============================================================================
const withSoftDelete = q
    .collection("posts")
    .fields(({ f }) => ({ title: f.textarea() }))
    .options({ softDelete: true });
const withoutTimestamps = q
    .collection("posts")
    .fields(({ f }) => ({ title: f.textarea() }))
    .options({ timestamps: false });
// ============================================================================
// f.relation() - relation config inference
// ============================================================================
const withRelations = q.collection("posts").fields(({ f }) => ({
    title: f.textarea(),
    author: f.relation({
        to: "users",
        required: true,
        relationName: "author",
    }),
    comments: f.relation({
        to: "comments",
        hasMany: true,
        foreignKey: "postId",
        relationName: "post",
    }),
}));
// ============================================================================
// .title() - literal type inference
// ============================================================================
const withTitle = q
    .collection("posts")
    .fields(({ f }) => ({ name: f.textarea(), slug: f.textarea() }))
    .title(({ f }) => f.name);
// ============================================================================
// .upload() - upload fields
// ============================================================================
const withUpload = q
    .collection("media")
    .fields(({ f }) => ({ alt: f.textarea() }))
    .upload({ visibility: "public" });
// ============================================================================
// .merge() - type combination
// ============================================================================
const base = q.collection("posts").fields(({ f }) => ({ title: f.textarea() }));
const extended = base.merge(q.collection("posts").fields(({ f }) => ({
    featured: f.boolean(),
})));
// ============================================================================
// Complex chain
// ============================================================================
const fullCollection = q
    .collection("articles")
    .fields(({ f }) => ({
    title: f.text({ required: true, maxLength: 255 }),
    content: f.textarea(),
    views: f.number({ default: 0 }),
    author: f.relation({
        to: "users",
        required: true,
        relationName: "author",
    }),
    comments: f.relation({
        to: "comments",
        hasMany: true,
        foreignKey: "articleId",
        relationName: "article",
    }),
    metadata: f.json(),
}))
    .options({ timestamps: true, softDelete: true, versioning: true })
    .title(({ f }) => f.title);
// ============================================================================
// Object field — nested type inference
// ============================================================================
const withObjectField = q.collection("barbers").fields(({ f }) => ({
    workingHours: f.object({
        fields: () => ({
            monday: f.object({
                fields: () => ({
                    isOpen: f.boolean({ required: true }),
                    start: f.time(),
                    end: f.time(),
                }),
            }),
        }),
    }),
}));
// ============================================================================
// Array field — typed element inference
// ============================================================================
const withArrayField = q.collection("posts2").fields(({ f }) => ({
    tags: f.array({ of: f.text({ required: true }), required: true }),
    links: f.array({
        of: f.object({
            fields: () => ({
                platform: f.text({ required: true }),
                url: f.url({ required: true }),
            }),
        }),
    }),
}));
// ============================================================================
// CollectionRelations — extracts relation keys from field definitions
// ============================================================================
// Build a multi-collection scenario with f.relation()
const usersCollection = q.collection("users").fields(({ f }) => ({
    name: f.text({ required: true }),
    email: f.text({ required: true }),
}));
const commentsCollection = q.collection("comments").fields(({ f }) => ({
    body: f.textarea({ required: true }),
    postId: f.relation({
        to: "posts",
        required: true,
        relationName: "post",
    }),
}));
const postsWithRelations = q.collection("posts").fields(({ f }) => ({
    title: f.text({ required: true }),
    author: f.relation({
        to: "users",
        required: true,
        relationName: "author",
    }),
    comments: f.relation({
        to: "comments",
        hasMany: true,
        foreignKey: "postId",
        relationName: "post",
    }),
}));
