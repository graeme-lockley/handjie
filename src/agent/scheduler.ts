import { Agent, type PromptQueueItem } from "./index.ts";
import { debugPrefix, failSpinner, info, startSpinner, stopSpinner } from "../lib/cli.ts";
import { ToolResponses } from "../model/index.ts";
import chalk from "npm:chalk";

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
      }
    } else {
      // Add prompt to queue
      this.promptQueue.push({ agent, prompt, sourceAgent, correlationId });
    }
  }

  /**
   * Process the prompt queue in FIFO order
   * This is the main loop that handles all agent interactions
   */
  public async processQueue(): Promise<void> {
    // Terminal width estimation (or default to 80 if can't be determined)
    const terminalWidth = Deno.isatty(Deno.stdout.rid) ? (Deno.consoleSize?.().columns || 80) : 80;
    const maxPromptLength = Math.floor(terminalWidth * 2 / 3);

    while (this.promptQueue.length > 0) {
      // Get the next prompt from the queue
      const nextPrompt = this.promptQueue.shift()!;

      try {
        // Get agent name and extract prompt text for display
        const agentName = nextPrompt.agent.name;
        const sourceInfo = nextPrompt.sourceAgent ? ` (from ${nextPrompt.sourceAgent.name})` : "";

        // Extract the first line of the prompt and limit its length
        let promptText = "";
        if (typeof nextPrompt.prompt === "string") {
          // Get first line only
          promptText = nextPrompt.prompt.split("\n")[0].trim();
          // Truncate if too long
          if (promptText.length > maxPromptLength) {
            promptText = promptText.substring(0, maxPromptLength) + "...";
          }
        } else if (nextPrompt.prompt.type === "tool_responses") {
          promptText = "Processing tool responses...";
        }

        // Format the spinner text with the agent name in light grey
        const spinnerText = `${chalk.gray.bold(agentName)}${chalk.gray(sourceInfo)}: ${chalk.gray(promptText)}`;

        // Start spinner with agent name and prompt preview
        startSpinner(spinnerText);

        // Process the prompt with the target agent
        await nextPrompt.agent.handlePrompt(nextPrompt.prompt, nextPrompt.correlationId, nextPrompt.sourceAgent);

        // Stop spinner on successful completion
        stopSpinner();
      } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : String(error);

        // Show error in spinner
        failSpinner(`Error with agent ${nextPrompt.agent.name}: ${errorMessage}`);

        // Schedule error message back to agent
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
