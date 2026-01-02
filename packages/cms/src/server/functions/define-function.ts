import type {
	FunctionDefinition,
	JsonFunctionDefinition,
	RawFunctionDefinition,
} from "./types";

export function defineFunction<TInput, TOutput>(
	definition: JsonFunctionDefinition<TInput, TOutput>,
): JsonFunctionDefinition<TInput, TOutput>;
export function defineFunction(
	definition: RawFunctionDefinition,
): RawFunctionDefinition;
export function defineFunction(
	definition: FunctionDefinition,
): FunctionDefinition {
	return definition;
}
