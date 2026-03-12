import { field } from "#questpie/admin/client/builder/field/field.js";
import { TextField } from "#questpie/admin/client/components/fields/text-field.js";
import { TextCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("url", {
	component: TextField,
	cell: TextCell,
});
