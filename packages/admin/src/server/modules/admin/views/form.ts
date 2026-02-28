/**
 * Form view — the default edit view for collections.
 */
import { type FormViewConfig, view } from "#questpie/admin/server/index.js";

export default view<FormViewConfig>("form", { kind: "edit" });
