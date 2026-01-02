import * as React from "react";
import type { FormFieldProps } from "../fields/field-types";
import { CheckboxField } from "../fields/checkbox-field";
import { CustomField } from "../fields/custom-field";
import { DateField } from "../fields/date-field";
import { DatetimeField } from "../fields/datetime-field";
import { EmailField } from "../fields/email-field";
import { NumberField } from "../fields/number-field";
import { PasswordField } from "../fields/password-field";
import { SelectField } from "../fields/select-field";
import { SwitchField } from "../fields/switch-field";
import { TextareaField } from "../fields/textarea-field";
import { TextField } from "../fields/text-field";

export type { FormFieldProps } from "../fields/field-types";

/**
 * FormField - Generic form field with React Hook Form integration
 */
export function FormField({
	type = "text",
	component,
	options,
	...baseProps
}: FormFieldProps): React.ReactElement {
	if (component) {
		return <CustomField {...baseProps} component={component} />;
	}

	switch (type) {
		case "textarea":
			return <TextareaField {...baseProps} />;
		case "checkbox":
			return <CheckboxField {...baseProps} />;
		case "switch":
			return <SwitchField {...baseProps} />;
		case "select":
			return <SelectField {...baseProps} options={options} />;
		case "number":
			return <NumberField {...baseProps} />;
		case "date":
			return <DateField {...baseProps} />;
		case "datetime":
			return <DatetimeField {...baseProps} />;
		case "email":
			return <EmailField {...baseProps} />;
		case "password":
			return <PasswordField {...baseProps} />;
		default:
			return <TextField {...baseProps} />;
	}
}
