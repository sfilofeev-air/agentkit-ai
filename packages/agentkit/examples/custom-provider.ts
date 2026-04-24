import { Agent, defineTool } from "agentkit-framework";
import type { Provider, CompletionOptions, CompletionResponse } from "agentkit-framework";

/**
 * Example: Using AgentKit with any LLM by implementing the Provider interface.
 * This works with Ollama, LiteLLM, vLLM, or any OpenAI-compatible API.
 */
class OllamaProvider implements Provider {
  name = "ollama";
  private baseUrl: string;

  constructor(baseUrl = "http://localhost:11434") {
    this.baseUrl = baseUrl;
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error (${response.status})`);
    }

    const data = (await response.json()) as {
      message: { content: string };
      eval_count: number;
      prompt_eval_count: number;
    };

    return {
      message: { role: "assistant", content: data.message.content },
      usage: {
        inputTokens: data.prompt_eval_count ?? 0,
        outputTokens: data.eval_count ?? 0,
      },
      finishReason: "stop",
    };
  }
}

// Use it like any other provider
const agent = new Agent({
  name: "local-agent",
  provider: new OllamaProvider(),
  model: "llama3",
  systemPrompt: "You are a helpful assistant running locally.",
});

const result = await agent.run("What is the meaning of life?");
console.log(result.output);
