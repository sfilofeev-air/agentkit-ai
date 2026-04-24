import { describe, it, expect } from "vitest";
import { defineTool, findTool, executeTool } from "../tool.js";
import type { ToolDefinition } from "../types.js";

const echoTool = defineTool({
  name: "echo",
  description: "Echoes input",
  parameters: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  execute: async ({ text }: { text: string }) => text,
});

const failTool = defineTool({
  name: "fail",
  description: "Always fails",
  parameters: { type: "object", properties: {} },
  execute: async () => {
    throw new Error("intentional error");
  },
});

describe("defineTool", () => {
  it("returns the tool definition as-is", () => {
    expect(echoTool.name).toBe("echo");
    expect(echoTool.description).toBe("Echoes input");
    expect(echoTool.parameters.type).toBe("object");
  });
});

describe("findTool", () => {
  const tools: ToolDefinition[] = [echoTool, failTool];

  it("finds a tool by name", () => {
    expect(findTool(tools, "echo")).toBe(echoTool);
    expect(findTool(tools, "fail")).toBe(failTool);
  });

  it("returns undefined for unknown tool", () => {
    expect(findTool(tools, "unknown")).toBeUndefined();
  });
});

describe("executeTool", () => {
  it("executes tool and returns content", async () => {
    const result = await executeTool(echoTool, { text: "hello" });
    expect(result.content).toBe("hello");
    expect(result.isError).toBe(false);
  });

  it("catches errors and returns isError true", async () => {
    const result = await executeTool(failTool, {});
    expect(result.content).toBe("Tool error: intentional error");
    expect(result.isError).toBe(true);
  });
});
