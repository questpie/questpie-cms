import type { CollectionConfigWithServerConfig } from "@qcms/core/collection/define-collection.server";
import type { CollectionConfig } from "@qcms/core/types/collection";

export type QcmsConfig<
	TCollectionConfigs extends CollectionConfig[] = CollectionConfig[],
> = {
	collections: TCollectionConfigs;
};

export type QcmsServerConfig<
	TCollectionConfigs extends
		CollectionConfigWithServerConfig[] = CollectionConfigWithServerConfig[],
> = {
	collections: TCollectionConfigs;
};

export type CollectionNames<
	TQcmsConfig extends QcmsConfig<CollectionConfig[]>,
> = TQcmsConfig["collections"][number]["name"];
