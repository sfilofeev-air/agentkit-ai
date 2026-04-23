import { Agent, AnthropicProvider, defineTool } from "agentkit-ai";

// 1. Define tools
const weatherTool = defineTool({
  name: "get_weather",
  description: "Get current weather for a city",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name" },
    },
    required: ["city"],
  },
  execute: async ({ city }) => {
    // In real app, call a weather API
    return `Weather in ${city}: 22°C, sunny`;
  },
});

// 2. Create agent
const agent = new Agent({
  name: "weather-assistant",
  provider: new AnthropicProvider(), // uses ANTHROPIC_API_KEY env var
  model: "claude-sonnet-4-20250514",
  systemPrompt: "You are a helpful weather assistant. Use the weather tool to answer questions.",
  tools: [weatherTool],
  onEvent: (event) => {
    console.log(`[${event.type}]`, JSON.stringify(event.data));
  },
});

// 3. Run
const result = await agent.run("What's the weather in Tokyo?");

console.log("\n--- Result ---");
console.log("Output:", result.output);
console.log("Iterations:", result.iterations);
console.log("Tokens:", result.usage);
console.log("Duration:", result.duration, "ms");
