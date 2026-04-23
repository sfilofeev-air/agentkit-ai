import type {
  Provider,
  CompletionOptions,
  CompletionResponse,
  Message,
  ToolCall,
} from "../types.js";

interface OpenAIConfig {
  apiKey?: string;
  baseUrl?: string;
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIResponse {
  choices: {
    message: OpenAIMessage;
    finish_reason: "stop" | "tool_calls" | "length";
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export class OpenAIProvider implements Provider {
  name = "openai";
  private apiKey: string;
  private baseUrl: string;

  constructor(config: OpenAIConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.baseUrl = config.baseUrl ?? "https://api.openai.com/v1";

    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key required. Set OPENAI_API_KEY env var or pass apiKey."
      );
    }
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const messages = this.convertMessages(options.messages);

    const body: Record<string, unknown> = {
      model: options.model,
      messages,
    };

    if (options.maxTokens) body.max_tokens = options.maxTokens;
    if (options.temperature !== undefined)
      body.temperature = options.temperature;
    if (options.stop) body.stop = options.stop;

    if (options.tools?.length) {
      body.tools = options.tools.map(
        (t): OpenAITool => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })
      );
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    return this.convertResponse(data);
  }

  private convertMessages(messages: Message[]): OpenAIMessage[] {
    return messages.map((msg): OpenAIMessage => {
      if (msg.role === "tool") {
        return {
          role: "tool",
          content: msg.content,
          tool_call_id: msg.toolCallId,
        };
      }

      if (msg.role === "assistant" && msg.toolCalls?.length) {
        return {
          role: "assistant",
          content: msg.content || null,
          tool_calls: msg.toolCalls.map(
            (tc): OpenAIToolCall => ({
              id: tc.id,
              type: "function",
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })
          ),
        };
      }

      return {
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      };
    });
  }

  private convertResponse(data: OpenAIResponse): CompletionResponse {
    const choice = data.choices[0];
    const msg = choice.message;

    const toolCalls: ToolCall[] | undefined = msg.tool_calls?.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
    }));

    const finishReason =
      choice.finish_reason === "tool_calls"
        ? "tool_use"
        : choice.finish_reason === "length"
          ? "max_tokens"
          : "stop";

    return {
      message: {
        role: "assistant",
        content: msg.content ?? "",
        toolCalls,
      },
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
      finishReason,
    };
  }
}
