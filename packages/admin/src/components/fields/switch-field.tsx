import * as React from "react";
import { Controller } from "react-hook-form";
import { Switch } from "../ui/switch";
import { FieldWrapper } from "./field-wrapper";
import { useResolvedControl } from "./field-utils";
import type { BaseFieldProps } from "./field-types";

export function SwitchField({
	name,
	label,
	description,
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
					<Switch
						id={name}
						checked={!!field.value}
						onCheckedChange={(checked) => {
							field.onChange(!!checked);
						}}
						disabled={disabled}
					/>
				</FieldWrapper>
			)}
		/>
	);
}
