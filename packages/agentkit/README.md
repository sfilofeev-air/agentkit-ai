# AgentKit

**The Express.js of AI Agents** — simple, production-ready, observable.

[![npm version](https://img.shields.io/npm/v/agentkit-framework.svg)](https://www.npmjs.com/package/agentkit-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Build AI agents in minutes, not days. AgentKit gives you a minimal, type-safe API with built-in observability — so you can focus on what your agent does, not how it runs.

```bash
npm install agentkit-framework
```

## Quick Start

```typescript
import { Agent, AnthropicProvider, defineTool } from "agentkit-framework";

const searchTool = defineTool({
  name: "search",
  description: "Search the web",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
    },
    required: ["query"],
  },
  execute: async ({ query }) => {
    // Your search implementation
    return `Results for: ${query}`;
  },
});

const agent = new Agent({
  name: "researcher",
  provider: new AnthropicProvider(),
  model: "claude-sonnet-4-20250514",
  systemPrompt: "You are a research assistant.",
  tools: [searchTool],
});

const result = await agent.run("Find recent news about AI agents");
console.log(result.output);
```

That's it. No chains, no graphs, no 200-line config files.

## Why AgentKit?

| | AgentKit | LangChain | CrewAI |
|---|---|---|---|
| **Learning curve** | 5 minutes | Hours | 30+ minutes |
| **API surface** | 3 exports | 100+ classes | 20+ classes |
| **Observability** | Built-in | Needs LangSmith | None |
| **Type safety** | Full TypeScript | Partial | No |
| **Bundle size** | ~12 KB | 2+ MB | 500+ KB |
| **Dependencies** | 0 | 50+ | 20+ |

## Core Concepts

### Agent

The agent runs a loop: send messages to LLM → execute tool calls → repeat until done.

```typescript
const agent = new Agent({
  name: "my-agent",
  provider: new AnthropicProvider(),
  model: "claude-sonnet-4-20250514",
  systemPrompt: "You are a helpful assistant.",
  tools: [myTool],
  maxIterations: 10,  // safety limit (default: 10)
  temperature: 0.7,
});

const result = await agent.run("Do something useful");

// result.output     — final text response
// result.iterations — how many LLM calls were made
// result.usage      — total tokens used
// result.duration   — wall clock time in ms
// result.messages   — full conversation history
```

### Tools

Tools are functions the agent can call. Define them with full type safety:

```typescript
import { defineTool } from "agentkit-framework";

const calculator = defineTool({
  name: "calculator",
  description: "Evaluate a math expression",
  parameters: {
    type: "object",
    properties: {
      expression: { type: "string", description: "e.g. 2 + 2" },
    },
    required: ["expression"],
  },
  execute: async ({ expression }) => {
    // Your logic here
    return String(eval(expression));
  },
});
```

### Providers

Swap LLM providers with one line:

```typescript
import { AnthropicProvider, OpenAIProvider } from "agentkit-framework";

// Claude
const claude = new AnthropicProvider(); // uses ANTHROPIC_API_KEY
const agent1 = new Agent({ provider: claude, model: "claude-sonnet-4-20250514", ... });

// OpenAI
const openai = new OpenAIProvider(); // uses OPENAI_API_KEY
const agent2 = new Agent({ provider: openai, model: "gpt-4o", ... });

// Custom / local models (any OpenAI-compatible API)
const local = new OpenAIProvider({ baseUrl: "http://localhost:11434/v1", apiKey: "ollama" });
const agent3 = new Agent({ provider: local, model: "llama3", ... });
```

### Observability

Every action emits events. No external tools needed:

```typescript
const agent = new Agent({
  name: "my-agent",
  provider,
  model: "claude-sonnet-4-20250514",
  onEvent: (event) => {
    switch (event.type) {
      case "agent:start":
        console.log("Agent started");
        break;
      case "tool:start":
        console.log(`Calling tool: ${event.data.toolName}`);
        break;
      case "tool:end":
        console.log(`Tool done: ${event.data.toolName}`);
        break;
      case "llm:response":
        console.log(`Tokens: ${JSON.stringify(event.data.usage)}`);
        break;
      case "agent:end":
        console.log(`Done in ${event.data.duration}ms`);
        break;
    }
  },
});
```

**Event types:** `agent:start`, `agent:end`, `agent:error`, `agent:iteration`, `llm:request`, `llm:response`, `tool:start`, `tool:end`, `tool:error`

### Custom Providers

Implement the `Provider` interface to use any LLM:

```typescript
import type { Provider, CompletionOptions, CompletionResponse } from "agentkit-framework";

class MyProvider implements Provider {
  name = "my-provider";

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    // Call your LLM API here
    return {
      message: { role: "assistant", content: "response" },
      usage: { inputTokens: 0, outputTokens: 0 },
      finishReason: "stop",
    };
  }
}
```

## Requirements

- Node.js 20+
- TypeScript 5.5+ (recommended)

## The Story

AgentKit is built by an AI agent (Claude) as part of the [AI Reality Billion](https://github.com/sfilofeev-air/agentkit-ai) experiment — an autonomous AI building a product from zero to $1B. Every line of code, every decision, every strategy is made by the AI.

Follow the journey: every day, one session, full autonomy.

## License

MIT
