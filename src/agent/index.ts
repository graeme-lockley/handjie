import * as LLM from "../model/index.ts";
import * as Tools from "../tools/index.ts";
import { systemContext } from "./system-context.ts";
import { debugPrefix, info, response } from "../lib/cli.ts";
import { type AgentCall, type FunctionCall, type ResponseMessage, ResponseParser } from "./response-parser.ts";
import { Context, type ToolResponse, type ToolResponses } from "../model/types.ts";
import { PromptScheduler } from "./scheduler.ts";

export interface AgentConfig {
  name: string;
  bio: string;
  skills: string[];
  aware_of?: string[];
  modelName?: string;
}

export interface PromptQueueItem {
  agent: Agent;
  prompt: string | ToolResponses;
  sourceAgent: Agent | undefined;
  correlationId: string | undefined;
}

export interface AgentResponse {
  content: string;
  sourceAgent: Agent;
  correlationId: string;
}

export class Agent {
  public name: string;
  public bio: string;
  public skills: string[];
  public model: LLM.Model;
  public tools: Tools.Tool[];
  public awareOf: string[] = [];
  private scheduler: PromptScheduler;

  /**
   * Constructor to initialize an agent with a model and tools
   * @param name The agent's name
   * @param bio The agent's biography/description
   * @param skills The agent's skills
   * @param modelName The name of the model to use
   * @param tools Array of tools the agent can use
   * @param awareOf Names of other agents this agent is aware of
   */
  constructor(
    name: string,
    bio: string,
    skills: string[],
    modelName: string,
    tools: Tools.Tool[] | undefined = undefined,
    awareOf: string[] = [],
    scheduler: PromptScheduler,
  ) {
    this.name = name;
    this.bio = bio;
    this.skills = skills;
    this.awareOf = awareOf;
    const model = LLM.newModel(modelName);
    if (!model) {
      throw new Error(`Model "${modelName}" not found. Please check the model name and try again.`);
    }
    this.model = model;
    this.tools = tools || Tools.tools;

    this.scheduler = scheduler;

    // Set up the system context for the model
    this.model.systemMessage(systemContext(this));
  }

  /**
   * Handles a prompt from the scheduler or directly from the user
   * This is used by the scheduler to process prompts from the queue
   *
   * @param prompt The prompt to process
   * @param correlationId An identifier for tracking this prompt
   * @param sourceAgent The agent that sent this prompt (if applicable)
   */
  public async handlePrompt(
    prompt: string | ToolResponses,
    correlationId: string | undefined,
    sourceAgent: Agent | undefined,
  ): Promise<void> {
    if (correlationId && sourceAgent) {
      await this.processPromptWithResult(
        `Prompt from agent ${sourceAgent.name} with correlation ${correlationId}.  Please respond directly to the agent with AGENT:${correlationId}:${sourceAgent.name}(...message...) when you have completed the task.  You may ask the agent clarifying questions.\n\n${prompt}`,
      );
    } else {
      await this.processPromptWithResult(prompt);
    }
  }

  /**
   * Process a prompt and return the result without displaying in console
   * Used by the scheduler for agent-to-agent communication
   */
  private async processPromptWithResult(prompt: string | ToolResponses): Promise<void> {
    const answer = await this.generateResponse(prompt);

    try {
      // Parse the response
      const parser = new ResponseParser(answer);
      const responseMessage: ResponseMessage = parser.parse();

      response(this.name, responseMessage.content);

      // Handle tool calls
      if (responseMessage.function_calls) {
        await this.processTools(responseMessage.function_calls);
      }

      // Handle agent calls
      if (responseMessage.agent_calls && this.scheduler) {
        this.processAgentCalls(responseMessage.agent_calls);
      }
    } catch (e: unknown) {
      // Log error
      debugPrefix(this.model.getModelName(), `Error in processPromptWithResult: ${e}`);
    }
  }

  public prompt(prompt: string): void {
    this.scheduler.schedulePrompt(this, prompt);
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
      this.model.systemMessage(systemContext(this));
      info(`Context cleared for ${this.name}`);
    } else {
      info(`Model ${this.model.getModelName()} does not support context clearing`);
    }
  }

  private async generateResponse(prompt: string | ToolResponses): Promise<string> {
    debugPrefix(this.model.getModelName() + " prompt", prompt);
    const answer = await this.model.generateResponse(prompt);
    debugPrefix(this.model.getModelName() + " response", answer);

    return answer;
  }

  private async processTools(toolUsages: FunctionCall[]): Promise<void> {
    const results: ToolResponse[] = [];

    for (const toolUsage of toolUsages) {
      const result = await this.processTool(toolUsage);
      results.push(result);
    }

    this.scheduler?.schedulePrompt(this, { type: "tool_responses", responses: results });
  }

  /**
   * Processes a tool execution request
   * @param toolUsage The tool usage information
   * @returns The model's response after tool execution
   */
  private async processTool(toolUsage: FunctionCall): Promise<ToolResponse> {
    const toolIdentifier = toolUsage.tool;
    const functionName = toolUsage.function;
    const args = toolUsage.args;

    // Find the requested tool
    const tool = this.tools.find((t) => t.identifier === toolIdentifier);

    if (tool) {
      if (tool.functionMap[functionName]) {
        try {
          const toolResult = await tool.functionMap[functionName](...args.map((arg) => eval(arg)));
          return { correlationId: toolUsage.correlationId, success: true, content: toolResult };
        } catch (e) {
          return { correlationId: toolUsage.correlationId, success: false, content: `Function error: ${e instanceof Error ? e.message : String(e)}` };
        }
      } else {
        return { correlationId: toolUsage.correlationId, success: false, content: `Function ${functionName} not found in tool ${tool.name}` };
      }
    } else {
      return { correlationId: toolUsage.correlationId, success: false, content: `Tool with identifier ${toolIdentifier} not found` };
    }
  }

  /**
   * Process agent calls by sending prompts to other agents
   */
  private processAgentCalls(agentCalls: AgentCall[]): void {
    for (const agentCall of agentCalls) {
      this.scheduler.schedulePrompt(
        agentCall.name,
        agentCall.message,
        agentCall.correlationId,
        this,
      );
    }
  }
}
