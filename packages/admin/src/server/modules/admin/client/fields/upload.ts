import { field } from "#questpie/admin/client/builder/field/field.js";
import { UploadField } from "#questpie/admin/client/components/fields/upload-field.js";
import { UploadCell } from "#questpie/admin/client/views/collection/cells/upload-cells.js";

export default field("upload", {
	component: UploadField,
	cell: UploadCell,
});
