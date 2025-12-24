import type { QCMS, CMSContextExtensions } from "#questpie/core/exports/server";
import type { User, Session } from "better-auth/types";
import type { drizzle } from "drizzle-orm/bun-sql";
import type { LoggerService } from "../integrated/logger";
export interface BaseContext {
	db: ReturnType<typeof drizzle> | any;
	// TODO: this should be generic too
	logger: LoggerService;
	user?: User;
	session?: Session;
	locale: string;
	defaultLocale: string;
	qcms: QCMS<any, any, any>;
}

export type CmsContext = BaseContext & CMSContextExtensions;
