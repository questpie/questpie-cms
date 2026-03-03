/**
 * Shared Type Utils Type Tests
 *
 * Tests for type utilities in shared/type-utils.ts
 * These are compile-time only tests - run with: tsc --noEmit
 */
import { questpie } from "#questpie/server/config/builder.js";
import { builtinFields } from "#questpie/server/fields/builtin/defaults.js";
// ============================================================================
// Test fixtures
// ============================================================================
const q = questpie({ name: "test" }).fields(builtinFields);
const usersCollection = q.collection("users").fields(({ f }) => ({
    name: f.textarea({ required: true }),
    email: f.email({ required: true, maxLength: 255 }),
}));
const postsCollection = q.collection("posts").fields(({ f }) => ({
    title: f.text({ required: true, maxLength: 255 }),
    content: f.textarea(),
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
const commentsCollection = q.collection("comments").fields(({ f }) => ({
    text: f.textarea({ required: true }),
    post: f.relation({
        to: "posts",
        required: true,
        relationName: "post",
    }),
}));
const settingsGlobal = q.global("settings").fields(({ f }) => ({
    siteName: f.text({ required: true, maxLength: 255 }),
    maintenanceMode: f.textarea(),
}));
