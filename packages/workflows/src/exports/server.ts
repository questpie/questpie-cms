// @questpie/workflows/server — server-only API
// Re-export everything from public API

// Client — workflow client factory + types
export type {
	CollectionCrud,
	QueuePublish,
	TriggerResult,
	WorkflowClient,
	WorkflowClientDeps,
} from "../server/client.js";
export { createWorkflowClient } from "../server/client.js";

// Engine — duration + errors
export { parseDuration, resolveDate } from "../server/engine/duration.js";
export type {
	EngineContext,
	ExecutionResult,
	InstanceData,
} from "../server/engine/engine.js";
// Engine — execution
export { executeWorkflowHandler } from "../server/engine/engine.js";
export type { SuspendReason } from "../server/engine/errors.js";
export {
	NonDeterministicError,
	StepFailedError,
	StepRetryError,
	StepSuspendError,
	WorkflowError,
	WorkflowTimeoutError,
} from "../server/engine/errors.js";
export type {
	ExternalLogger,
	FlushCallback,
	LogEntry,
	LogLevel,
} from "../server/engine/logger.js";
// Engine — logger
export { WorkflowLoggerImpl } from "../server/engine/logger.js";
export type {
	CachedStep,
	StepPersistence,
	StepStatus,
	StepType,
} from "../server/engine/step-context.js";
// Engine — step context
export { StepExecutionContext } from "../server/engine/step-context.js";
// Module (system collections + jobs + service)
export { workflowsModule } from "../server/modules/workflows/index.js";
// Codegen plugin
export { workflowsPlugin } from "../server/plugin.js";
export * from "./index.js";
