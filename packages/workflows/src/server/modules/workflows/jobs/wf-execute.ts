/**
 * wf-execute Job
 *
 * Executes (or replays) a workflow instance. This is the core job that:
 * 1. Loads the workflow definition from app state
 * 2. Bridges collection CRUD to the engine's EngineContext
 * 3. Calls executeWorkflowHandler()
 *
 * Publish options:
 * - singletonKey: instanceId (prevents duplicate executions)
 * - retryLimit: 0 (the engine has its own retry semantics)
 */

import { job } from "questpie";
import { z } from "zod";
import type { CollectionCrud } from "../../../client.js";
import type { EngineContext } from "../../../engine/engine.js";
import { executeWorkflowHandler } from "../../../engine/engine.js";
import type {
	CachedStep,
	StepPersistence,
} from "../../../engine/step-context.js";

const wfExecuteSchema = z.object({
	instanceId: z.string(),
	workflowName: z.string(),
});

export const wfExecuteJob = job({
	name: "questpie-wf-execute",
	schema: wfExecuteSchema,
	options: {
		retryLimit: 0,
	},
	handler: async (ctx) => {
		const { payload } = ctx;
		const app = (ctx as any).app as any;
		const collections = (ctx as any).collections as
			| Record<string, CollectionCrud>
			| undefined;
		const logger = (ctx as any).logger as any;

		// Look up workflow definition from app state
		const workflows = app?.state?.workflows as Record<string, any> | undefined;
		const definition = workflows?.[payload.workflowName];
		if (!definition) {
			throw new Error(
				`Workflow definition not found: "${payload.workflowName}"`,
			);
		}

		const instancesCrud = collections?.wf_instance;
		const stepsCrud = collections?.wf_step;
		const logsCrud = collections?.wf_log;

		if (!instancesCrud || !stepsCrud || !logsCrud) {
			throw new Error(
				"Workflow system collections not found. Is workflowsModule registered?",
			);
		}

		// Bridge collection CRUD to EngineContext
		const persistence: StepPersistence = {
			async createStep(step) {
				const created = await stepsCrud.create(
					{
						instanceId: step.instanceId,
						name: step.name,
						type: step.type,
						status: step.status,
						result: step.result ?? null,
						error: step.error ?? null,
						attempt: 1,
						maxAttempts: step.maxAttempts,
						scheduledAt: step.scheduledAt ?? null,
						eventName: step.eventName ?? null,
						matchCriteria: step.matchCriteria ?? null,
						childInstanceId: step.childInstanceId ?? null,
						hasCompensation: step.hasCompensation,
						startedAt: new Date(),
						completedAt: step.status === "completed" ? new Date() : null,
					},
					{ accessMode: "system" },
				);
				return { id: created.id };
			},
			async updateStep(instanceId, name, update) {
				// Find the step first, then update by ID
				const existing = await stepsCrud.findOne(
					{ where: { instanceId, name } },
					{ accessMode: "system" },
				);
				if (!existing) {
					throw new Error(
						`Step not found: instance=${instanceId}, name=${name}`,
					);
				}
				await stepsCrud.updateById(
					{
						id: existing.id,
						data: {
							...update,
							completedAt:
								update.status === "completed" ? new Date() : undefined,
						},
					},
					{ accessMode: "system" },
				);
			},
		};

		const engineCtx: EngineContext = {
			async loadInstance(instanceId) {
				const inst = await instancesCrud.findOne(
					{ where: { id: instanceId } },
					{ accessMode: "system" },
				);
				if (!inst) return null;
				return {
					id: inst.id,
					name: inst.name,
					status: inst.status,
					input: inst.input,
					attempt: inst.attempt,
				};
			},
			async loadSteps(instanceId) {
				const result = await stepsCrud.find(
					{
						where: { instanceId },
						sort: { createdAt: "asc" },
						limit: 10_000,
					},
					{ accessMode: "system" },
				);
				return result.docs.map(
					(s: any): CachedStep => ({
						name: s.name,
						type: s.type,
						status: s.status,
						result: s.result,
						error: s.error,
						attempt: s.attempt,
						scheduledAt: s.scheduledAt ? new Date(s.scheduledAt) : null,
						hasCompensation: s.hasCompensation,
					}),
				);
			},
			persistence,
			async updateInstance(instanceId, update) {
				await instancesCrud.updateById(
					{ id: instanceId, data: update },
					{ accessMode: "system" },
				);
			},
			async flushLogs(instanceId, entries) {
				if (entries.length === 0) return;
				// Batch create log entries
				for (const entry of entries) {
					await logsCrud.create(
						{
							instanceId,
							level: entry.level,
							message: entry.message,
							data: entry.data,
							timestamp: entry.timestamp,
						},
						{ accessMode: "system" },
					);
				}
			},
			externalLogger: logger,
			appContext: ctx as any,
		};

		await executeWorkflowHandler(definition, payload.instanceId, engineCtx);
	},
});

export default wfExecuteJob;
