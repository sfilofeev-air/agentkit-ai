import type { ToolDefinition, ToolParameterSchema } from "./types.js";

/**
 * Define a tool that an agent can use.
 *
 * @example
 * const calculator = defineTool({
 *   name: "calculator",
 *   description: "Perform basic math operations",
 *   parameters: {
 *     type: "object",
 *     properties: {
 *       expression: { type: "string", description: "Math expression to evaluate" }
 *     },
 *     required: ["expression"]
 *   },
 *   execute: async ({ expression }) => {
 *     return String(eval(expression));
 *   }
 * });
 */
export function defineTool<TParams = Record<string, unknown>>(
  config: ToolDefinition<TParams>
): ToolDefinition<TParams> {
  return config;
}

/** Convert tool definitions to provider-specific format */
export function toolsToProviderFormat(tools: ToolDefinition[]): {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}[] {
  return tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}

/** Find a tool by name */
export function findTool(
  tools: ToolDefinition[],
  name: string
): ToolDefinition | undefined {
  return tools.find((t) => t.name === name);
}

/** Execute a tool with error handling */
export async function executeTool(
  tool: ToolDefinition,
  params: Record<string, unknown>
): Promise<{ content: string; isError: boolean }> {
  try {
    const result = await tool.execute(params);
    return { content: result, isError: false };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown tool error";
    return { content: `Tool error: ${message}`, isError: true };
  }
}
