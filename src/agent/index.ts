import * as LLM from "../model/index.ts";
import * as Tools from "../tools/index.ts";
import { systemContext } from "./system-context.ts";
import { debugPrefix, info, response } from "../lib/cli.ts";
import { ResponseParser } from "./response-parser.ts";

/**
 * Abstract Agent class that provides the core functionality for all specialized agents
 */
export abstract class Agent {
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
   * Abstract method that must be implemented by specialized agents
   * This defines the initial prompt/task for the agent
   */
  protected abstract getInitialPrompt(): string;

  /**
   * Executes the agent's task
   */
  public async run(): Promise<void> {
    // Get the initial prompt from the specialized implementation
    const initialPrompt = this.getInitialPrompt();

    // Start the conversation with the initial prompt
    let answer = await this.generateResponse(initialPrompt);

    // Main processing loop
    while (true) {
      try {
        // Parse the response using the ResponseParser
        const parser = new ResponseParser(answer);

        // Handle response messages
        const responseMessage = parser.getResponseMessage();
        if (responseMessage) {
          response(this.name, responseMessage);
        }

        // Handle tool usage
        const toolUsage = parser.getToolUsage();
        if (toolUsage) {
          answer = await this.processTool(toolUsage);
        } // Handle task completion
        else if (parser.isTaskCompleted()) {
          info("Task completed.");
          break;
        } // Handle any other responses, including non-object and plain text
        else {
          answer = await this.generateResponse("Please continue.");
        }
      } catch (e: any) {
        // Handle JSON parsing errors
        debugPrefix(this.model.getModelName(), `Error parsing response: ${e}`);
        debugPrefix(this.model.getModelName(), answer);

        answer = await this.generateResponse(
          `Error parsing response: ${e.message}. Please provide a valid JSON response.`,
        );
      }
    }
  }

  private async generateResponse(prompt: string): Promise<string> {
    debugPrefix(this.model.getModelName() + " prompt", prompt);
    let answer = await this.model.generateResponse(prompt);
    debugPrefix(this.model.getModelName() + " response", answer);

    return answer;
  }

  /**
   * Processes a tool execution request
   * @param toolUsage The tool usage information
   * @returns The model's response after tool execution
   */
  private async processTool(toolUsage: {
    identifier: string;
    function_name: string;
    args: any[];
  }): Promise<string> {
    const toolIdentifier = toolUsage.identifier;
    const functionName = toolUsage.function_name;
    const args = toolUsage.args;

    // Find the requested tool
    const tool = this.tools.find((t) => t.identifier === toolIdentifier);

    if (tool) {
      if (tool.functionMap[functionName]) {
        try {
          // Execute the tool function
          const toolResult = await tool.functionMap[functionName](...args);
          return await this.generateResponse(`Tool result: ${toolResult}`);
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
