import * as React from "react";
import { Controller } from "react-hook-form";
import { FieldWrapper } from "./field-wrapper";
import { useResolvedControl } from "./field-utils";
import type { BaseFieldProps } from "./field-types";

type CustomFieldProps = BaseFieldProps & {
	component: React.ComponentType<any>;
};

export function CustomField({
	name,
	label,
	description,
	placeholder,
	required,
	disabled,
	localized,
	locale,
	control,
	component: Component,
}: CustomFieldProps) {
	const resolvedControl = useResolvedControl(control);

	return (
		<Controller
			name={name}
			control={resolvedControl}
			render={({ field, fieldState }) => (
				<FieldWrapper
					name={name}
					label={label}
					description={description}
					required={required}
					disabled={disabled}
					localized={localized}
					locale={locale}
					error={fieldState.error?.message}
				>
					<Component
						{...field}
						id={name}
						disabled={disabled}
						placeholder={placeholder}
					/>
				</FieldWrapper>
			)}
		/>
	);
}
