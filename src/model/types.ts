export interface Model {
  systemMessage(message: string): void;
  generateResponse(prompt: string): Promise<string>;
  getModelName(): string;
}

export type ModelDescription = {
  name: string;
  description: string;
  factory: () => Model;
  contextSize: number;
  properties?: Record<string, unknown>;
};

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type Context = Message[];
