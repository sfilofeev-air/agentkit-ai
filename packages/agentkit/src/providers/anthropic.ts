import type {
  Provider,
  CompletionOptions,
  CompletionResponse,
  Message,
  ToolCall,
} from "../types.js";

interface AnthropicConfig {
  apiKey?: string;
  baseUrl?: string;
}

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicResponse {
  id: string;
  content: AnthropicContentBlock[];
  stop_reason: "end_turn" | "tool_use" | "max_tokens";
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider implements Provider {
  name = "anthropic";
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AnthropicConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    this.baseUrl =
      config.baseUrl ?? "https://api.anthropic.com/v1";

    if (!this.apiKey) {
      throw new Error(
        "Anthropic API key required. Set ANTHROPIC_API_KEY env var or pass apiKey."
      );
    }
  }

  async complete(options: CompletionOptions): Promise<CompletionResponse> {
    const { messages, system } = this.convertMessages(options.messages);

    const body: Record<string, unknown> = {
      model: options.model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (system) body.system = system;
    if (options.temperature !== undefined)
      body.temperature = options.temperature;
    if (options.stop) body.stop_sequences = options.stop;

    if (options.tools?.length) {
      body.tools = options.tools.map(
        (t): AnthropicTool => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })
      );
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    return this.convertResponse(data);
  }

  private convertMessages(messages: Message[]): {
    messages: AnthropicMessage[];
    system?: string;
  } {
    let system: string | undefined;
    const converted: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        system = msg.content;
        continue;
      }

      if (msg.role === "tool") {
        // Tool results need to be attached to the previous assistant message
        const block: AnthropicContentBlock = {
          type: "tool_result",
          tool_use_id: msg.toolCallId,
          content: msg.content,
        };
        converted.push({ role: "user", content: [block] });
        continue;
      }

      if (msg.role === "assistant" && msg.toolCalls?.length) {
        const blocks: AnthropicContentBlock[] = [];
        if (msg.content) {
          blocks.push({ type: "text", text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          blocks.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }
        converted.push({ role: "assistant", content: blocks });
        continue;
      }

      converted.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }

    return { messages: converted, system };
  }

  private convertResponse(data: AnthropicResponse): CompletionResponse {
    const textParts: string[] = [];
    const toolCalls: ToolCall[] = [];

    for (const block of data.content) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id!,
          name: block.name!,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    const finishReason =
      data.stop_reason === "tool_use"
        ? "tool_use"
        : data.stop_reason === "max_tokens"
          ? "max_tokens"
          : "stop";

    return {
      message: {
        role: "assistant",
        content: textParts.join(""),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      },
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
      finishReason,
    };
  }
}
