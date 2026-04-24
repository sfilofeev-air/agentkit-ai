import { describe, it, expect, vi } from "vitest";
import { Agent } from "../agent.js";
import { defineTool } from "../tool.js";
import type {
  Provider,
  CompletionOptions,
  CompletionResponse,
  AgentEvent,
} from "../types.js";

/** Creates a mock provider that returns predefined responses in sequence */
function mockProvider(responses: CompletionResponse[]): Provider {
  let callIndex = 0;
  return {
    name: "mock",
    complete: vi.fn(async (_options: CompletionOptions) => {
      const response = responses[callIndex];
      if (!response) throw new Error("No more mock responses");
      callIndex++;
      return response;
    }),
  };
}

const STOP_RESPONSE: CompletionResponse = {
  message: { role: "assistant", content: "Hello!" },
  usage: { inputTokens: 10, outputTokens: 5 },
  finishReason: "stop",
};

const TOOL_CALL_RESPONSE: CompletionResponse = {
  message: {
    role: "assistant",
    content: "",
    toolCalls: [
      {
        id: "tc_1",
        name: "greet",
        arguments: { name: "World" },
      },
    ],
  },
  usage: { inputTokens: 15, outputTokens: 8 },
  finishReason: "tool_use",
};

const AFTER_TOOL_RESPONSE: CompletionResponse = {
  message: { role: "assistant", content: "I greeted World for you!" },
  usage: { inputTokens: 20, outputTokens: 10 },
  finishReason: "stop",
};

describe("Agent", () => {
  it("runs a simple conversation without tools", async () => {
    const provider = mockProvider([STOP_RESPONSE]);
    const agent = new Agent({
      name: "test-agent",
      provider,
      model: "test-model",
    });

    const result = await agent.run("Hi");

    expect(result.output).toBe("Hello!");
    expect(result.iterations).toBe(1);
    expect(result.usage.inputTokens).toBe(10);
    expect(result.usage.outputTokens).toBe(5);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it("includes system prompt in messages", async () => {
    const provider = mockProvider([STOP_RESPONSE]);
    const agent = new Agent({
      name: "test-agent",
      provider,
      model: "test-model",
      systemPrompt: "You are helpful.",
    });

    const result = await agent.run("Hi");

    expect(result.messages[0]).toEqual({
      role: "system",
      content: "You are helpful.",
    });
    expect(result.messages[1]).toEqual({ role: "user", content: "Hi" });
  });

  it("executes tool calls and continues", async () => {
    const greetTool = defineTool({
      name: "greet",
      description: "Greet someone",
      parameters: {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      },
      execute: async ({ name }: { name: string }) => `Hello, ${name}!`,
    });

    const provider = mockProvider([TOOL_CALL_RESPONSE, AFTER_TOOL_RESPONSE]);
    const agent = new Agent({
      name: "test-agent",
      provider,
      model: "test-model",
      tools: [greetTool],
    });

    const result = await agent.run("Greet World");

    expect(result.output).toBe("I greeted World for you!");
    expect(result.iterations).toBe(2);
    expect(result.usage.inputTokens).toBe(35);
    expect(result.usage.outputTokens).toBe(18);

    // Check tool result message was added
    const toolMsg = result.messages.find((m) => m.role === "tool");
    expect(toolMsg?.content).toBe("Hello, World!");
    expect(toolMsg?.toolCallId).toBe("tc_1");
  });

  it("handles unknown tool gracefully", async () => {
    const provider = mockProvider([TOOL_CALL_RESPONSE, AFTER_TOOL_RESPONSE]);
    const agent = new Agent({
      name: "test-agent",
      provider,
      model: "test-model",
      tools: [], // no tools registered
    });

    const result = await agent.run("Greet World");

    const toolMsg = result.messages.find((m) => m.role === "tool");
    expect(toolMsg?.content).toContain("not found");
  });

  it("respects maxIterations", async () => {
    // Provider always requests tool use
    const infiniteToolProvider = mockProvider(
      Array(5).fill(TOOL_CALL_RESPONSE)
    );
    const greetTool = defineTool({
      name: "greet",
      description: "Greet",
      parameters: { type: "object", properties: {} },
      execute: async () => "hi",
    });

    const agent = new Agent({
      name: "test-agent",
      provider: infiniteToolProvider,
      model: "test-model",
      tools: [greetTool],
      maxIterations: 3,
    });

    const result = await agent.run("loop");

    expect(result.iterations).toBe(3);
  });

  it("emits events in correct order", async () => {
    const events: AgentEvent["type"][] = [];
    const provider = mockProvider([STOP_RESPONSE]);

    const agent = new Agent({
      name: "test-agent",
      provider,
      model: "test-model",
      onEvent: (e) => events.push(e.type),
    });

    await agent.run("Hi");

    expect(events).toEqual([
      "agent:start",
      "agent:iteration",
      "llm:request",
      "llm:response",
      "agent:end",
    ]);
  });

  it("emits tool events during tool execution", async () => {
    const events: AgentEvent["type"][] = [];
    const greetTool = defineTool({
      name: "greet",
      description: "Greet",
      parameters: { type: "object", properties: {} },
      execute: async () => "hi",
    });

    const provider = mockProvider([TOOL_CALL_RESPONSE, AFTER_TOOL_RESPONSE]);
    const agent = new Agent({
      name: "test-agent",
      provider,
      model: "test-model",
      tools: [greetTool],
      onEvent: (e) => events.push(e.type),
    });

    await agent.run("Greet");

    expect(events).toContain("tool:start");
    expect(events).toContain("tool:end");
  });

  it("emits error event on provider failure", async () => {
    const events: AgentEvent["type"][] = [];
    const failProvider: Provider = {
      name: "fail",
      complete: async () => {
        throw new Error("API down");
      },
    };

    const agent = new Agent({
      name: "test-agent",
      provider: failProvider,
      model: "test-model",
      onEvent: (e) => events.push(e.type),
    });

    await expect(agent.run("Hi")).rejects.toThrow("API down");
    expect(events).toContain("agent:error");
  });
});
