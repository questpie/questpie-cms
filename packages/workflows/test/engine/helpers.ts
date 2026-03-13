/**
 * Test helpers — mock persistence layer for step context tests.
 */

import type {
	CachedStep,
	StepPersistence,
} from "../../src/server/engine/step-context.js";
import { StepExecutionContext } from "../../src/server/engine/step-context.js";

/** Records of created/updated steps for assertions. */
export interface MockPersistenceLog {
	created: Array<Parameters<StepPersistence["createStep"]>[0]>;
	updated: Array<{
		instanceId: string;
		name: string;
		update: Parameters<StepPersistence["updateStep"]>[2];
	}>;
}

/**
 * Creates a mock StepPersistence that records all operations.
 */
export function createMockPersistence(): {
	persistence: StepPersistence;
	log: MockPersistenceLog;
} {
	const log: MockPersistenceLog = { created: [], updated: [] };
	let stepIdCounter = 0;

	const persistence: StepPersistence = {
		async createStep(step) {
			log.created.push(step);
			return { id: `step-${++stepIdCounter}` };
		},
		async updateStep(instanceId, name, update) {
			log.updated.push({ instanceId, name, update });
		},
	};

	return { persistence, log };
}

/**
 * Creates a StepExecutionContext with a mock persistence layer.
 */
export function createTestStepContext(options?: {
	instanceId?: string;
	cachedSteps?: CachedStep[];
	cachedExecutionOrder?: string[];
	defaultRetry?: { maxAttempts?: number };
}): {
	ctx: StepExecutionContext;
	persistence: StepPersistence;
	log: MockPersistenceLog;
} {
	const { persistence, log } = createMockPersistence();
	const cachedMap = new Map<string, CachedStep>();
	const cachedOrder: string[] = [];

	if (options?.cachedSteps) {
		for (const step of options.cachedSteps) {
			cachedMap.set(step.name, step);
		}
	}
	if (options?.cachedExecutionOrder) {
		cachedOrder.push(...options.cachedExecutionOrder);
	}

	const ctx = new StepExecutionContext(
		options?.instanceId ?? "test-instance",
		cachedMap,
		cachedOrder,
		persistence,
		options?.defaultRetry,
	);

	return { ctx, persistence, log };
}
