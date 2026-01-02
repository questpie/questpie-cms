import type { QCMS } from "#questpie/cms/server/config/cms";
import { runWithCMSContext } from "#questpie/cms/server/config/context";
import type { RequestContext } from "#questpie/cms/server/config/context";
import type {
	JsonFunctionDefinition,
	InferFunctionOutput,
	InferFunctionInput,
} from "#questpie/cms/server/functions/types";

export async function executeJsonFunction<
	TInput,
	TOutput,
	TFunctions extends JsonFunctionDefinition<TInput, TOutput>,
	TCollections extends any[],
	TGlobals extends any[],
	TJobs extends any[],
	TEmailTemplates extends any[],
	TFunctionsMap extends Record<string, any>,
>(
	cms: QCMS<TCollections, TGlobals, TJobs, TEmailTemplates, TFunctionsMap>,
	definition: TFunctions,
	input: InferFunctionInput<TFunctions>,
	context?: RequestContext,
): Promise<InferFunctionOutput<TFunctions>> {
	const parsed = definition.schema.parse(input);
	const resolvedContext =
		context ?? (await cms.createContext({ accessMode: "system" }));

	return runWithCMSContext(cms, resolvedContext, async () => {
		const result = await definition.handler(parsed as TInput);
		if (definition.outputSchema) {
			return definition.outputSchema.parse(result) as InferFunctionOutput<TFunctions>;
		}
		return result as InferFunctionOutput<TFunctions>;
	});
}
