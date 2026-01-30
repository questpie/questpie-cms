import { Controller } from "react-hook-form";
import { ToggleInput } from "../primitives/toggle-input";
import type { BooleanFieldProps } from "./field-types";
import { useResolvedControl } from "./field-utils";
import { FieldWrapper } from "./field-wrapper";

export function SwitchField({
	name,
	label,
	description,
	required,
	disabled,
	localized,
	locale,
	control,
	className,
}: BooleanFieldProps) {
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
					<ToggleInput
						id={name}
						value={!!field.value}
						onChange={field.onChange}
						disabled={disabled}
						aria-invalid={!!fieldState.error}
						className={className}
					/>
				</FieldWrapper>
			)}
		/>
	);
}
