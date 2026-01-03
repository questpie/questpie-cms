import { getCMSFromContext } from "#questpie/cms/server/config/context";
import { defineFunction } from "#questpie/cms/server/functions";
import { z } from "zod";

export const triggerJobFunction = defineFunction({
	schema: z.object({
		jobName: z.string(),
		payload: z.any(),
	}),
	outputSchema: z.object({
		runId: z.string(),
		status: z.literal("queued"),
	}),
	handler: async (input) => {
		const cms = getCMSFromContext();
		const runId = await cms.jobs.trigger(input.jobName, input.payload);
		return { runId, status: "queued" };
	},
});
