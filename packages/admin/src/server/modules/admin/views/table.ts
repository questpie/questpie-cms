/**
 * Table view — the default list view for collections.
 */
import {
	type ListViewConfig,
	type ViewDefinition,
	view,
} from "#questpie/admin/server/index.js";

export default view<ListViewConfig>("collection-table", {
	kind: "list",
}) as ViewDefinition<"collection-table", "list", ListViewConfig>;
