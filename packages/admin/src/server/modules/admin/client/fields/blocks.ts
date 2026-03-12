import { field } from "#questpie/admin/client/builder/field/field.js";
import { BlocksField } from "#questpie/admin/client/components/fields/blocks-field/blocks-field.js";
import { BlocksCell } from "#questpie/admin/client/views/collection/cells/complex-cells.js";

export default field("blocks", {
	component: BlocksField,
	cell: BlocksCell,
});
