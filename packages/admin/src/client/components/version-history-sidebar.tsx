import { Icon } from "@iconify/react";
import * as React from "react";
import { useTranslation } from "../i18n/hooks";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "./ui/sheet";

type VersionItem = {
	versionId?: string;
	versionNumber?: number;
	versionOperation?: string;
	versionUserId?: string | null;
	versionCreatedAt?: string | Date;
};

export interface VersionHistorySidebarProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	versions: VersionItem[];
	isLoading?: boolean;
	isReverting?: boolean;
	onRevert: (version: VersionItem) => Promise<void>;
}

function operationLabel(
	operation: string | undefined,
	t: (key: string) => string,
) {
	switch (operation) {
		case "create":
			return t("version.operationCreate");
		case "delete":
			return t("version.operationDelete");
		case "update":
			return t("version.operationUpdate");
		default:
			return operation || t("version.operationUnknown");
	}
}

export function VersionHistorySidebar({
	open,
	onOpenChange,
	title,
	description,
	versions,
	isLoading = false,
	isReverting = false,
	onRevert,
}: VersionHistorySidebarProps): React.ReactElement {
	const { t } = useTranslation();

	const sortedVersions = React.useMemo(() => {
		return [...versions].sort((a, b) => {
			const aNum = a.versionNumber ?? 0;
			const bNum = b.versionNumber ?? 0;
			return bNum - aNum;
		});
	}, [versions]);

	const formatDate = React.useCallback((value?: string | Date) => {
		if (!value) return "-";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "-";
		return date.toLocaleString();
	}, []);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-xl flex flex-col p-0">
				<SheetHeader className="px-6 py-5 border-b">
					<SheetTitle>{title}</SheetTitle>
					{description ? (
						<SheetDescription>{description}</SheetDescription>
					) : null}
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
					{isLoading ? (
						<div className="flex items-center justify-center py-12 text-muted-foreground">
							<Icon icon="ph:spinner-gap" className="size-5 animate-spin" />
						</div>
					) : sortedVersions.length === 0 ? (
						<p className="text-sm text-muted-foreground py-6 text-center">
							{t("version.empty")}
						</p>
					) : (
						sortedVersions.map((version, index) => {
							const canRevert =
								typeof version.versionId === "string" ||
								typeof version.versionNumber === "number";

							return (
								<div
									key={
										version.versionId ??
										`${version.versionNumber ?? "unknown"}-${index}`
									}
									className="rounded-md border p-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<Badge variant="secondary">
													{t("version.label", {
														number: version.versionNumber ?? "-",
													})}
												</Badge>
												<span className="text-sm text-muted-foreground">
													{operationLabel(version.versionOperation, t)}
												</span>
											</div>
											<p className="text-xs text-muted-foreground mt-1">
												{t("version.createdAt")}:{" "}
												{formatDate(version.versionCreatedAt)}
											</p>
											<p className="text-xs text-muted-foreground">
												{t("version.user")}: {version.versionUserId || "-"}
											</p>
										</div>
										<Button
											variant="outline"
											size="sm"
											disabled={!canRevert || isReverting}
											onClick={() => {
												void onRevert(version);
											}}
										>
											{t("version.revert")}
										</Button>
									</div>
								</div>
							);
						})
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
