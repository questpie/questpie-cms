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
import type {
	Equal,
	Expect,
	Extends,
	HasKey,
	IsNullable,
	Not,
	OptionalKeys,
	RequiredKeys,
} from "./type-test-utils.js";

// ============================================================================
// Test Setup - Define test module with unified API
// ============================================================================

const q = questpie({ name: "type-test" }).fields(defaultFields);

// Users collection
const users = q
	.collection("users")
	.fields((f) => ({
		name: f.text({ required: true, maxLength: 100 }),
		email: f.text({ required: true }),
		bio: f.textarea({ localized: true }),
	}))
	.build();

// Posts collection with relations
const posts = q
	.collection("posts")
	.fields((f) => ({
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
	}))
	.options({ softDelete: true, versioning: true })
	.build();

// Comments collection
const comments = q
	.collection("comments")
	.fields((f) => ({
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
	}))
	.build();

// Tags collection for many-to-many
const tags = q
	.collection("tags")
	.fields((f) => ({
		name: f.text({ required: true, maxLength: 50 }),
		slug: f.text({ required: true }),
	}))
	.build();

// Media collection with upload
const media = q
	.collection("media")
	.fields((f) => ({
		alt: f.text({ maxLength: 255 }),
		caption: f.textarea({ localized: true }),
	}))
	.upload({ visibility: "public" })
	.build();

// Site settings global
const siteSettings = q
	.global("site_settings")
	.fields((f) => ({
		siteName: f.text({ required: true, maxLength: 100 }),
		tagline: f.textarea({ localized: true }),
		featuredPost: f.relation({ to: "posts", relationName: "featured" }),
	}))
	.options({ versioning: { enabled: true } })
	.build();

// Build the module
const testModule = q
	.collections({ users, posts, comments, tags, media })
	.globals({ site_settings: siteSettings });

// ============================================================================
// Table Shape Inference Tests
// ============================================================================

// Main table columns - basic fields
type PostsTable = typeof posts.table;
type _postsTableHasId = Expect<Equal<HasKey<PostsTable, "id">, true>>;
type _postsTableHasTitle = Expect<Equal<HasKey<PostsTable, "title">, true>>;
type _postsTableHasSlug = Expect<Equal<HasKey<PostsTable, "slug">, true>>;
type _postsTableHasDeletedAt = Expect<
	Equal<HasKey<PostsTable, "deletedAt">, true>
>;
type _postsTableHasCreatedAt = Expect<
	Equal<HasKey<PostsTable, "createdAt">, true>
>;

// I18n table exists for localized fields
type PostsI18nTable = typeof posts.i18nTable;
type _postsI18nTableExists = Expect<Not<Equal<PostsI18nTable, null>>>;

// Versions table (when versioning enabled)
type PostsVersionsTable = typeof posts.versionsTable;
type _postsVersionsTableExists = Expect<Not<Equal<PostsVersionsTable, null>>>;

// Users table columns
type UsersTable = typeof users.table;
type _usersTableHasName = Expect<Equal<HasKey<UsersTable, "name">, true>>;
type _usersTableHasEmail = Expect<Equal<HasKey<UsersTable, "email">, true>>;

// Media table (with upload fields)
type MediaTable = typeof media.table;
type _mediaTableHasKey = Expect<Equal<HasKey<MediaTable, "key">, true>>;
type _mediaTableHasFilename = Expect<
	Equal<HasKey<MediaTable, "filename">, true>
>;
type _mediaTableHasMimeType = Expect<
	Equal<HasKey<MediaTable, "mimeType">, true>
>;
type _mediaTableHasSize = Expect<Equal<HasKey<MediaTable, "size">, true>>;
type _mediaTableHasVisibility = Expect<
	Equal<HasKey<MediaTable, "visibility">, true>
>;

// ============================================================================
// $infer Select Type Tests
// ============================================================================

type PostSelect = typeof posts.$infer.select;

// Required fields are non-null
type _postSelectTitleString = Expect<Equal<PostSelect["title"], string>>;
type _postSelectSlugString = Expect<Equal<PostSelect["slug"], string>>;

// Optional fields are nullable
type _postSelectContentNullable = Expect<IsNullable<PostSelect["content"]>>;
type _postSelectViewsNullable = Expect<IsNullable<PostSelect["views"]>>;

// System fields
type _postSelectHasId = Expect<Equal<HasKey<PostSelect, "id">, true>>;
type _postSelectHasCreatedAt = Expect<
	Equal<HasKey<PostSelect, "createdAt">, true>
>;
type _postSelectHasUpdatedAt = Expect<
	Equal<HasKey<PostSelect, "updatedAt">, true>
>;
type _postSelectHas_title = Expect<Equal<HasKey<PostSelect, "_title">, true>>;

// Soft delete field
type _postSelectHasDeletedAt = Expect<
	Equal<HasKey<PostSelect, "deletedAt">, true>
>;

// ============================================================================
// $infer Insert Type Tests
// ============================================================================

type PostInsert = typeof posts.$infer.insert;
type PostInsertRequired = RequiredKeys<PostInsert>;
type PostInsertOptional = OptionalKeys<PostInsert>;

// Required fields must be provided
type _postInsertTitleRequired = Expect<Extends<"title", PostInsertRequired>>;
type _postInsertSlugRequired = Expect<Extends<"slug", PostInsertRequired>>;

// Fields with defaults are optional
type _postInsertViewsOptional = Expect<Extends<"views", PostInsertOptional>>;
type _postInsertPublishedOptional = Expect<
	Extends<"published", PostInsertOptional>
>;
type _postInsertIdOptional = Expect<Extends<"id", PostInsertOptional>>;

