/**
 * Form view — the default edit view for collections.
 */
import {
	type FormViewConfig,
	type ViewDefinition,
	view,
} from "#questpie/admin/server/index.js";

export default view<FormViewConfig>("collection-form", {
	kind: "form",
}) as ViewDefinition<"collection-form", "form", FormViewConfig>;
