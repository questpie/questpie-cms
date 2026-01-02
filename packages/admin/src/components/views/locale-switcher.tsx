import * as React from "react";
import { useAdminContext } from "../../hooks/admin-provider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";

export function LocaleSwitcher() {
	const { locale, setLocale, locales } = useAdminContext<any>();
	const available = locales?.available ?? [];

	if (!setLocale || available.length <= 1) return null;

	const currentLocale = locale ?? locales?.default ?? available[0];

	return (
		<div className="flex items-center gap-2">
			<Badge variant="outline" className="uppercase text-[10px] tracking-wide">
				Locale
			</Badge>
			<Select
				value={currentLocale}
				onValueChange={(value) => setLocale(value)}
			>
				<SelectTrigger className="h-8 w-[120px]">
					<SelectValue placeholder="Locale" />
				</SelectTrigger>
				<SelectContent>
					{available.map((code) => (
						<SelectItem key={code} value={code}>
							{code.toUpperCase()}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
