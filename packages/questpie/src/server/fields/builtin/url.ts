/**
 * URL Field Type
 *
 * URL field with protocol and format validation.
 * Supports allowed protocols and host-based operators.
 */

import {
	eq,
	ne,
	like,
	ilike,
	inArray,
	notInArray,
	isNull,
	isNotNull,
	sql,
} from "drizzle-orm";
import { varchar, text } from "drizzle-orm/pg-core";
import { z } from "zod";
import { defineField } from "../define-field.js";
import type {
	BaseFieldConfig,
	ContextualOperators,
	FieldMetadataBase,
} from "../types.js";
import { getDefaultRegistry } from "../registry.js";

// ============================================================================
// URL Field Configuration
// ============================================================================

/**
 * URL field configuration options.
 */
export interface UrlFieldConfig extends BaseFieldConfig {
	/**
	 * Allowed protocols.
	 * @default ["http", "https"]
	 */
	protocols?: string[];

	/**
	 * Maximum character length.
	 * @default 2048
	 */
	maxLength?: number;

	/**
	 * Use text storage mode instead of varchar.
	 * Use for potentially very long URLs.
	 * @default false
	 */
	textMode?: boolean;

	/**
	 * Allowed hosts (whitelist).
	 * If provided, only URLs with these hosts are valid.
	 */
	allowedHosts?: string[];

	/**
	 * Blocked hosts (blacklist).
	 * URLs with these hosts are rejected.
	 */
	blockedHosts?: string[];
}

// ============================================================================
// URL Field Operators
// ============================================================================

/**
 * Get operators for URL field.
 * Includes URL-specific operators like host matching.
 */
function getUrlOperators(): ContextualOperators {
	return {
		column: {
			eq: (col, value) => eq(col, value as string),
			ne: (col, value) => ne(col, value as string),
			like: (col, value) => like(col, value as string),
			ilike: (col, value) => ilike(col, value as string),
			startsWith: (col, value) => like(col, `${value}%`),
			contains: (col, value) => ilike(col, `%${value}%`),
			in: (col, values) => inArray(col, values as string[]),
			notIn: (col, values) => notInArray(col, values as string[]),
			// URL-specific operators
			host: (col, value) => ilike(col, `%://${value}%`),
			hostIn: (col, values) => {
				const hosts = values as string[];
				if (hosts.length === 0) return sql`FALSE`;
				if (hosts.length === 1) return ilike(col, `%://${hosts[0]}%`);
				return sql`(${sql.join(
					hosts.map((h) => ilike(col, `%://${h}%`)),
					sql` OR `,
				)})`;
			},
			protocol: (col, value) => like(col, `${value}://%`),
			isNull: (col) => isNull(col),
			isNotNull: (col) => isNotNull(col),
		},
		jsonb: {
			eq: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' = ${value}`;
			},
			ne: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' != ${value}`;
			},
			like: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' LIKE ${value}`;
			},
			ilike: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' ILIKE ${value}`;
			},
			startsWith: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' LIKE ${value + "%"}`;
			},
			contains: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' ILIKE ${"%" + value + "%"}`;
			},
			host: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' ILIKE ${"%://" + value + "%"}`;
			},
			protocol: (col, value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>>'{${sql.raw(path)}}' LIKE ${value + "://%"}`;
			},
			isNull: (col, _value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' IS NULL`;
			},
			isNotNull: (col, _value, ctx) => {
				const path = ctx.jsonbPath?.join(",") ?? "";
				return sql`${col}#>'{${sql.raw(path)}}' IS NOT NULL`;
			},
		},
	};
}

// ============================================================================
// URL Field Definition
// ============================================================================

/**
 * URL field factory.
 * Creates a URL field with the given configuration.
 *
 * @example
 * ```ts
 * const website = urlField({ required: true });
 * const socialLink = urlField({ protocols: ["https"], maxLength: 500 });
 * const internalLink = urlField({ allowedHosts: ["example.com", "app.example.com"] });
 * ```
 */
export const urlField = defineField<"url", UrlFieldConfig, string>("url", {
	toColumn(name, config) {
		const { maxLength = 2048, textMode = false } = config;

		let column: any = textMode ? text(name) : varchar(name, { length: maxLength });

		// Apply constraints
		if (config.required && config.nullable !== true) {
			column = column.notNull();
		}
		if (config.default !== undefined) {
			const defaultValue =
				typeof config.default === "function"
					? config.default()
					: config.default;
			column = column.default(defaultValue as string);
		}
		if (config.unique) {
			column = column.unique();
		}

		return column;
	},

	toZodSchema(config) {
		const { protocols = ["http", "https"], maxLength = 2048 } = config;

		let schema = z.string().url();

		// Max length
		schema = schema.max(maxLength);

		// Protocol validation
		if (protocols.length > 0) {
			const protocolPattern = new RegExp(
				`^(${protocols.join("|")})://`,
				"i",
			);
			schema = schema.refine(
				(url) => protocolPattern.test(url),
				{
					message: `URL must use one of these protocols: ${protocols.join(", ")}`,
				},
			);
		}

		// Host validation
		if (config.allowedHosts && config.allowedHosts.length > 0) {
			const hosts = config.allowedHosts.map((h) => h.toLowerCase());
			schema = schema.refine(
				(url) => {
					try {
						const host = new URL(url).host.toLowerCase();
						return hosts.some(
							(h) => host === h || host.endsWith(`.${h}`),
						);
					} catch {
						return false;
					}
				},
				{
					message: `URL host must be one of: ${config.allowedHosts.join(", ")}`,
				},
			);
		}

		if (config.blockedHosts && config.blockedHosts.length > 0) {
			const hosts = config.blockedHosts.map((h) => h.toLowerCase());
			schema = schema.refine(
				(url) => {
					try {
						const host = new URL(url).host.toLowerCase();
						return !hosts.some(
							(h) => host === h || host.endsWith(`.${h}`),
						);
					} catch {
						return true;
					}
				},
				{
					message: `URL host is not allowed: ${config.blockedHosts.join(", ")}`,
				},
			);
		}

		// Nullability
		if (!config.required && config.nullable !== false) {
			return schema.nullish();
		}

		return schema;
	},

	getOperators() {
		return getUrlOperators();
	},

	getMetadata(config): FieldMetadataBase {
		return {
			type: "url",
			label: config.label,
			description: config.description,
			required: config.required ?? false,
			localized: config.localized ?? false,
			unique: config.unique ?? false,
			searchable: config.searchable ?? false,
			readOnly: config.input === false,
			writeOnly: config.output === false,
			validation: {
				maxLength: config.maxLength ?? 2048,
			},
		};
	},
});

// Register in default registry
getDefaultRegistry().register("url", urlField);
