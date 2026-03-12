import { field } from "#questpie/admin/client/builder/field/field.js";
import { TimeField } from "#questpie/admin/client/components/fields/time-field.js";
import { TimeCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("time", {
	component: TimeField,
	cell: TimeCell,
});
