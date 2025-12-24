import {
	text,
	varchar,
	boolean,
	integer,
	json,
	timestamp,
} from "drizzle-orm/pg-core";

/**
 * Opinionated field helpers for QUESTPIE CMS.
 * These wrap Drizzle column builders to provide standard CMS field types.
 */
export const fields = {
	/**
	 * Short text (varchar 255)
	 */
	text: (name: string) => varchar(name, { length: 255 }),

	/**
	 * Long text / TextArea
	 */
	textarea: (name: string) => text(name),

	/**
	 * Rich Text (stored as text or JSON)
	 */
	richText: (name: string) => json(name),

	/**
	 * Boolean / Toggle
	 */
	checkbox: (name: string) => boolean(name),

	/**
	 * Integer number
	 */
	number: (name: string) => integer(name),

	/**
	 * Timestamp
	 */
	timestamp: (name: string) => timestamp(name),

	/**
	 * Single Image (Flydrive integration)
	 * Stored as JSON: { key: string, url: string, ... }
	 */
	image: (name: string) =>
		json(name).$type<{
			key: string;
			url: string;
			alt?: string;
			width?: number;
			height?: number;
		}>(),

	/**
	 * Single File (Flydrive integration)
	 */
	file: (name: string) =>
		json(name).$type<{
			key: string;
			url: string;
			size: number;
			mime: string;
			name: string;
		}>(),

	/**
	 * Multiple Images
	 */
	gallery: (name: string) =>
		json(name).$type<
			Array<{
				key: string;
				url: string;
				alt?: string;
			}>
		>(),
};
