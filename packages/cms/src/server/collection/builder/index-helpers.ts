import { sql } from "drizzle-orm";
import { uniqueIndex, type PgColumn } from "drizzle-orm/pg-core";

export const softDeleteUniqueIndex = (
	name: string,
	deletedAtColumn: PgColumn,
	...columns: PgColumn[]
) => {
	return uniqueIndex(name)
		.on([...columns])
		.where(sql`${deletedAtColumn} IS NULL`);
};
