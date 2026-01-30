/**
 * HTTP Request Parsers
 *
 * Utilities for parsing query parameters into CRUD options.
 */

import { getQueryParams, parseBoolean } from "./request.js";

export const parseFindOptions = (url: URL) => {
	const parsedQuery = getQueryParams(url);
	const options: any = {};

	if (parsedQuery.limit !== undefined)
		options.limit = Number(parsedQuery.limit);
	if (parsedQuery.offset !== undefined)
		options.offset = Number(parsedQuery.offset);
	if (parsedQuery.page !== undefined) options.page = Number(parsedQuery.page);
	if (parsedQuery.where) options.where = parsedQuery.where;
	if (parsedQuery.orderBy) options.orderBy = parsedQuery.orderBy;
	if (parsedQuery.with) options.with = parsedQuery.with;
	if (parsedQuery.includeDeleted !== undefined) {
		options.includeDeleted = parseBoolean(parsedQuery.includeDeleted);
	}
	// Search by _title (for relation pickers, etc.)
	if (parsedQuery.search) options.search = parsedQuery.search;
	if (parsedQuery.locale) options.locale = parsedQuery.locale;
	if (parsedQuery.localeFallback !== undefined) {
		options.localeFallback = parseBoolean(parsedQuery.localeFallback);
	}

	return options;
};

export const parseFindOneOptions = (url: URL, id: string) => {
	const parsedQuery = getQueryParams(url);
	const options: any = { where: { id } };

	if (parsedQuery.with) options.with = parsedQuery.with;
	if (parsedQuery.includeDeleted !== undefined) {
		options.includeDeleted = parseBoolean(parsedQuery.includeDeleted);
	}
	if (parsedQuery.locale) options.locale = parsedQuery.locale;
	if (parsedQuery.localeFallback !== undefined) {
		options.localeFallback = parseBoolean(parsedQuery.localeFallback);
	}

	return options;
};

export const parseGlobalGetOptions = (url: URL) => {
	const parsedQuery = getQueryParams(url);
	const options: any = {};

	if (parsedQuery.with) options.with = parsedQuery.with;
	if (parsedQuery.columns) options.columns = parsedQuery.columns;
	if (parsedQuery.locale) options.locale = parsedQuery.locale;
	if (parsedQuery.localeFallback !== undefined) {
		options.localeFallback = parseBoolean(parsedQuery.localeFallback);
	}

	return options;
};

export const parseGlobalUpdateOptions = (url: URL) => {
	const parsedQuery = getQueryParams(url);
	const options: any = {};

	if (parsedQuery.with) options.with = parsedQuery.with;
	if (parsedQuery.locale) options.locale = parsedQuery.locale;
	if (parsedQuery.localeFallback !== undefined) {
		options.localeFallback = parseBoolean(parsedQuery.localeFallback);
	}

	return options;
};
