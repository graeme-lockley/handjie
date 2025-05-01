import { Message, Model } from "./types.ts";
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
    this.apiKey = properties?.apiKey as string ||
      Deno.env.get("ANTHROPIC_API_KEY") || "";
    this.client = new Anthropic({
      apiKey: this.apiKey,
    });

    // Set model properties with defaults
    this.modelId = properties?.modelId as string ||
      "claude-3-7-sonnet-20250219";
    this.temperature = properties?.temperature as number || 0.0;
    this.maxTokens = properties?.maxTokens as number || 1024;
  }

  public getModelName(): string {
    return this.name;
  }

  public async generateResponse(prompt: string): Promise<string> {
    const newMessage: Message = { role: "user", content: prompt };
    this.context.push(newMessage);

    try {
      const response = await this.client.messages.create({
        model: this.modelId,
        messages: this.context,
        system: this.systemMessage_,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      });

      const assistantMessage = response.content[0].text;

      this.context.push({
        role: "assistant",
        content: assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      throw new Error(`Claude API error: ${error.message}`);
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
