import * as React from "react";
import { Controller } from "react-hook-form";
import { Input } from "../ui/input";
import { FieldWrapper } from "./field-wrapper";
import { useResolvedControl } from "./field-utils";
import type { BaseFieldProps } from "./field-types";

export function NumberField({
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
					<Input
						{...field}
						id={name}
						type="number"
						value={field.value ?? ""}
						placeholder={placeholder}
						disabled={disabled}
						onChange={(event) => {
							const nextValue = event.target.value;
							field.onChange(
								nextValue === "" ? undefined : Number(nextValue),
							);
						}}
					/>
				</FieldWrapper>
			)}
		/>
	);
}
