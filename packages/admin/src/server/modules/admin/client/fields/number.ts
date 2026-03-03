import { field } from "#questpie/admin/client/builder/field/field.js";
import { NumberField } from "#questpie/admin/client/components/fields/number-field.js";
import { NumberCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("number", {
	component: NumberField,
	cell: NumberCell,
});
