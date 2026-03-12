import { collection } from "#questpie/server/collection/builder/collection-builder.js";

export default collection("user")
	.options({ timestamps: true })
	.fields(({ f }) => ({
		name: f.text(255).required(),
		email: f.email(255).required(),
		emailVerified: f.boolean().required(),
		image: f.url(500),
		role: f.text(50),
		banned: f.boolean().default(false),
		banReason: f.text(255),
		banExpires: f.datetime(),
	}))
	.title(({ f }) => f.name);
