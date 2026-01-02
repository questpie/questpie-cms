import type * as React from "react";
import type { Control } from "react-hook-form";

export type SelectOption = { label: string; value: any };

export type BaseFieldProps = {
	name: string;
	label?: string;
	description?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	localized?: boolean;
	locale?: string;
	control?: Control<any>;
};

export type FormFieldType =
	| "text"
	| "email"
	| "password"
	| "number"
	| "textarea"
	| "checkbox"
	| "switch"
	| "select"
	| "date"
	| "datetime";

export type FormFieldProps = BaseFieldProps & {
	type?: FormFieldType;
	options?: SelectOption[];
	component?: React.ComponentType<any>;
};
