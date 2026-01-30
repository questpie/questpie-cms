import { QuestpieBuilder } from "#questpie/server/config/builder.js";
import { jobRunsCollection } from "./collections/job-runs.collection.js";

export const jobsModule = QuestpieBuilder.empty("jobs-control-plane").collections(
  {
    jobRun: jobRunsCollection,
  },
);
