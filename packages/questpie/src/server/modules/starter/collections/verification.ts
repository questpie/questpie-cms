import { collection } from "#questpie/server/collection/builder/collection-builder.js";

export default collection("verification")
	.options({ timestamps: true })
	.fields(({ f }) => ({
		identifier: f.text(255).required(),
		value: f.text(255).required(),
		expiresAt: f.datetime().required(),
	}))
	.title(({ f }) => f.identifier);
