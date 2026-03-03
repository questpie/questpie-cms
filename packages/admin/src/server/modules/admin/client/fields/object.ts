import { field } from "#questpie/admin/client/builder/field/field.js";
import { ObjectField } from "#questpie/admin/client/components/fields/object-field.js";
import { ObjectCell } from "#questpie/admin/client/views/collection/cells/complex-cells.js";

export default field("object", {
	component: ObjectField,
	cell: ObjectCell,
});
