import { field } from "#questpie/admin/client/builder/field/field.js";
import { RelationField } from "#questpie/admin/client/components/fields/relation-field.js";
import { RelationCell } from "#questpie/admin/client/views/collection/cells/relation-cells.js";

export default field("relation", {
	component: RelationField,
	cell: RelationCell,
});
