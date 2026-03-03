import { field } from "#questpie/admin/client/builder/field/field.js";
import { DatetimeField } from "#questpie/admin/client/components/fields/datetime-field.js";
import { DateTimeCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("datetime", {
	component: DatetimeField,
	cell: DateTimeCell,
});
