import type { Seed } from "questpie"

import { siteSettingsSeed } from "./site-settings.seed.js"

import { demoDataSeed } from "./demo-data.seed.js"
export const seeds: Seed[] = [
	siteSettingsSeed,
	demoDataSeed,
]
