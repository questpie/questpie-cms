import { sql } from "drizzle-orm";
import { uniqueIndex, type PgColumn } from "drizzle-orm/pg-core";

/**
 * Creates a unique index that only applies to non-deleted rows.
 * @example
 * ```ts
 * import { softDeleteUniqueIndex } from "#questpie/cms/server/collection/builder/index-helpers.js";
 *
 * const users = defineCollection("users")
 *   .fields({
 *     email: varchar("email", { length: 255 }).notNull(),
 *   }).options({
 *     softDelete: true,
 *   }).indexes(({table}) => [
 *     softDeleteUniqueIndex("users_email_unique", table.deletedAt, table.email),
 *   ])
 * ```
 */
export const softDeleteUniqueIndex = (
	name: string,
	deletedAtColumn: PgColumn,
	...columns: PgColumn[]
) => {
	return uniqueIndex(name)
		.on([...columns])
		.where(sql`${deletedAtColumn} IS NULL`);
};
