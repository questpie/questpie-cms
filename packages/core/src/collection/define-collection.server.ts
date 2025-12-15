import type {
	CollectionConfig,
	ServerCollectionConfig,
} from "@qcms/core/types/collection";

export type CollectionConfigWithServerConfig<
	TCollectionConfig extends CollectionConfig = CollectionConfig,
> = TCollectionConfig & {
	$server: ServerCollectionConfig<TCollectionConfig>;
};

export function defineServerCollection<
	TCollectionConfig extends CollectionConfig,
>(
	collection: TCollectionConfig,
	serverConfig: ServerCollectionConfig<TCollectionConfig>,
): CollectionConfigWithServerConfig<TCollectionConfig> {
	return {
		...collection,
		$server: {
			...serverConfig,
		},
	};
}
