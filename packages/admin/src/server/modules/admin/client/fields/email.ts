import { field } from "#questpie/admin/client/builder/field/field.js";
import { EmailField } from "#questpie/admin/client/components/fields/email-field.js";
import { EmailCell } from "#questpie/admin/client/views/collection/cells/primitive-cells.js";

export default field("email", {
	component: EmailField,
	cell: EmailCell,
});
