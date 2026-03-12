/**
 * Form view — the default edit view for collections.
 */
import type {
	FormViewConfig,
	ViewDefinition,
} from "#questpie/admin/server/augmentation.js";
import { view } from "#questpie/admin/server/registry-helpers.js";

export default view<FormViewConfig>("collection-form", {
	kind: "form",
}) as ViewDefinition<"collection-form", "form", FormViewConfig>;
