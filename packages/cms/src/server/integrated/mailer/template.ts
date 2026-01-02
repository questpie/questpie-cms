import type { ComponentType } from "react";
import type { z } from "zod";

/**
 * Email template definition with typesafe context
 */
export interface EmailTemplateDefinition<
	TContext = any,
	TName extends string = string,
> {
	/**
	 * Unique name for this email template
	 */
	name: TName;

	/**
	 * Zod schema for context validation
	 */
	schema: z.ZodSchema<TContext>;

	/**
	 * React component renderer
	 */
	render: ComponentType<TContext>;

	/**
	 * Optional default subject (can use context values)
	 */
	subject?: (context: TContext) => string;
}

/**
 * Infer context type from email template definition
 */
export type InferEmailTemplateContext<T> =
	T extends EmailTemplateDefinition<infer C, any> ? C : never;

/**
 * Extract template names from email template definitions array
 */
export type EmailTemplateNames<
	TTemplates extends EmailTemplateDefinition<any, any>[],
> = TTemplates[number]["name"];

/**
 * Map email template definitions array to object by name
 */
export type EmailTemplateMap<
	TTemplates extends EmailTemplateDefinition<any, any>[],
> = {
	[K in TTemplates[number] as K["name"]]: K;
};

/**
 * Get specific email template by name from templates array
 */
export type GetEmailTemplate<
	TTemplates extends EmailTemplateDefinition<any, any>[],
	Name extends EmailTemplateNames<TTemplates>,
> = EmailTemplateMap<TTemplates>[Name];

/**
 * Define a typesafe email template
 *
 * @example
 * ```ts
 * import { defineEmailTemplate } from '@questpie/cms/server';
 * import { z } from 'zod';
 * import * as React from 'react';
 *
 * const WelcomeEmail = defineEmailTemplate({
 *   name: 'welcome',
 *   schema: z.object({
 *     name: z.string(),
 *     activationLink: z.string().url(),
 *   }),
 *   render: ({ name, activationLink }) => (
 *     <div>
 *       <h1>Welcome, {name}!</h1>
 *       <a href={activationLink}>Activate your account</a>
 *     </div>
 *   ),
 *   subject: (ctx) => `Welcome to the platform, ${ctx.name}!`,
 * });
 * ```
 */
export function defineEmailTemplate<TName extends string, TContext>(
	definition: EmailTemplateDefinition<TContext, TName>,
): EmailTemplateDefinition<TContext, TName> {
	return definition;
}
