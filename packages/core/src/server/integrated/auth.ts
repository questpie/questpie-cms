import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { admin, apiKey, bearer } from "better-auth/plugins";

export class AuthService {
	public instance: ReturnType<typeof betterAuth>;

	constructor(config: BetterAuthOptions) {
		const plugins = config.plugins || [];

		// Add default plugins if not already present (checking by some logic might be hard, so we just prepend/append)
		// Better Auth plugins usually dedupe or last wins?
		// We'll enforce our "batteries" by adding them.

		const finalConfig: BetterAuthOptions = {
			...config,
			plugins: [admin(), apiKey(), bearer(), ...plugins],
			emailAndPassword: {
				enabled: true,
				...config.emailAndPassword,
			},
		};

		this.instance = betterAuth(finalConfig);
	}

	get api() {
		return this.instance.api;
	}

	get handler() {
		return this.instance.handler;
	}
}
