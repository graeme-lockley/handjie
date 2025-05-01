import { Context, Message, Model } from "./types.ts";

/**
 * Base Model class with context management capabilities
 */
export abstract class BaseModel implements Model {
  protected context: Context = [];
  protected systemMessage_: string = "";

  public systemMessage(message: string): void {
    this.systemMessage_ = message;
  }

  /**
   * Gets the current conversation context
   */
  public getContext(): Context {
    return [...this.context];
  }

  /**
   * Sets the conversation context
   */
  public setContext(context: Context): void {
    this.context = [...context];
  }

  /**
   * Clears the conversation context
   */
  public clearContext(): void {
    this.context = [];
  }

  public abstract generateResponse(prompt: string): Promise<string>;
  public abstract getModelName(): string;
}
