import { useFormContext, type Control } from "react-hook-form";

export function useResolvedControl(control?: Control<any>) {
	const form = useFormContext();
	return control ?? form.control;
}
