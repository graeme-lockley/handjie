import { Message, Model, ToolResponses } from "./types.ts";
import { Anthropic } from "npm:@anthropic-ai/sdk";
import { BaseModel } from "./base.ts";

class ClaudeModel extends BaseModel implements Model {
  private name: string;
  private apiKey: string;
  private client: Anthropic;
  private modelId: string;
  private temperature: number;
  private maxTokens: number;

  constructor(name: string, properties?: Record<string, unknown>) {
    super();
    this.name = name;
    this.apiKey = properties?.apiKey as string || Deno.env.get("ANTHROPIC_API_KEY") || "";
    this.client = new Anthropic({ apiKey: this.apiKey });

    // Set model properties with defaults
    this.modelId = properties?.modelId as string || "claude-3-7-sonnet-20250219";
    this.temperature = properties?.temperature as number || 0.0;
    this.maxTokens = properties?.maxTokens as number || 1024;
  }

  public getModelName(): string {
    return this.name;
  }

  public async generateResponse(prompt: string | ToolResponses): Promise<string> {
    const newMessage: Message = { role: "user", content: prompt };
    this.context.push(newMessage);

    try {
      // Convert our internal context format to Anthropic's format
      // Anthropic doesn't accept 'system' role in messages array
      const anthropicMessages = this.context
        .filter((msg) => msg.role !== "system")
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: typeof msg.content === "object" ? JSON.stringify(msg.content) : msg.content,
        }));

      // Ensure systemMessage_ is a string - join it if it's an array
      const systemMessage = Array.isArray(this.systemMessage_) ? this.systemMessage_.join("\n") : this.systemMessage_;

      const response = await this.client.messages.create({
        model: this.modelId,
        messages: anthropicMessages,
        system: systemMessage,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      // Safely extract text content from response
      let assistantMessage = "";
      for (const block of response.content) {
        if ("text" in block) {
          assistantMessage = block.text;
          break;
        }
      }

      if (!assistantMessage) {
        throw new Error("No text content found in Claude's response");
      }

      this.context.push({
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error: unknown) {
      // Properly handle unknown error type
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Claude API error: ${errorMessage}`);
    }
  }
}

export const claudeModel = (
  name: string,
  description: string,
  properties?: Record<string, unknown>,
) => ({
  name,
  description,
  factory: () => new ClaudeModel(name, properties),
  properties,
});
