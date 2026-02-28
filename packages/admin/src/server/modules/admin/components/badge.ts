/**
 * Badge component — renders a status badge with label and variant.
 */
import { component } from "#questpie/admin/server/index.js";

export default component<{ text: string; color?: string }>("badge");
