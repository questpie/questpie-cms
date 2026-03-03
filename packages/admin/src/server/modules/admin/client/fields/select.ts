import { field } from "#questpie/admin/client/builder/field/field.js";
import { SelectField } from "#questpie/admin/client/components/fields/select-field.js";
import { SelectCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("select", {
	component: SelectField,
	cell: SelectCell,
});
