/**
 * Assets Collection Admin Config
 *
 * Default admin UI configuration for the built-in assets collection.
 * Provides media library functionality for managing uploaded files.
 */

import { Images, UploadSimple } from "@phosphor-icons/react";
import { lazy } from "react";
import { AssetThumbnail } from "../../../views/collection/cells";
import { coreAdminModule } from "../core";

// Lazy load the bulk upload dialog
const BulkUploadDialog = lazy(() =>
	import("../../../components/media/bulk-upload-dialog").then((m) => ({
		default: m.BulkUploadDialog,
	})),
);

/**
 * Asset preview cell - displays thumbnail for images, icon for other types
 * Row click handles navigation to detail page
 */
function AssetPreviewCell({
	row,
}: {
	value: unknown;
	row?: { original: Record<string, unknown> };
}) {
	return <AssetThumbnail asset={row?.original} size="md" />;
}

/**
 * Assets collection admin configuration
 *
 * Provides admin UI for managing uploaded files with:
 * - File preview (images show thumbnails)
 * - Metadata editing (alt text, caption)
 * - Visibility control (public/private)
 * - Grid/table view toggle
 *
 * @example
 * ```ts
 * import { adminModule } from "@questpie/admin/client";
 *
 * const admin = qa().use(adminModule);
 * // Assets collection is automatically configured
 * ```
 */
export const assetsCollectionAdmin = coreAdminModule
	.collection("assets")
	.meta({
		label: { key: "defaults.assets.label" },
		icon: Images,
		description: { key: "defaults.assets.description" },
	})
	.fields(({ r }) => ({
		preview: r.assetPreview({
			label: { key: "defaults.assets.fields.preview.label" },
		}),
		filename: r.text({
			label: { key: "defaults.assets.fields.filename.label" },
			description: { key: "defaults.assets.fields.filename.description" },
		}),
		mimeType: r.text({
			label: { key: "defaults.assets.fields.mimeType.label" },
			description: { key: "defaults.assets.fields.mimeType.description" },
		}),
		size: r.number({
			label: { key: "defaults.assets.fields.size.label" },
			description: { key: "defaults.assets.fields.size.description" },
		}),
		alt: r.text({
			label: { key: "defaults.assets.fields.alt.label" },
			placeholder: { key: "defaults.assets.fields.alt.placeholder" },
			description: { key: "defaults.assets.fields.alt.description" },
		}),
		caption: r.textarea({
			label: { key: "defaults.assets.fields.caption.label" },
			placeholder: { key: "defaults.assets.fields.caption.placeholder" },
			rows: 2,
		}),
		visibility: r.select({
			label: { key: "defaults.assets.fields.visibility.label" },
			options: [
				{
					value: "public",
					label: { key: "defaults.assets.fields.visibility.options.public" },
				},
				{
					value: "private",
					label: { key: "defaults.assets.fields.visibility.options.private" },
				},
			],
			description: { key: "defaults.assets.fields.visibility.description" },
		}),
	}))
	.list(({ v, f, a }) =>
		v.table({
			columns: [
				{
					field: "preview" as any,
					header: "",
					width: 60,
					sortable: false,
					cell: AssetPreviewCell,
				},
				f.filename,
				f.mimeType,
				f.size,
				f.visibility,
			],
			searchFields: [f.filename, f.alt, f.caption],
			searchable: true,
			defaultSort: {
				field: "createdAt" as any,
				direction: "desc",
			},
			actions: {
				header: {
					primary: [
						a.action({
							id: "upload",
							label: { key: "defaults.assets.actions.upload.label" },
							icon: UploadSimple,
							variant: "default",
							handler: {
								type: "dialog",
								component: BulkUploadDialog,
							},
						}),
					],
				},
			},
		}),
	)
	.form(({ v, f }) =>
		v.form({
			sidebar: {
				position: "right",
				fields: [f.visibility],
			},
			fields: [
				{
					type: "section",
					fields: [f.preview],
				},
				{
					type: "section",
					label: { key: "defaults.assets.sections.fileInfo" },
					layout: "grid",
					columns: 2,
					fields: [f.filename, f.mimeType, f.size],
				},
				{
					type: "section",
					label: { key: "defaults.assets.sections.metadata" },
					description: { key: "defaults.assets.sections.metadata.description" },
					fields: [f.alt, f.caption],
				},
			],
		}),
	);
