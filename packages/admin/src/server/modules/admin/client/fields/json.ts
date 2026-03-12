import { field } from "#questpie/admin/client/builder/field/field.js";
import { JsonField } from "#questpie/admin/client/components/fields/json-field.js";
import { JsonCell } from "#questpie/admin/client/views/collection/cells/complex-cells.js";

export default field("json", {
	component: JsonField,
	cell: JsonCell,
});
