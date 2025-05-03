import { Agent, type PromptQueueItem } from "./index.ts";
import { debugPrefix, info } from "../lib/cli.ts";
import { ToolResponses } from "../model/index.ts";

/**
 * PromptScheduler manages a FIFO queue of prompts for different agents
 * This enables agent-to-agent communication and ensures orderly processing of prompts
 */
export class PromptScheduler {
  private promptQueue: PromptQueueItem[] = [];
  private agentRegistry: Map<string, Agent> = new Map();

  /**
   * Register an agent with the scheduler so it can receive prompts
   */
  public registerAgent(agent: Agent): void {
    this.agentRegistry.set(agent.name, agent);
    debugPrefix("Scheduler", `Registered agent: ${agent.name}`);
  }

  /**
   * Schedule a prompt to be processed by a specific agent
   *
   * @param agentName - Name of the agent to receive the prompt
   * @param prompt - The message to send
   * @param correlationId - ID to track this prompt through the system
   * @param sourceAgent - The agent that sent this prompt (if applicable)
   * @param responseHandler - Optional callback for handling the response
   */
  public schedulePrompt(
    agent: Agent | string,
    prompt: string | ToolResponses,
    correlationId: string | undefined = undefined,
    sourceAgent: Agent | undefined = undefined,
  ): void {
    if (typeof agent === "string") {
      // If agent is a string, find the agent by name
      const foundAgent = this.agentRegistry.get(agent);
      if (!foundAgent) {
        info(`Agent not found: ${agent}`);
        if (sourceAgent != undefined) {
          this.schedulePrompt(sourceAgent, `Agent not found: ${agent}, correlationId: ${correlationId}`, correlationId);
        }
      } else {
        this.promptQueue.push({ agent: foundAgent, prompt, sourceAgent, correlationId });
        info(`Scheduled prompt for agent ${foundAgent.name}${sourceAgent ? ` from ${sourceAgent}` : ""}`);
      }
    } else {
      // Add prompt to queue
      this.promptQueue.push({ agent, prompt, sourceAgent, correlationId });
      info(`Scheduled prompt for agent ${agent.name}${sourceAgent ? ` from ${sourceAgent}` : ""}`);
    }
  }

  /**
   * Process the prompt queue in FIFO order
   * This is the main loop that handles all agent interactions
   */
  public async processQueue(): Promise<void> {
    while (this.promptQueue.length > 0) {
      // Get the next prompt from the queue
      const nextPrompt = this.promptQueue.shift()!;

      try {
        info(`Processing prompt for agent ${nextPrompt.agent.name}`);

        // Process the prompt with the target agent
        await nextPrompt.agent.handlePrompt(nextPrompt.prompt, nextPrompt.correlationId, nextPrompt.sourceAgent);
      } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);

        info(`Error processing prompt for agent ${nextPrompt.agent.name}: ${errorMessage}`);
        this.schedulePrompt(nextPrompt.agent, `Error processing prompt: ${errorMessage}`, nextPrompt.correlationId, nextPrompt.sourceAgent);
      }
    }
  }

  /**
   * Find an agent by name
   */
  public getAgent(name: string): Agent | undefined {
    return this.agentRegistry.get(name);
  }

  /**
   * Get all registered agents
   */
  public getAgents(): Agent[] {
    return Array.from(this.agentRegistry.values());
  }
}
