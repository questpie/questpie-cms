import type { JobDefinition } from "./types";
import type { RequestContext } from "#questpie/cms/server/config/context";
import type { z } from "zod";

/**
 * Workflow step - a job that can be chained with other jobs
 */
export interface WorkflowStep<TInput = any, TOutput = any> {
	name: string;
	execute: (input: TInput, context: RequestContext) => Promise<TOutput>;
}

/**
 * Workflow builder for creating multi-step job pipelines
 *
 * @example
 * ```ts
 * const imageProcessingWorkflow = workflow('process-uploaded-image')
 *   .step('validate', async (input: { url: string }, ctx) => {
 *     // Validate image
 *     const valid = await validateImage(input.url);
 *     return { url: input.url, valid };
 *   })
 *   .step('resize', async (input, ctx) => {
 *     // Resize image
 *     const resized = await resizeImage(input.url);
 *     return { ...input, resized };
 *   })
 *   .step('optimize', async (input, ctx) => {
 *     // Optimize image
 *     const optimized = await optimizeImage(input.resized);
 *     return { ...input, optimized };
 *   })
 *   .build();
 * ```
 */
export class WorkflowBuilder<
	TInput,
	TCurrentOutput = TInput,
	TName extends string = string,
> {
	private steps: WorkflowStep<any, any>[] = [];

	constructor(private workflowName: TName) {}

	/**
	 * Add a step to the workflow
	 */
	step<TStepOutput>(
		name: string,
		execute: (
			input: TCurrentOutput,
			context: RequestContext,
		) => Promise<TStepOutput>,
	): WorkflowBuilder<TInput, TStepOutput, TName> {
		this.steps.push({ name, execute });
		return this as any;
	}

	/**
	 * Build the workflow into a job definition
	 */
	build(
		schema: z.ZodSchema<TInput>,
	): JobDefinition<TInput, TCurrentOutput, TName> {
		return {
			name: this.workflowName,
			schema,
			handler: async (payload: TInput, context: RequestContext) => {
				let currentOutput: any = payload;

				for (const step of this.steps) {
					try {
						console.log(
							`[Workflow: ${this.workflowName}] Executing step: ${step.name}`,
						);
						currentOutput = await step.execute(currentOutput, context);
					} catch (error) {
						console.error(
							`[Workflow: ${this.workflowName}] Step "${step.name}" failed:`,
							error,
						);
						throw new Error(
							`Workflow step "${step.name}" failed: ${error instanceof Error ? error.message : "Unknown error"}`,
						);
					}
				}

				return currentOutput as TCurrentOutput;
			},
		};
	}
}

/**
 * Create a workflow builder
 *
 * @example
 * ```ts
 * const processOrderWorkflow = workflow('process-order')
 *   .step('validate', async (order, ctx) => {
 *     // Validate order
 *     return { ...order, validated: true };
 *   })
 *   .step('charge', async (order, ctx) => {
 *     // Charge payment
 *     const payment = await chargeCustomer(order);
 *     return { ...order, payment };
 *   })
 *   .step('fulfill', async (order, ctx) => {
 *     // Send to fulfillment
 *     await sendToWarehouse(order);
 *     return { ...order, fulfilled: true };
 *   })
 *   .step('notify', async (order, ctx) => {
 *     // Send confirmation email
 *     await ctx.queue.sendEmail.publish({
 *       to: order.customerEmail,
 *       subject: 'Order confirmed',
 *       body: `Your order #${order.id} is confirmed!`
 *     });
 *     return order;
 *   })
 *   .build(orderSchema);
 * ```
 */
export function workflow<TInput, TName extends string>(
	name: TName,
): WorkflowBuilder<TInput, TInput, TName> {
	return new WorkflowBuilder<TInput, TInput, TName>(name);
}
