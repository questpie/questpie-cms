import { adminModule, qa } from "@questpie/admin/client";
import type { AppCMS } from "@/questpie/server/app.js";

export const builder = qa<AppCMS>().use(adminModule);
