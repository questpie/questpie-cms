import { field } from "#questpie/admin/client/builder/field/field.js";
import { AssetPreviewField } from "#questpie/admin/client/components/fields/asset-preview-field.js";
import { AssetThumbnail } from "#questpie/admin/client/views/collection/cells/shared/asset-thumbnail.js";

export default field("assetPreview", {
	component: AssetPreviewField,
	cell: ({ row }: { value: unknown; row?: any }) => {
		return <AssetThumbnail asset={row?.original} size="sm" />;
	},
});
