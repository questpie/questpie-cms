import { defineQcmsConfig } from "@qcms/core/config/define-config";
import { BookingCollectionExample } from "@qcms/core/examples/booking";

const _config = defineQcmsConfig({
	collections: [BookingCollectionExample],
});
