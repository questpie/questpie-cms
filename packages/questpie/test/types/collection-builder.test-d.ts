/**
 * Collection Builder Type Tests
 *
 * Compile-time only - run with: tsc --noEmit
 * If any Expect<> fails, TypeScript compilation fails.
 */

import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, text, varchar } from "drizzle-orm/pg-core";
import type { CollectionBuilder } from "#questpie/server/collection/builder/collection-builder.js";
import { collection } from "#questpie/server/collection/builder/collection-builder.js";
import type { RelationConfig } from "#questpie/server/collection/builder/types.js";
import type {
	Equal,
	Expect,
	Extends,
	HasKey,
	IsLiteral,
	IsNullable,
	OptionalKeys,
} from "./type-test-utils.js";

// ============================================================================
// Test fixtures
// ============================================================================

const postsCollection = collection("posts")
	.fields({
		title: varchar("title", { length: 255 }).notNull(),
		content: text("content"),
		views: integer("views").default(0),
		published: boolean("published").default(false),
		authorId: text("author_id"),
	})
	.localized(["title", "content"] as const);

// ============================================================================
// collection() factory - name inference
// ============================================================================

type PostsBuilder = typeof postsCollection;
type PostsState = PostsBuilder extends CollectionBuilder<infer S> ? S : never;
type PostsName = PostsState["name"];

type _nameIsLiteral = Expect<IsLiteral<PostsName>>;
type _nameIsPosts = Expect<Equal<PostsName, "posts">>;

// ============================================================================
// .fields() - select type inference
// ============================================================================

type PostSelect = typeof postsCollection.$infer.select;

// Field types
type _titleIsString = Expect<Equal<PostSelect["title"], string>>;
type _contentIsNullable = Expect<IsNullable<PostSelect["content"]>>;
type _viewsIsNumberOrNull = Expect<Extends<PostSelect["views"], number | null>>;

// System fields present
type _hasId = Expect<Equal<HasKey<PostSelect, "id">, true>>;
type _hasCreatedAt = Expect<Equal<HasKey<PostSelect, "createdAt">, true>>;
type _hasUpdatedAt = Expect<Equal<HasKey<PostSelect, "updatedAt">, true>>;
type _has_title = Expect<Equal<HasKey<PostSelect, "_title">, true>>;

// ============================================================================
// .fields() - insert type inference
// ============================================================================

type PostInsert = typeof postsCollection.$infer.insert;
type InsertOptional = OptionalKeys<PostInsert>;

// Localized fields are optional
type _titleOptional = Expect<Extends<"title", InsertOptional>>;
type _contentOptional = Expect<Extends<"content", InsertOptional>>;

// Fields with defaults are optional
type _viewsOptional = Expect<Extends<"views", InsertOptional>>;
type _idOptional = Expect<Extends<"id", InsertOptional>>;

// ============================================================================
// .fields() - update type inference
// ============================================================================

type PostUpdate = typeof postsCollection.$infer.update;
type UpdateOptional = OptionalKeys<PostUpdate>;

// All fields optional in update
type _updateTitleOptional = Expect<Extends<"title", UpdateOptional>>;
type _updateContentOptional = Expect<Extends<"content", UpdateOptional>>;
type _updateViewsOptional = Expect<Extends<"views", UpdateOptional>>;

// ============================================================================
// .localized() - key validation
// ============================================================================

type LocalizedKeys = PostsState["localized"];
type _localizedCorrect = Expect<
	Equal<LocalizedKeys, readonly ["title", "content"]>
>;

// ============================================================================
// .options() - conditional fields
// ============================================================================

const withSoftDelete = collection("posts")
	.fields({ title: text("title") })
	.options({ softDelete: true });

type SoftDeleteSelect = typeof withSoftDelete.$infer.select;
type _hasDeletedAt = Expect<Equal<HasKey<SoftDeleteSelect, "deletedAt">, true>>;

const withoutTimestamps = collection("posts")
	.fields({ title: text("title") })
	.options({ timestamps: false });

type NoTimestampsSelect = typeof withoutTimestamps.$infer.select;
type _noCreatedAt = Expect<
	Equal<HasKey<NoTimestampsSelect, "createdAt">, false>
>;

// ============================================================================
// .virtuals() - SQL type inference
// ============================================================================

const withVirtuals = collection("users")
	.fields({
		firstName: text("first_name"),
		lastName: text("last_name"),
	})
	.virtuals(() => ({
		fullName: sql<string>`'computed'`,
		isActive: sql<boolean>`true`,
	}));

type VirtualsSelect = typeof withVirtuals.$infer.select;
type _hasFullName = Expect<Equal<HasKey<VirtualsSelect, "fullName">, true>>;
type _fullNameString = Expect<Equal<VirtualsSelect["fullName"], string>>;
type _isActiveBoolean = Expect<Equal<VirtualsSelect["isActive"], boolean>>;

