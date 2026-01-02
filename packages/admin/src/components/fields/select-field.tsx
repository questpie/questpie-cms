import * as React from "react";
import { Controller } from "react-hook-form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { FieldWrapper } from "./field-wrapper";
import { useResolvedControl } from "./field-utils";
import type { BaseFieldProps, SelectOption } from "./field-types";

type SelectFieldProps = BaseFieldProps & {
	options?: SelectOption[];
};

export function SelectField({
	name,
	label,
	description,
	placeholder,
	required,
	disabled,
	localized,
	locale,
	control,
	options,
}: SelectFieldProps) {
	const resolvedControl = useResolvedControl(control);

	return (
		<Controller
			name={name}
			control={resolvedControl}
			render={({ field, fieldState }) => {
				const serializedValue =
					field.value === undefined || field.value === null
						? ""
						: String(field.value);

				return (
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
						<Select
							value={serializedValue}
							onValueChange={(nextValue) => {
								const matched = options?.find(
									(option) => String(option.value) === nextValue,
								);
								field.onChange(matched ? matched.value : nextValue);
							}}
							disabled={disabled}
						>
							<SelectTrigger id={name}>
								<SelectValue placeholder={placeholder} />
							</SelectTrigger>
							<SelectContent>
								{options?.map((option) => (
									<SelectItem
										key={String(option.value)}
										value={String(option.value)}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FieldWrapper>
				);
			}}
		/>
	);
}
