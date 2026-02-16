import type { Questpie } from "#questpie/server/config/cms.js";
import type { QuestpieConfig } from "#questpie/server/config/types.js";
import {
	type ResetSeedsOptions,
	type RunSeedsOptions,
	SeedRunner,
	type SeedStatus,
} from "#questpie/server/seed/index.js";

/**
 * Programmatic seeds API
 *
 * Provides access to seed operations for use in code, tests, CI, and startup.
 *
 * @example
 * ```ts
 * // Run all pending seeds
 * await cms.seeds.run()
 *
 * // Run only required seeds
 * await cms.seeds.run({ category: "required" })
 *
 * // Run specific seed
 * await cms.seeds.run({ only: ["adminUser"] })
 *
 * // Force re-run
 * await cms.seeds.run({ force: true })
 *
 * // Validate (dry-run)
 * await cms.seeds.run({ validate: true })
 *
 * // Get status
 * const status = await cms.seeds.status()
 *
 * // Undo dev seeds
 * await cms.seeds.undo({ category: "dev" })
 *
 * // Reset tracking
 * await cms.seeds.reset()
 * await cms.seeds.reset({ only: ["pages"] })
 * ```
 */
export class QuestpieSeedsAPI<
	TConfig extends QuestpieConfig = QuestpieConfig,
> {
	private readonly runner: SeedRunner;

	constructor(private readonly cms: Questpie<TConfig>) {
		this.runner = new SeedRunner(cms);
	}

	/** Run pending seeds */
	async run(options: RunSeedsOptions = {}): Promise<void> {
		const seeds = this.cms.config.seeds?.seeds || [];
		await this.runner.run(seeds, options);
	}

	/** Undo executed seeds */
	async undo(
		options: {
			category?: RunSeedsOptions["category"];
			only?: string[];
		} = {},
	): Promise<void> {
		const seeds = this.cms.config.seeds?.seeds || [];
		await this.runner.undo(seeds, options);
	}

	/** Reset seed tracking table */
	async reset(options: ResetSeedsOptions = {}): Promise<void> {
		await this.runner.reset(options);
	}

	/** Get seed status */
	async status(): Promise<SeedStatus> {
		const seeds = this.cms.config.seeds?.seeds || [];
		return this.runner.status(seeds);
	}
}