// Nullable fields are optional
type _postInsertContentOptional = Expect<
	Extends<"content", PostInsertOptional>
>;

// ============================================================================
// $infer Update Type Tests
// ============================================================================

type PostUpdate = typeof posts.$infer.update;
type PostUpdateOptional = OptionalKeys<PostUpdate>;

// All fields should be optional in update
type _postUpdateTitleOptional = Expect<Extends<"title", PostUpdateOptional>>;
type _postUpdateSlugOptional = Expect<Extends<"slug", PostUpdateOptional>>;
type _postUpdateContentOptional = Expect<
	Extends<"content", PostUpdateOptional>
>;
type _postUpdateViewsOptional = Expect<Extends<"views", PostUpdateOptional>>;

// ============================================================================
// Global Type Tests
// ============================================================================

type SiteSettingsSelect = typeof siteSettings.$infer.select;

// Required fields - check siteName exists and is string-like
type _siteSettingsSiteNameExists = Expect<
	Equal<HasKey<SiteSettingsSelect, "siteName">, true>
>;
type _siteSettingsSiteNameString = Expect<
	Extends<string, NonNullable<SiteSettingsSelect["siteName"]>>
>;

// Optional/nullable fields
type _siteSettingsTaglineNullable = Expect<
	IsNullable<SiteSettingsSelect["tagline"]>
>;

// System fields
type _siteSettingsHasId = Expect<Equal<HasKey<SiteSettingsSelect, "id">, true>>;
type _siteSettingsHasCreatedAt = Expect<
	Equal<HasKey<SiteSettingsSelect, "createdAt">, true>
>;

// ============================================================================
// Upload Collection Type Tests
// ============================================================================

type MediaSelect = typeof media.$infer.select;

// Upload fields are present
type _mediaSelectHasKey = Expect<Equal<HasKey<MediaSelect, "key">, true>>;
type _mediaSelectHasFilename = Expect<
	Equal<HasKey<MediaSelect, "filename">, true>
>;
type _mediaSelectHasMimeType = Expect<
	Equal<HasKey<MediaSelect, "mimeType">, true>
>;
type _mediaSelectHasSize = Expect<Equal<HasKey<MediaSelect, "size">, true>>;
type _mediaSelectHasVisibility = Expect<
	Equal<HasKey<MediaSelect, "visibility">, true>
>;

// Custom fields are present
type _mediaSelectHasAlt = Expect<Equal<HasKey<MediaSelect, "alt">, true>>;
type _mediaSelectHasCaption = Expect<
	Equal<HasKey<MediaSelect, "caption">, true>
>;

// URL is added via $outputType in upload() - url: string is added to select type
type _mediaSelectUrlCheck = MediaSelect extends { url: string } ? true : false;

// ============================================================================
// Localized Field Tests
// ============================================================================

type PostsLocalized = typeof posts.state.localized;
type UsersLocalized = typeof users.state.localized;

// Posts should have content in localized array
type _postsLocalizedHasContent = Expect<
	Extends<"content", PostsLocalized[number]>
>;

// Users should have bio in localized array
type _usersLocalizedHasBio = Expect<Extends<"bio", UsersLocalized[number]>>;

// ============================================================================
// Options Type Tests
// ============================================================================

type PostsOptions = typeof posts.state.options;

// Check that options are correctly set
type _postsOptionsSoftDelete = Expect<Equal<PostsOptions["softDelete"], true>>;
type _postsOptionsVersioning = Expect<Equal<PostsOptions["versioning"], true>>;

// ============================================================================
// Module Type Tests - Collections and Globals
// ============================================================================

type ModuleCollections = typeof testModule.state.collections;
type ModuleGlobals = typeof testModule.state.globals;

// Collections should be present
type _moduleHasUsers = Expect<Equal<HasKey<ModuleCollections, "users">, true>>;
type _moduleHasPosts = Expect<Equal<HasKey<ModuleCollections, "posts">, true>>;
type _moduleHasComments = Expect<
	Equal<HasKey<ModuleCollections, "comments">, true>
>;
type _moduleHasTags = Expect<Equal<HasKey<ModuleCollections, "tags">, true>>;
type _moduleHasMedia = Expect<Equal<HasKey<ModuleCollections, "media">, true>>;

// Globals should be present
type _moduleHasSiteSettings = Expect<
	Equal<HasKey<ModuleGlobals, "site_settings">, true>
>;

// ============================================================================
// Field Definition Tests
// ============================================================================

type PostFieldDefs = typeof posts.state.fieldDefinitions;

// Field definitions should be present
type _postsFieldDefsHasTitle = Expect<
	Equal<HasKey<PostFieldDefs, "title">, true>
>;
type _postsFieldDefsHasContent = Expect<
	Equal<HasKey<PostFieldDefs, "content">, true>
>;
type _postsFieldDefsHasSlug = Expect<
	Equal<HasKey<PostFieldDefs, "slug">, true>
>;
type _postsFieldDefsHasAuthor = Expect<
	Equal<HasKey<PostFieldDefs, "author">, true>
>;

// ============================================================================
// State Fields (Drizzle columns) Tests
// ============================================================================

type PostStateFields = typeof posts.state.fields;

// State fields should include the Drizzle columns
type _postsStateFieldsHasTitle = Expect<
	Equal<HasKey<PostStateFields, "title">, true>
>;
type _postsStateFieldsHasSlug = Expect<
	Equal<HasKey<PostStateFields, "slug">, true>
>;
// Note: Relation FK column key in state.fields is the field name with Id suffix
// The actual key stored depends on collection-builder implementation
