import * as LLM from "../model/index.ts";
import * as Tools  from "../tools/index.ts";
import { systemContext } from "./system-context.ts";
import { debugPrefix, info } from "../lib/cli.ts";

/**
 * Abstract Agent class that provides the core functionality for all specialized agents
 */
export abstract class Agent {
  protected model: LLM.Model;
  protected tools: Tools.Tool[];
  
  /**
   * Constructor to initialize an agent with a model and tools
   * @param modelName The name of the model to use
   * @param tools Array of tools the agent can use
   */
  constructor(modelName: string, tools: Tools.Tool[] | undefined = undefined) {
    this.model = LLM.models.newModel(modelName)!;
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
    let answer = await this.model.generateResponse(initialPrompt);
    
    // Main processing loop
    while (true) {
      debugPrefix(this.model.getModelName(), answer);

      try {
        const jsonAnswer = JSON.parse(answer);
        
        // Handle response messages
        if (jsonAnswer?.response?.message != undefined) {
          console.log(jsonAnswer.response.message);
        }

        // Handle tool usage
        if (
          jsonAnswer.use_tool?.identifier != undefined &&
          jsonAnswer.use_tool.identifier !== ""
        ) {
          answer = await this.processTool(jsonAnswer);
        } 
        // Handle task completion
        else if (jsonAnswer.task_completed) {
          info("Task completed.");
          break;
        } 
        // Handle non-object responses
        else if (typeof jsonAnswer !== "object") {
          console.log(jsonAnswer);
          answer = await this.model.generateResponse("Please continue.");
        } 
        // Handle any other responses
        else {
          console.log(answer);
          answer = await this.model.generateResponse("Please continue.");
        }
      } catch (e: any) {
        // Handle JSON parsing errors
        debugPrefix(this.model.getModelName(), `Error parsing JSON: ${e}`);
        debugPrefix(this.model.getModelName(), answer);

        answer = await this.model.generateResponse(
          `Error parsing JSON: ${e.message}. Please provide a valid JSON response.`,
        );
      }
    }
  }
  
  /**
   * Processes a tool execution request
   * @param jsonAnswer The parsed JSON response containing the tool request
   * @returns The model's response after tool execution
   */
  private async processTool(jsonAnswer: any): Promise<string> {
    const toolIdentifier = jsonAnswer.use_tool.identifier;
    const functionName = jsonAnswer.use_tool.function_name;
    const args = jsonAnswer.use_tool.args;
    
    // Find the requested tool
    const tool = this.tools.find((t) => t.identifier === toolIdentifier);
    
    if (tool) {
      if (tool.functionMap[functionName]) {
        try {
          // Execute the tool function
          const toolResult = await tool.functionMap[functionName](...args);
          return await this.model.generateResponse(
            `Tool result: ${toolResult}`,
          );
        } catch (e) {
          return await this.model.generateResponse(`Function error: ${e}.`);
        }
      } else {
        return await this.model.generateResponse(
          `Function ${functionName} not found in tool ${tool.name}`,
        );
      }
    } else {
      return await this.model.generateResponse(
        `Tool with identifier ${toolIdentifier} not found`,
      );
    }
  }
}