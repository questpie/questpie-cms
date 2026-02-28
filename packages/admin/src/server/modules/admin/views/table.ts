/**
 * Table view — the default list view for collections.
 */
import { type ListViewConfig, view } from "#questpie/admin/server/index.js";

export default view<ListViewConfig>("table", { kind: "list" });
