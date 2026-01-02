import { QCMSBuilder } from "#questpie/cms/exports/server.js";
import { assetsCollection } from "#questpie/cms/server/collection/defaults/assets.js";
import {
	accountsCollection,
	sessionsCollection,
	usersCollection,
	verificationsCollection,
} from "#questpie/cms/server/collection/defaults/auth.js";
import { coreMigrations } from "#questpie/cms/server/modules/core/migrations/index.js";

export const coreModule = QCMSBuilder.empty("cms-core")
	.collections({
		assets: assetsCollection,
		user: usersCollection,
		session: sessionsCollection,
		account: accountsCollection,
		verification: verificationsCollection,
	})
	.migrations(coreMigrations);
