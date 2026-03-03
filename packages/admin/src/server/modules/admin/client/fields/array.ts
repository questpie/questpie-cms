import { field } from "#questpie/admin/client/builder/field/field.js";
import { ArrayField } from "#questpie/admin/client/components/fields/array-field.js";
import { ArrayCell } from "#questpie/admin/client/views/collection/cells/complex-cells.js";

export default field("array", {
	component: ArrayField,
	cell: ArrayCell,
});
