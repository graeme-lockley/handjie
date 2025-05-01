import { Message, Model } from "./types.ts";
import { BaseModel } from "./base.ts";

class OllamaModel extends BaseModel implements Model {
  private name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  public getModelName(): string {
    return this.name;
  }

  public async generateResponse(prompt: string): Promise<string> {
    const newMessage: Message = { role: "user", content: prompt };
    this.context.push(newMessage);

    // If we have a system message and it's not already in the context, add it to the beginning
    const hasSystemMessage = this.context.some((msg) => msg.role === "system");
    const messages = hasSystemMessage ? [...this.context] : [{ role: "system", content: this.systemMessage_ }, ...this.context];

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.name,
        messages: messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const assistantMessage = data.message;

    this.context.push({
      role: "assistant",
      content: assistantMessage.content,
    });

    return assistantMessage.content;
  }
}

export const ollamaModel = (
  name: string,
  description: string,
) => ({
  name,
  description,
  factory: () => new OllamaModel(name),
});
