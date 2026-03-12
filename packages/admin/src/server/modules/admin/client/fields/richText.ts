import { field } from "#questpie/admin/client/builder/field/field.js";
import { RichTextField } from "#questpie/admin/client/components/fields/rich-text-field.js";
import { RichTextCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("richText", {
	component: RichTextField,
	cell: RichTextCell,
});
