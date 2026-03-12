import { field } from "#questpie/admin/client/builder/field/field.js";
import { TextareaField } from "#questpie/admin/client/components/fields/textarea-field.js";
import { TextCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("textarea", {
	component: TextareaField,
	cell: TextCell,
});
