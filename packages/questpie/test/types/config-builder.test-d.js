/**
 * Config Builder Type Tests
 *
 * Tests for questpie(), .collections(), .globals(), .jobs(), .use(), .build()
 * These are compile-time only tests - run with: tsc --noEmit
 */
import { z } from "zod";
import { questpie } from "#questpie/server/config/builder.js";
import { builtinFields } from "#questpie/server/fields/builtin/defaults.js";
import { job } from "#questpie/server/integrated/queue/job.js";
// ============================================================================
// Test fixtures — use q.collection() for proper field type inference
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
}));
const settingsGlobal = q.global("settings").fields(({ f }) => ({
    siteName: f.text({ required: true, maxLength: 255 }),
}));
const sendEmailJob = job({
    name: "send-email",
    schema: z.object({
        to: z.string().email(),
        subject: z.string(),
    }),
    handler: async ({ payload }) => {
        // Send email
    },
});
// ============================================================================
// questpie() factory tests
// ============================================================================
// questpie() should return QuestpieBuilder
const builder = questpie({ name: "test-app" });
// ============================================================================
// .collections() method tests
// ============================================================================
// .collections() should accumulate collections
const withCollections = questpie({ name: "app" }).collections({
    users: usersCollection,
    posts: postsCollection,
});
// ============================================================================
// .globals() method tests
// ============================================================================
// .globals() should accumulate globals
const withGlobals = questpie({ name: "app" }).globals({
    settings: settingsGlobal,
});
// ============================================================================
// .jobs() method tests
// ============================================================================
// .jobs() should accumulate jobs
const withJobs = questpie({ name: "app" }).jobs({
    sendEmail: sendEmailJob,
});
// ============================================================================
// .use() method tests (module composition)
// ============================================================================
// Create a module
const blogModule = questpie({ name: "blog" }).collections({
    posts: postsCollection,
});
// .use() should merge module into builder
const withModule = questpie({ name: "app" })
    .collections({ users: usersCollection })
    .use(blogModule);
// ============================================================================
// Chained builder tests
// ============================================================================
// Full builder chain should work
const fullBuilder = questpie({ name: "full-app" })
    .collections({
    users: usersCollection,
    posts: postsCollection,
})
    .globals({
    settings: settingsGlobal,
})
    .jobs({
    sendEmail: sendEmailJob,
});
// ============================================================================
// Override behavior tests
// ============================================================================
// Later .collections() should override earlier ones
const overrideBuilder = questpie({ name: "app" })
    .collections({ users: usersCollection })
    .collections({ posts: postsCollection });
// ============================================================================
// Type accumulation tests
// ============================================================================
// Builder state should accumulate through chain
const step1 = questpie({ name: "app" });
const step2 = step1.collections({ users: usersCollection });
const step3 = step2.globals({ settings: settingsGlobal });
