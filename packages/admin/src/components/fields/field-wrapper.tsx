import * as React from "react";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "../ui/field";
import { LocaleBadge } from "./locale-badge";

type FieldWrapperProps = {
	name: string;
	label?: string;
	description?: string;
	required?: boolean;
	disabled?: boolean;
	error?: string;
	localized?: boolean;
	locale?: string;
	children: React.ReactNode;
};

export function FieldWrapper({
	name,
	label,
	description,
	required,
	disabled,
	error,
	localized,
	locale,
	children,
}: FieldWrapperProps) {
	return (
		<Field data-disabled={disabled} data-invalid={!!error}>
			<div className="space-y-2">
				{label && (
					<FieldLabel htmlFor={name} className="flex items-center gap-2">
						<span className="flex items-center gap-1">
							{label}
							{required && <span className="text-destructive">*</span>}
						</span>
						{localized && <LocaleBadge locale={locale || "i18n"} />}
					</FieldLabel>
				)}
				<FieldContent>{children}</FieldContent>
				{description && <FieldDescription>{description}</FieldDescription>}
				{error && <FieldError errors={[{ message: error }]} />}
			</div>
		</Field>
	);
}
