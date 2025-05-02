export interface Model {
  systemMessage(message: string): void;
  generateResponse(prompt: string | ToolResponses): Promise<string>;
  getModelName(): string;
}

export type ModelDescription = {
  name: string;
  description: string;
  factory: () => Model;
  properties?: Record<string, unknown>;
};

export type Message = {
  role: "system" | "user" | "assistant";
  content: string | ToolResponses;
};

export type Context = Message[];

export type ToolResponses = {
  type: "tool_responses";
  responses: ToolResponse[];
};

export type ToolResponse = {
  correlationId: string;
  success: boolean;
  content: string;
};
