import { field } from "#questpie/admin/client/builder/field/field.js";
import { BooleanField } from "#questpie/admin/client/components/fields/boolean-field.js";
import { BooleanCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("boolean", {
	component: BooleanField,
	cell: BooleanCell,
});
