import type { QCMS } from "#questpie/cms/server/config/cms";
import type {
	JobDefinition,
	PublishOptions,
} from "#questpie/cms/server/integrated/queue/types";
import { eq } from "drizzle-orm";

export type JobsService = {
	trigger: (
		name: string,
		payload: unknown,
		options?: PublishOptions,
	) => Promise<string>;
};

type JobRunsContext = {
	db: any;
	table: any;
};

const resolveJobRunsContext = (cms: QCMS<any>): JobRunsContext | null => {
	try {
		const collection = cms.getCollectionConfig("job_run");
		return {
			db: cms.db,
			table: collection.table,
		};
	} catch {
		return null;
	}
};

const findJobDefinition = (
	cms: QCMS<any>,
	name: string,
): JobDefinition<any, any> | null => {
	const jobs = cms.config.queue?.jobs as
		| Record<string, JobDefinition<any, any>>
		| undefined;
	if (!jobs) return null;
	return Object.values(jobs).find((job) => job.name === name) ?? null;
};

const buildPublishOptions = (
	jobDef: JobDefinition<any, any>,
	options?: PublishOptions,
): PublishOptions => {
	const { cron, ...jobDefaults } = jobDef.options ?? {};
	return {
		...(jobDefaults as PublishOptions),
		...(options ?? {}),
	};
};

const safeUpdateJobRun = async (
	context: JobRunsContext,
	runId: string,
	values: Record<string, any>,
) => {
	try {
		await context.db
			.update(context.table)
			.set(values)
			.where(eq(context.table.id, runId));
	} catch (error) {
		console.warn("[QUESTPIE Jobs] Failed to update job_run", error);
	}
};

export const createJobsService = (cms: QCMS<any>): JobsService => {
	return {
		trigger: async (name, payload, options) => {
			if (!cms.config.queue?.jobs) {
				throw new Error(
					"QUESTPIE: Queue is not configured. Add 'queue.jobs' and 'queue.adapter' to your QCMS config.",
				);
			}

			const jobDef = findJobDefinition(cms, name);
			if (!jobDef) {
				throw new Error(`QUESTPIE: Job "${name}" is not registered.`);
			}

			const jobRuns = resolveJobRunsContext(cms);
			if (!jobRuns) {
				throw new Error(
					"QUESTPIE: Jobs control plane is not configured. Add the jobs module (jobRun collection) or call cms.queue.publish directly.",
				);
			}

			const validated = jobDef.schema.parse(payload);
			const [run] = await jobRuns.db
				.insert(jobRuns.table)
				.values({
					jobName: jobDef.name,
					status: "queued",
					queuedAt: new Date(),
					payload: validated,
				})
				.returning({ id: jobRuns.table.id });
			if (!run?.id) {
				throw new Error("QUESTPIE: Failed to create job_run record.");
			}

			let queueJobId: string | null = null;
			try {
				await cms.queue._start();
				queueJobId = await cms.queue._adapter.publish(
					jobDef.name,
					validated,
					buildPublishOptions(jobDef, options),
				);
			} catch (error) {
				await safeUpdateJobRun(jobRuns, run.id, {
					status: "failed",
					finishedAt: new Date(),
					error: error instanceof Error ? error.message : String(error),
				});
				throw error;
			}

			if (queueJobId) {
				await safeUpdateJobRun(jobRuns, run.id, { queueJobId });
			}

			return run.id;
		},
	};
};
