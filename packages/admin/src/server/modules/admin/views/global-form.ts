/**
 * Global form view — the default form view for globals.
 */
import {
	type FormViewConfig,
	type ViewDefinition,
	view,
} from "#questpie/admin/server/index.js";

export default view<FormViewConfig>("global-form", {
	kind: "form",
}) as ViewDefinition<"global-form", "form", FormViewConfig>;
