/**
 * wf-maintenance Job
 *
 * Periodic cron job that:
 * 1. Resumes sleeping steps whose scheduledAt has passed
 * 2. Times out instances that have exceeded their timeout
 *
 * Runs every 5 minutes by default.
 */

import { job } from "questpie";
import { z } from "zod";
import type { CollectionCrud } from "../../../client.js";

export const wfMaintenanceJob = job({
	name: "questpie-wf-maintenance",
	schema: z.object({}),
	options: {
		cron: "*/5 * * * *",
		retryLimit: 1,
	},
	handler: async (ctx) => {
		const collections = (ctx as any).collections as
			| Record<string, CollectionCrud>
			| undefined;
		const queue = (ctx as any).queue as any;
		const logger = (ctx as any).logger as any;

		const instancesCrud = collections?.wf_instance;
		const stepsCrud = collections?.wf_step;

		if (!instancesCrud || !stepsCrud) {
			throw new Error(
				"Workflow system collections not found. Is workflowsModule registered?",
			);
		}

		const now = new Date();

		// ── 1. Resume sleeping steps whose scheduledAt has passed ────
		const sleepingSteps = await stepsCrud.find(
			{
				where: {
					status: "sleeping",
					scheduledAt: { lte: now },
				},
				limit: 100,
			},
			{ accessMode: "system" },
		);

		let resumedCount = 0;
		for (const step of sleepingSteps.docs) {
			try {
				await queue["questpie-wf-resume"].publish({
					instanceId: step.instanceId,
					stepName: step.name,
				});
				resumedCount++;
			} catch (err) {
				logger?.warn?.(
					`Failed to publish resume for step ${step.name} of instance ${step.instanceId}`,
					{ error: err instanceof Error ? err.message : String(err) },
				);
			}
		}

		// ── 2. Time out instances that exceeded their timeout ────────
		const timedOutInstances = await instancesCrud.find(
			{
				where: {
					status: { in: ["running", "suspended", "pending"] },
					timeoutAt: { lte: now },
				},
				limit: 100,
			},
			{ accessMode: "system" },
		);

		let timedOutCount = 0;
		for (const instance of timedOutInstances.docs) {
			try {
				await instancesCrud.updateById(
					{
						id: instance.id,
						data: {
							status: "timed_out",
							error: {
								message: `Workflow timed out at ${now.toISOString()}`,
								code: "WORKFLOW_TIMEOUT",
							},
							completedAt: now,
						},
					},
					{ accessMode: "system" },
				);
				timedOutCount++;
			} catch (err) {
				logger?.warn?.(`Failed to time out instance ${instance.id}`, {
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}

		if (resumedCount > 0 || timedOutCount > 0) {
			logger?.info?.(
				`Workflow maintenance: resumed=${resumedCount}, timedOut=${timedOutCount}`,
			);
		}
	},
});

export default wfMaintenanceJob;
