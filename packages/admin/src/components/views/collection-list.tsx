import React from "react";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
	getSortedRowModel,
	type SortingState,
} from "@tanstack/react-table";
import type { QCMS } from "@questpie/cms/server";
import type { QCMSClient } from "@questpie/cms/client";
import { useCollection } from "../../hooks/use-collection-db";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../ui/table";
import { Button } from "../ui/button";

/**
 * Collection item type helper
 */
type CollectionItem<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
> = Awaited<
	ReturnType<QCMSClient<T>["collections"][K]["find"]>
> extends { docs: Array<infer TItem> }
	? TItem
	: never;

/**
 * CollectionList props
 */
export type CollectionListProps<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
> = {
	/**
	 * Collection name
	 */
	collection: K;

	/**
	 * Column definitions
	 */
	columns: ColumnDef<CollectionItem<T, K>>[];

	/**
	 * Base query options (filters, sorting, relations)
	 */
	baseFindOptions?: Parameters<QCMSClient<T>["collections"][K]["find"]>[0];

	/**
	 * Enable realtime sync
	 */
	realtime?: boolean;

	/**
	 * Custom row actions
	 */
	rowActions?: (item: CollectionItem<T, K>) => React.ReactNode;

	/**
	 * Custom header actions
	 */
	headerActions?: React.ReactNode;

	/**
	 * Custom empty state
	 */
	emptyState?: React.ReactNode;

	/**
	 * On row click handler
	 */
	onRowClick?: (item: CollectionItem<T, K>) => void;
};

/**
 * CollectionList - Table view for CMS collections
 * Uses TanStack DB Collection for offline-first, realtime data
 *
 * @example
 * ```tsx
 * import { CollectionList } from '@questpie/admin/components'
 * import type { cms } from './server/cms'
 *
 * function PostsList() {
 *   return (
 *     <CollectionList<typeof cms, 'posts'>
 *       collection="posts"
 *       columns={[
 *         { accessorKey: 'title', header: 'Title' },
 *         { accessorKey: 'createdAt', header: 'Created' },
 *       ]}
 *       realtime={true}
 *       onRowClick={(post) => router.push(`/posts/${post.id}`)}
 *     />
 *   )
 * }
 * ```
 */
export function CollectionList<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>({
	collection,
	columns,
	baseFindOptions,
	realtime = false,
	rowActions,
	headerActions,
	emptyState,
	onRowClick,
}: CollectionListProps<T, K>): React.ReactElement {
	const collectionData = useCollection<T, K>(collection, {
		baseFindOptions,
		realtime,
	});

	const [sorting, setSorting] = React.useState<SortingState>([]);

	const table = useReactTable({
		data: collectionData.items as any[],
		columns: columns as ColumnDef<any>[],
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		onSortingChange: setSorting,
		state: {
			sorting,
		},
	});

	return (
		<div className="space-y-4">
			{/* Header */}
			{headerActions && (
				<div className="flex items-center justify-between">
					<div className="text-sm text-muted-foreground">
						{collectionData.items.length} items
					</div>
					<div>{headerActions}</div>
				</div>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder ? null : (
											<div
												className={
													header.column.getCanSort()
														? "cursor-pointer select-none flex items-center gap-2"
														: ""
												}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
												{header.column.getIsSorted() && (
													<span>
														{header.column.getIsSorted() === "asc" ? "↑" : "↓"}
													</span>
												)}
											</div>
										)}
									</TableHead>
								))}
								{rowActions && <TableHead>Actions</TableHead>}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
									onClick={() => onRowClick?.(row.original)}
									className={onRowClick ? "cursor-pointer" : ""}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
									{rowActions && <TableCell>{rowActions(row.original)}</TableCell>}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length + (rowActions ? 1 : 0)}
									className="h-24 text-center"
								>
									{emptyState || "No results."}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
