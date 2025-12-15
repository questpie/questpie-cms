import type {
	FieldConfig,
	FieldsRecord,
	GetFieldRecordsPaths,
} from "../../types/fields";

export function flattenFields<T extends FieldsRecord>(
	fields: T,
): GetFieldRecordsPaths<T> {
	return flattenFieldsInternal(fields) as GetFieldRecordsPaths<T>;
}

function flattenFieldsInternal(
	fields: FieldsRecord,
	prefix = "",
): Record<string, FieldConfig> {
	const result: Record<string, FieldConfig> = {};

	for (const [key, field] of Object.entries(fields)) {
		const path = prefix ? `${prefix}.${key}` : key;

		result[path] = field;

		if (field.type === "group" || field.type === "array") {
			const nested = flattenFieldsInternal(field.fields, path);
			Object.assign(result, nested);
		}
	}

	return result;
}
