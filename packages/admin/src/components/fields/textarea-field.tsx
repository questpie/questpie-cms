import * as React from "react";
import { Controller } from "react-hook-form";
import { Textarea } from "../ui/textarea";
import { FieldWrapper } from "./field-wrapper";
import { useResolvedControl } from "./field-utils";
import type { BaseFieldProps } from "./field-types";

export function TextareaField({
	name,
	label,
	description,
	placeholder,
	required,
	disabled,
	localized,
	locale,
	control,
}: BaseFieldProps) {
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
					<Textarea
						{...field}
						id={name}
						value={field.value ?? ""}
						placeholder={placeholder}
						disabled={disabled}
					/>
				</FieldWrapper>
			)}
		/>
	);
}
