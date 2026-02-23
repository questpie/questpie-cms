/**
 * City Portal Auth Configuration
 */

import type { AuthConfig } from "questpie";

export default {
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
} satisfies AuthConfig;
