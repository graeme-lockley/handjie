import * as LLM from "../model/index.ts";
import * as Tools from "../tools/index.ts";
import { systemContext } from "./system-context.ts";
import { debugPrefix, info, response } from "../lib/cli.ts";
import { type FunctionCall, type ResponseMessage, ResponseParser } from "./response-parser.ts";
import { Context } from "../model/types.ts";

/**
 * Abstract Agent class that provides the core functionality for all specialized agents
 */
export class Agent {
  protected name: string;
  protected model: LLM.Model;
  protected tools: Tools.Tool[];

  /**
   * Constructor to initialize an agent with a model and tools
   * @param modelName The name of the model to use
   * @param tools Array of tools the agent can use
   */
  constructor(
    name: string,
    modelName: string,
    tools: Tools.Tool[] | undefined = undefined,
  ) {
    this.name = name;
    this.model = LLM.newModel(modelName)!;
    this.tools = tools || Tools.tools;

    // Set up the system context for the model
    this.model.systemMessage(
      systemContext(this.tools).join("\n"),
    );
  }

  /**
   * Executes the agent's task
   */
  public async prompt(prompt: string): Promise<void> {
    // Start the conversation with the initial prompt
    let answer = await this.generateResponse(prompt);

    // Main processing loop
    while (true) {
      try {
        // Parse the response using the ResponseParser
        const parser = new ResponseParser(answer);

        // Handle response messages
        const responseMessage: ResponseMessage = parser.parse();
        if (responseMessage) {
          response(this.name, responseMessage.content);
        }

        // Handle tool usage
        if (responseMessage.function_call !== undefined) {
          answer = await this.processTool(responseMessage.function_call!);
        } // Handle task completion
        else if (responseMessage.done) {
          info("Task completed.");
          break;
        } // Handle any other responses, including non-object and plain text
        else {
          answer = await this.generateResponse("You done yet?  If you are then use TOOL:done() to note as done otherwise please continue.");
        }
      } catch (e: unknown) {
        // Handle JSON parsing errors
        debugPrefix(this.model.getModelName(), `Error parsing response: ${e}`);
        debugPrefix(this.model.getModelName(), answer);

        answer = await this.generateResponse(
          `Error parsing response: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  /**
   * Saves the current conversation context to a file
   * @param path The path to save the context to
   */
  public async saveContext(path: string): Promise<void> {
    if (this.model instanceof LLM.BaseModel) {
      try {
        const context = (this.model as LLM.BaseModel).getContext();
        await Deno.writeTextFile(path, JSON.stringify(context, null, 2));
        info(`Context saved to ${path}`);
      } catch (e: unknown) {
        info(`Error saving context: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      info(`Model ${this.model.getModelName()} does not support context saving`);
    }
  }

  /**
   * Loads conversation context from a file
   * @param path The path to load the context from
   */
  public async loadContext(path: string): Promise<void> {
    if (this.model instanceof LLM.BaseModel) {
      try {
        const contextText = await Deno.readTextFile(path);
        const context = JSON.parse(contextText) as Context;
        (this.model as LLM.BaseModel).setContext(context);
        info(`Context loaded from ${path}`);
      } catch (e: unknown) {
        if (e instanceof Deno.errors.NotFound) {
          info(`No previous context found at ${path}`);
        } else {
          info(`Error loading context: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } else {
      info(`Model ${this.model.getModelName()} does not support context loading`);
    }
  }

  /**
   * Clears the current conversation context
   */
  public clearContext(): void {
    if (this.model instanceof LLM.BaseModel) {
      (this.model as LLM.BaseModel).clearContext();
      // Re-initialize the system message
      this.model.systemMessage(systemContext(this.tools).join("\n"));
      info(`Context cleared for ${this.name}`);
    } else {
      info(`Model ${this.model.getModelName()} does not support context clearing`);
    }
  }

  private async generateResponse(prompt: string): Promise<string> {
    debugPrefix(this.model.getModelName() + " prompt", prompt);
    const answer = await this.model.generateResponse(prompt);
    debugPrefix(this.model.getModelName() + " response", answer);

    return answer;
  }

  /**
   * Processes a tool execution request
   * @param toolUsage The tool usage information
   * @returns The model's response after tool execution
   */
  private async processTool(toolUsage: FunctionCall): Promise<string> {
    const toolIdentifier = toolUsage.tool;
    const functionName = toolUsage.function;
    const args = toolUsage.arguments;

    // Find the requested tool
    const tool = this.tools.find((t) => t.identifier === toolIdentifier);

    if (tool) {
      if (tool.functionMap[functionName]) {
        try {
          // Execute the tool function
          const toolResult = await tool.functionMap[functionName](...args);
          return await this.generateResponse(
            `Tool result: ${toolIdentifier}.${functionName}(${args.map((arg) => JSON.stringify(arg)).join(", ")}) -> ${toolResult}`,
          );
        } catch (e) {
          return await this.generateResponse(`Function error: ${e}.`);
        }
      } else {
        return await this.generateResponse(`Function ${functionName} not found in tool ${tool.name}`);
      }
    } else {
      return await this.generateResponse(`Tool with identifier ${toolIdentifier} not found`);
    }
  }
}
