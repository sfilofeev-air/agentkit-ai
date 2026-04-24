import type {
  AgentConfig,
  AgentResult,
  AgentEvent,
  Message,
  TokenUsage,
  ToolCall,
  ToolResult,
} from "./types.js";
import { executeTool, findTool } from "./tool.js";
import { withRetry } from "./retry.js";
import { RateLimiter } from "./rate-limit.js";

const DEFAULT_MAX_ITERATIONS = 10;

export class Agent {
  private config: Required<
    Pick<AgentConfig, "name" | "provider" | "model" | "maxIterations">
  > &
    AgentConfig;
  private rateLimiter?: RateLimiter;

  constructor(config: AgentConfig) {
    this.config = {
      ...config,
      maxIterations: config.maxIterations ?? DEFAULT_MAX_ITERATIONS,
    };

    if (config.rateLimit !== false && config.rateLimit) {
      this.rateLimiter = new RateLimiter(config.rateLimit);
    }
  }

  get name(): string {
    return this.config.name;
  }

  /** Run the agent with a user message */
  async run(input: string): Promise<AgentResult> {
    const startTime = Date.now();
    const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    let iterations = 0;

    const messages: Message[] = [];

    if (this.config.systemPrompt) {
      messages.push({ role: "system", content: this.config.systemPrompt });
    }

    messages.push({ role: "user", content: input });

    this.emit({
      type: "agent:start",
      timestamp: startTime,
      agentName: this.name,
      data: { input },
    });

    try {
      while (iterations < this.config.maxIterations) {
        iterations++;

        this.emit({
          type: "agent:iteration",
          timestamp: Date.now(),
          agentName: this.name,
          data: { iteration: iterations },
        });

        // Request completion from provider
        this.emit({
          type: "llm:request",
          timestamp: Date.now(),
          agentName: this.name,
          data: {
            model: this.config.model,
            messageCount: messages.length,
          },
        });

        if (this.rateLimiter) {
          await this.rateLimiter.acquire();
        }

        const completionFn = () =>
          this.config.provider.complete({
            model: this.config.model,
            messages,
            tools: this.config.tools,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
          });

        const response =
          this.config.retry === false
            ? await completionFn()
            : await withRetry(completionFn, this.config.retry);

        totalUsage.inputTokens += response.usage.inputTokens;
        totalUsage.outputTokens += response.usage.outputTokens;

        this.emit({
          type: "llm:response",
          timestamp: Date.now(),
          agentName: this.name,
          data: {
            finishReason: response.finishReason,
            usage: response.usage,
          },
        });

        messages.push(response.message);

        // If no tool calls, we're done
        if (
          response.finishReason !== "tool_use" ||
          !response.message.toolCalls?.length
        ) {
          const duration = Date.now() - startTime;

          this.emit({
            type: "agent:end",
            timestamp: Date.now(),
            agentName: this.name,
            data: {
              iterations,
              duration,
              usage: totalUsage,
            },
          });

          return {
            output: response.message.content,
            messages,
            iterations,
            usage: totalUsage,
            duration,
          };
        }

        // Execute tool calls
        const toolResults = await this.executeToolCalls(
          response.message.toolCalls
        );

        // Add tool results as messages
        for (const result of toolResults) {
          messages.push({
            role: "tool",
            content: result.content,
            toolCallId: result.toolCallId,
          });
        }
      }

      // Max iterations reached
      const duration = Date.now() - startTime;
      const lastAssistant = messages
        .filter((m) => m.role === "assistant")
        .pop();

      this.emit({
        type: "agent:end",
        timestamp: Date.now(),
        agentName: this.name,
        data: {
          iterations,
          duration,
          usage: totalUsage,
          maxIterationsReached: true,
        },
      });

      return {
        output: lastAssistant?.content ?? "[max iterations reached]",
        messages,
        iterations,
        usage: totalUsage,
        duration,
      };
    } catch (error) {
      this.emit({
        type: "agent:error",
        timestamp: Date.now(),
        agentName: this.name,
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          iterations,
        },
      });
      throw error;
    }
  }

  private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResult[]> {
    const tools = this.config.tools ?? [];
    const results: ToolResult[] = [];

    for (const call of toolCalls) {
      const tool = findTool(tools, call.name);

      this.emit({
        type: "tool:start",
        timestamp: Date.now(),
        agentName: this.name,
        data: { toolName: call.name, arguments: call.arguments },
      });

      if (!tool) {
        const result: ToolResult = {
          toolCallId: call.id,
          content: `Tool "${call.name}" not found`,
          isError: true,
        };
        results.push(result);

        this.emit({
          type: "tool:error",
          timestamp: Date.now(),
          agentName: this.name,
          data: { toolName: call.name, error: "Tool not found" },
        });
        continue;
      }

      const { content, isError } = await executeTool(tool, call.arguments);
      results.push({ toolCallId: call.id, content, isError });

      this.emit({
        type: isError ? "tool:error" : "tool:end",
        timestamp: Date.now(),
        agentName: this.name,
        data: { toolName: call.name, isError },
      });
    }

    return results;
  }

  private emit(event: AgentEvent): void {
    this.config.onEvent?.(event);
  }
}
