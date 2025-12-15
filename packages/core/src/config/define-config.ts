import type { CollectionConfig } from "@qcms/core/types/collection";
import type { QcmsConfig } from "@qcms/core/types/config";

export function defineQcmsConfig<TCollectionConfigs extends CollectionConfig[]>(
	config: QcmsConfig<TCollectionConfigs>,
): QcmsConfig<TCollectionConfigs> {
	return config;
}
