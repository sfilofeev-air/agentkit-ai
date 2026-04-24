import { Agent, AnthropicProvider, defineTool } from "agentkit-framework";

// Multiple tools working together
const searchTool = defineTool({
  name: "search",
  description: "Search for information on a topic",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
    },
    required: ["query"],
  },
  execute: async ({ query }: { query: string }) => {
    // Simulate search results
    return JSON.stringify([
      { title: `Result 1 for "${query}"`, snippet: "Relevant information..." },
      { title: `Result 2 for "${query}"`, snippet: "More details..." },
    ]);
  },
});

const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform math calculations",
  parameters: {
    type: "object",
    properties: {
      expression: { type: "string", description: "Math expression (e.g., '2 + 2')" },
    },
    required: ["expression"],
  },
  execute: async ({ expression }: { expression: string }) => {
    // Safe math evaluation (in production, use a proper math parser)
    const result = Function(`"use strict"; return (${expression})`)();
    return String(result);
  },
});

const saveTool = defineTool({
  name: "save_note",
  description: "Save a note with a title",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Note title" },
      content: { type: "string", description: "Note content" },
    },
    required: ["title", "content"],
  },
  execute: async ({ title, content }: { title: string; content: string }) => {
    console.log(`  [Saved] "${title}": ${content}`);
    return `Note "${title}" saved successfully`;
  },
});

const agent = new Agent({
  name: "research-assistant",
  provider: new AnthropicProvider(),
  model: "claude-sonnet-4-20250514",
  systemPrompt:
    "You are a research assistant. Use search to find information, calculator for math, and save_note to store findings.",
  tools: [searchTool, calculatorTool, saveTool],
  retry: { maxRetries: 2 },
  onEvent: (e) => {
    if (e.type === "tool:start") console.log(`  → ${e.data.toolName}`);
    if (e.type === "agent:end") console.log(`  ✓ Done in ${e.data.duration}ms`);
  },
});

const result = await agent.run(
  "Search for the population of Tokyo, calculate what 1% of that is, and save a note with the result."
);

console.log("\nAgent:", result.output);
