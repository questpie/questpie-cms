/**
 * Table view — the default list view for collections.
 */
import type {
	ListViewConfig,
	ViewDefinition,
} from "#questpie/admin/server/augmentation.js";
import { view } from "#questpie/admin/server/registry-helpers.js";

export default view<ListViewConfig>("collection-table", {
	kind: "list",
}) as ViewDefinition<"collection-table", "list", ListViewConfig>;
