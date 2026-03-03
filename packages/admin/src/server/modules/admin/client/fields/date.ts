import { field } from "#questpie/admin/client/builder/field/field.js";
import { DateField } from "#questpie/admin/client/components/fields/date-field.js";
import { DateCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("date", {
	component: DateField,
	cell: DateCell,
});
