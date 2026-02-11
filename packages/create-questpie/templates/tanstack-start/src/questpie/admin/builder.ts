import { adminModule, qa } from "@questpie/admin/client";
import type { AppCMS } from "@/questpie/server/app";

export const builder = qa<AppCMS>().use(adminModule);
