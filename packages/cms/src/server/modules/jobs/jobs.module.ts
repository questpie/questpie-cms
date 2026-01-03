import { QCMSBuilder } from "#questpie/cms/exports/server.js";
import { jobRunsCollection } from "./collections/job-runs.collection.js";
import { triggerJobFunction } from "./functions/trigger-job.function.js";

export const jobsModule = QCMSBuilder.empty("jobs-control-plane")
	.collections({
		jobRun: jobRunsCollection,
	})
	.functions({
		triggerJob: triggerJobFunction,
	});
