import { QCMSBuilder } from "#questpie/cms/exports/server.js";
import { assetsCollection } from "#questpie/cms/server/collection/defaults/assets.js";
import {
	accountsCollection,
	apiKeysCollection,
	sessionsCollection,
	usersCollection,
	verificationsCollection,
} from "#questpie/cms/server/collection/defaults/auth.js";
import { coreAuthOptions } from "#questpie/cms/server/integrated/auth";
import { coreMigrations } from "#questpie/cms/server/modules/core/migrations/index.js";
export const createCoreModule = () =>
	QCMSBuilder.empty("cms-core")
		.collections({
			assets: assetsCollection,
			user: usersCollection,
			session: sessionsCollection,
			account: accountsCollection,
			verification: verificationsCollection,
			apikey: apiKeysCollection,
		})
		.auth(coreAuthOptions)
		.migrations(coreMigrations);
