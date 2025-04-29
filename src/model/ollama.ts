import { Context, Message, Model } from "./types.ts";

class OllamaModel implements Model {
  private name: string;
  private context: Context;

  constructor(name: string) {
    this.name = name;
    this.context = [];
  }

  public systemMessage(message: string): void {
    this.context.push({
      role: "system",
      content: message,
    });
  }

  public getModelName(): string {
    return this.name;
  }

  public async generateResponse(prompt: string): Promise<string> {
    const newMessage: Message = { role: "user", content: prompt };
    this.context.push(newMessage);

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.name,
        messages: this.context,
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
  contextSize: number,
) => ({
  name,
  description,
  factory: () => new OllamaModel(name),
  contextSize,
});
