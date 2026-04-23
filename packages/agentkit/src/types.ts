// === Core Types ===

/** Message role in a conversation */
export type Role = "system" | "user" | "assistant" | "tool";

/** A single message in the conversation */
export interface Message {
  role: Role;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

/** A tool call requested by the model */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Result of executing a tool */
export interface ToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

// === Tool Definition ===

/** JSON Schema for tool parameters */
export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/** Definition of a tool that an agent can use */
export interface ToolDefinition<TParams = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  execute: (params: TParams) => Promise<string>;
}

// === Provider ===

/** Options for a completion request */
export interface CompletionOptions {
  model: string;
  messages: Message[];
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  stop?: string[];
}

/** Streamed chunk from provider */
export interface CompletionChunk {
  type: "text" | "tool_call" | "done";
  text?: string;
  toolCall?: ToolCall;
  usage?: TokenUsage;
}

/** Token usage information */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Response from a completion request */
export interface CompletionResponse {
  message: Message;
  usage: TokenUsage;
  finishReason: "stop" | "tool_use" | "max_tokens" | "error";
}

/** LLM provider interface */
export interface Provider {
  name: string;
  complete(options: CompletionOptions): Promise<CompletionResponse>;
  stream?(options: CompletionOptions): AsyncIterable<CompletionChunk>;
}

// === Agent ===

/** Agent configuration */
export interface AgentConfig {
  name: string;
  description?: string;
  provider: Provider;
  model: string;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  maxIterations?: number;
  onEvent?: (event: AgentEvent) => void;
}

/** Agent run result */
export interface AgentResult {
  output: string;
  messages: Message[];
  iterations: number;
  usage: TokenUsage;
  duration: number;
}

// === Observability ===

export type AgentEventType =
  | "agent:start"
  | "agent:end"
  | "agent:error"
  | "agent:iteration"
  | "llm:request"
  | "llm:response"
  | "tool:start"
  | "tool:end"
  | "tool:error";

export interface AgentEvent {
  type: AgentEventType;
  timestamp: number;
  agentName: string;
  data: Record<string, unknown>;
}
