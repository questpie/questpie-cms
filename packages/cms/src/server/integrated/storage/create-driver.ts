import type { CMSConfig } from "#questpie/cms/exports/server";
import { FSDriver } from "flydrive/drivers/fs";
import type { DriverContract } from "flydrive/types";

export const createDiskDriver = (
	config: CMSConfig<any, any, any, any, any>,
): DriverContract =>
	config.storage?.driver ??
	new FSDriver({
		location: new URL("./uploads", import.meta.url),
		visibility: "public",
		urlBuilder: {
			async generateURL(key, _filePath) {
				return `${config.app.url}/uploads/${key}`;
			},
			async generateSignedURL(key, _filePath, _optionss) {
				// For local filesystem, signed URLs are not typically supported.
				// Returning a regular URL as a fallback.
				// TODO: implement proper signing mechanism
				return Promise.resolve(`${config.app.url}/uploads/${key}`);
			},
		},
	});
