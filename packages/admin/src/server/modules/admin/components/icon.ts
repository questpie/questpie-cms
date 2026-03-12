/**
 * Icon component — renders an icon from the Iconify registry.
 * Accepts a string shorthand (`"ph:users"`) or object form (`{ name: "ph:users" }`).
 */
import { component } from "#questpie/admin/server/registry-helpers.js";

export default component<string | { name: string }>("icon");