// ============================================================================
// .relations() - relation config inference
// ============================================================================

const withRelations = collection("posts")
	.fields({
		title: text("title"),
		authorId: text("author_id"),
	})
	.relations(({ table, one, many }) => ({
		author: one("users", {
			fields: [table.authorId],
			references: ["id"],
		}),
		comments: many("comments"),
	}));

type RelationsState =
	typeof withRelations extends CollectionBuilder<infer S> ? S : never;
type Relations = RelationsState["relations"];

type _hasAuthor = Expect<Equal<HasKey<Relations, "author">, true>>;
type _hasComments = Expect<Equal<HasKey<Relations, "comments">, true>>;
type _authorIsRelationConfig = Expect<
	Extends<Relations["author"], RelationConfig>
>;

// ============================================================================
// .title() - literal type inference
// ============================================================================

const withTitle = collection("posts")
	.fields({ name: text("name"), slug: text("slug") })
	.title(({ f }) => f.name);

type TitleState =
	typeof withTitle extends CollectionBuilder<infer S> ? S : never;
type TitleField = TitleState["title"];

type _titleIsName = Expect<Equal<TitleField, "name">>;
type _titleIsLiteral = Expect<IsLiteral<TitleField>>;

// ============================================================================
// .upload() - upload fields
// ============================================================================

const withUpload = collection("media")
	.fields({ alt: text("alt") })
	.upload({ visibility: "public" });

type UploadSelect = typeof withUpload.$infer.select;

type _hasKey = Expect<Equal<HasKey<UploadSelect, "key">, true>>;
type _hasFilename = Expect<Equal<HasKey<UploadSelect, "filename">, true>>;
type _hasMimeType = Expect<Equal<HasKey<UploadSelect, "mimeType">, true>>;
type _hasSize = Expect<Equal<HasKey<UploadSelect, "size">, true>>;
type _hasUrl = Expect<Equal<HasKey<UploadSelect, "url">, true>>;

// ============================================================================
// .$outputType() - output extension
// ============================================================================

const withOutput = collection("assets")
	.fields({ key: text("key") })
	.$outputType<{ url: string; thumbnailUrl?: string }>();

type OutputSelect = typeof withOutput.$infer.select;

type _outputHasUrl = Expect<Equal<HasKey<OutputSelect, "url">, true>>;
type _outputHasThumbnail = Expect<
	Equal<HasKey<OutputSelect, "thumbnailUrl">, true>
>;

// ============================================================================
// .merge() - type combination
// ============================================================================

const base = collection("posts").fields({ title: text("title") });
const extended = base.merge(
	collection("posts").fields({ featured: boolean("featured") }),
);

type MergedState =
	typeof extended extends CollectionBuilder<infer S> ? S : never;
type MergedFields = MergedState["fields"];

type _mergedHasTitle = Expect<Equal<HasKey<MergedFields, "title">, true>>;
type _mergedHasFeatured = Expect<Equal<HasKey<MergedFields, "featured">, true>>;

// ============================================================================
// $infer helper
// ============================================================================

type Infer = typeof postsCollection.$infer;

type _inferHasSelect = Expect<Equal<HasKey<Infer, "select">, true>>;
type _inferHasInsert = Expect<Equal<HasKey<Infer, "insert">, true>>;
type _inferHasUpdate = Expect<Equal<HasKey<Infer, "update">, true>>;

// ============================================================================
// Complex chain
// ============================================================================

const fullCollection = collection("articles")
	.fields({
		title: varchar("title", { length: 255 }).notNull(),
		content: text("content"),
		views: integer("views").default(0),
		authorId: text("author_id").notNull(),
		metadata: jsonb("metadata").$type<{ tags: string[] }>(),
	})
	.localized(["title", "content"] as const)
	.options({ timestamps: true, softDelete: true, versioning: true })
	.virtuals(() => ({ isPopular: sql<boolean>`true` }))
	.relations(({ table, one, many }) => ({
		author: one("users", { fields: [table.authorId], references: ["id"] }),
		comments: many("comments"),
	}))
	.title(({ f }) => f.title)
	.$outputType<{ readTime: number }>();

type FullSelect = typeof fullCollection.$infer.select;

type _fullHasTitle = Expect<Equal<HasKey<FullSelect, "title">, true>>;
type _fullHasMetadata = Expect<Equal<HasKey<FullSelect, "metadata">, true>>;
type _fullHasDeletedAt = Expect<Equal<HasKey<FullSelect, "deletedAt">, true>>;
type _fullHasIsPopular = Expect<Equal<HasKey<FullSelect, "isPopular">, true>>;
type _fullHasReadTime = Expect<Equal<HasKey<FullSelect, "readTime">, true>>;
