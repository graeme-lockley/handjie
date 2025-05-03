#!/usr/bin/env deno run --allow-all

import { Agent } from "./agent/index.ts";
import { PromptScheduler } from "./agent/scheduler.ts";
import { loadAgentsConfig } from "./config/agents.ts";
import { debugPrefix, info } from "./lib/cli.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";

const DEFAULT_MODEL = "claude-3.5-sonnet"; // Default model name

// Command-line interface for the agent system
class AgentCLI {
  private primaryAgent: Agent;
  private scheduler: PromptScheduler;
  private agents: Map<string, Agent> = new Map();
  private history: string[] = [];
  private historyIndex = 0;
  private historyFile: string;
  private contextDir: string;
  private currentAbortController: AbortController | null = null;
  private readonly MAX_HISTORY = 1000;
  private currentInput = "";
  private cursorPos = 0;
  private promptInProgress = false;
  private configuredPrimaryAgentName?: string;
  private configuredModelName?: string;

  constructor(primaryAgentName?: string, modelName?: string) {
    // Store the agent name and model name to use when initializing
    this.configuredPrimaryAgentName = primaryAgentName;
    this.configuredModelName = modelName;

    // Set up directories for storing context and history
    const configDir = `${Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "."}/.h3`;
    this.contextDir = `${configDir}/context`;

    // Create config directories if they don't exist
    try {
      Deno.mkdirSync(configDir, { recursive: true });
      Deno.mkdirSync(this.contextDir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) {
        console.error(`Error creating config directories: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    this.historyFile = `${configDir}/history`;

    // Create the scheduler - central coordination point
    this.scheduler = new PromptScheduler();

    // We'll initialize agents in loadAgents, which will be awaited before any interaction
    this.primaryAgent = null as unknown as Agent; // Will be set in loadAgents
  }

  /**
   * Initialize agents from configuration
   * This needs to be called before any agent interaction
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadAgents(this.configuredPrimaryAgentName, this.configuredModelName);
      await this.loadHistory();

      // Make sure we have a valid primary agent
      if (!this.primaryAgent) {
        // Create a fallback agent if loading from config failed
        this.primaryAgent = new Agent(
          "Assistant",
          "A helpful AI assistant.",
          ["answering questions", "providing information", "helping with tasks"],
          DEFAULT_MODEL,
          undefined,
          [],
          this.scheduler,
        );
        this.agents.set(this.primaryAgent.name, this.primaryAgent);
        info("Using fallback agent as primary agent due to configuration issues");
      }
    } catch (error) {
      console.error(`Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
      // Create a fallback agent if loading failed completely
      this.primaryAgent = new Agent(
        "Assistant",
        "A helpful AI assistant.",
        ["answering questions", "providing information", "helping with tasks"],
        DEFAULT_MODEL,
        undefined,
        [],
        this.scheduler,
      );
      this.agents.set(this.primaryAgent.name, this.primaryAgent);
      info("Using fallback agent due to initialization errors");
    }
  }

  /**
   * Load agents from the configuration file
   */
  private async loadAgents(primaryAgentName?: string, modelName?: string): Promise<void> {
    try {
      const agentConfigs = await loadAgentsConfig();

      // Default model name to use if not specified
      const defaultModel = modelName || DEFAULT_MODEL;

      if (agentConfigs.length === 0) {
        // No agents found in configuration, create default agent
        info("No agents found in agents.yaml, creating default agent");
        this.primaryAgent = new Agent(
          primaryAgentName || "Assistant",
          "A helpful AI assistant.",
          ["answering questions", "providing information", "helping with tasks"],
          defaultModel,
          undefined,
          [],
          this.scheduler,
        );
        this.agents.set(this.primaryAgent.name, this.primaryAgent);
        return;
      }

      // Use the first agent from the config as primary agent, or the one specified by name
      const primaryConfig = primaryAgentName ? agentConfigs.find((a) => a.name === primaryAgentName) || agentConfigs[0] : agentConfigs[0];

      // Create the primary agent - use either the config's model name, the provided model name,
      // or fallback to a default model
      const primaryModelName = primaryConfig.modelName || defaultModel;

      try {
        this.primaryAgent = new Agent(
          primaryConfig.name,
          primaryConfig.bio,
          primaryConfig.skills,
          primaryModelName,
          undefined, // Use default tools
          primaryConfig.aware_of || [],
          this.scheduler,
        );

        // Add the primary agent to the agents map
        this.agents.set(this.primaryAgent.name, this.primaryAgent);

        // Load primary agent's context if available
        await this.loadAgentContext(this.primaryAgent.name);

        info(`Using ${this.primaryAgent.name} as primary agent with model ${primaryModelName}`);
      } catch (error) {
        throw new Error(`Failed to initialize primary agent: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Create and load the rest of the agents from config
      for (const config of agentConfigs) {
        // Skip if this agent is already the primary agent
        if (config.name === this.primaryAgent.name) {
          continue;
        }

        try {
          // Create a new agent from the config
          const agentModelName = config.modelName || defaultModel;
          const agent = new Agent(
            config.name,
            config.bio,
            config.skills,
            agentModelName,
            undefined, // Use default tools
            config.aware_of || [],
            this.scheduler,
          );

          // Add to the agents map
          this.agents.set(agent.name, agent);

          // Load agent's context if available
          await this.loadAgentContext(agent.name);

          info(`Loaded agent: ${config.name} with model ${agentModelName}`);
        } catch (e) {
          // Log error but continue with other agents
          info(`Error loading agent ${config.name}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      debugPrefix("CLI", `Loaded ${this.agents.size} agents in total (including primary)`);
    } catch (e) {
      info(`Error loading agents: ${e instanceof Error ? e.message : String(e)}`);
      throw e; // Re-throw to handle in initialize()
    }
  }

  /**
   * Load command history from file
   */
  private async loadHistory(): Promise<void> {
    try {
      const historyContent = await Deno.readTextFile(this.historyFile);
      this.history = historyContent.split("\n").filter((line) => line.trim() !== "");
      this.historyIndex = this.history.length;
    } catch (e) {
      // If file doesn't exist, create an empty history file
      if (e instanceof Deno.errors.NotFound) {
        await Deno.writeTextFile(this.historyFile, "");
      } else {
        console.error("Error loading history:", e);
      }
    }
  }

  /**
   * Load agent context from file
   */
  private async loadAgentContext(agentName: string): Promise<void> {
    const contextFile = `${this.contextDir}/${agentName.toLowerCase()}.json`;
    const agent = this.agents.get(agentName);

    if (agent) {
      await agent.loadContext(contextFile);
    } else {
      info(`Agent ${agentName} not found, can't load context`);
    }
  }

  /**
   * Save agent context to file
   */
  private async saveAgentContext(agentName: string): Promise<void> {
    const contextFile = `${this.contextDir}/${agentName.toLowerCase()}.json`;
    const agent = this.agents.get(agentName);

    if (agent) {
      await agent.saveContext(contextFile);
    } else {
      info(`Agent ${agentName} not found, can't save context`);
    }
  }

  /**
   * Save all agent contexts
   */
  private async saveAllContexts(): Promise<void> {
    const promises = Array.from(this.agents.keys()).map((name) => this.saveAgentContext(name));
    await Promise.all(promises);
    info("All agent contexts saved");
  }

  /**
   * Save command to history file
   */
  private async saveToHistory(command: string): Promise<void> {
    if (command.trim() === "" || (this.history.length > 0 && command === this.history[this.history.length - 1])) {
      return; // Don't save empty commands or duplicates of the last command
    }

    this.history.push(command);

    // Truncate history if it exceeds MAX_HISTORY
    if (this.history.length > this.MAX_HISTORY) {
      this.history = this.history.slice(this.history.length - this.MAX_HISTORY);
    }

    this.historyIndex = this.history.length;

    try {
      await Deno.writeTextFile(this.historyFile, this.history.join("\n") + "\n");
    } catch (e) {
      console.error("Error saving to history:", e);
    }
  }

  /**
   * Process command for special commands like /clear
   * @returns true if the command was handled as a special command
   */
  private processSpecialCommands(input: string): boolean {
    const trimmedInput = input.trim();
    const parts = trimmedInput.split(" ");
    const command = parts[0];

    if (command === "/clear") {
      // Clear context for all agents or a specific agent
      if (parts.length > 1) {
        const agentName = parts[1];
        const agent = this.agents.get(agentName);
        if (agent) {
          agent.clearContext();
        } else {
          info(`Agent ${agentName} not found`);
        }
      } else {
        // Clear all agents if no specific agent mentioned
        for (const agent of this.agents.values()) {
          agent.clearContext();
        }
      }
      return true;
    }

    if (command === "/agents") {
      // List all available agents
      info("Available agents:");
      for (const [name, agent] of this.agents.entries()) {
        info(`  ${name} - ${agent.bio}`);
      }
      return true;
    }

    if (command === "/use") {
      // Change the primary agent
      if (parts.length > 1) {
        const agentName = parts[1];
        const agent = this.agents.get(agentName);
        if (agent) {
          this.primaryAgent = agent;
          info(`Now using ${agentName} as the primary agent`);
        } else {
          info(`Agent ${agentName} not found`);
        }
      } else {
        info("Current primary agent: " + this.primaryAgent.name);
      }
      return true;
    }

    if (command === "/help") {
      info("Available commands:");
      info("  /clear [agent] - Clear conversation context (for all agents or a specific one)");
      info("  /agents        - List all available agents");
      info("  /use [agent]   - Change the primary agent");
      info("  /help          - Show this help message");
      info("  exit           - Exit the application");
      info("  quit           - Exit the application");
      return true;
    }

    return false;
  }

  /**
   * Handle user input
   */
  private handleUserInput = async (input: string): Promise<boolean> => {
    input = input.trim();

    if (input === "") {
      return true; // Continue the REPL loop
    }

    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      await this.saveAllContexts();
      return false; // Exit the REPL loop
    }

    // Process special commands
    if (input.startsWith("/")) {
      if (this.processSpecialCommands(input)) {
        return true; // Continue the REPL loop after handling special command
      }
    }

    await this.saveToHistory(input);

    this.primaryAgent.prompt(input);

    await this.scheduler.processQueue();

    return true; // Continue the REPL loop
  };

  /**
   * Handle Ctrl+C interruption
   */
  private handleInterrupt = (): void => {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    // We'll let the process continue and return to the prompt
  };

  /**
   * Render the current input line
   */
  private renderInput(): void {
    // Clear the current line
    Deno.stdout.writeSync(new TextEncoder().encode("\r\x1b[K"));
    // Render the prompt and current input
    Deno.stdout.writeSync(new TextEncoder().encode(`${this.primaryAgent.name}> ${this.currentInput}`));
    // Position the cursor
    if (this.cursorPos < this.currentInput.length) {
      Deno.stdout.writeSync(new TextEncoder().encode(`\x1b[${this.currentInput.length - this.cursorPos}D`));
    }
  }

  /**
   * Process key presses including special keys like arrows
   */
  private processKeypress(buffer: Uint8Array): string | null {
    // Convert buffer to array of bytes
    const bytes = Array.from(buffer);

    // Handle special key sequences
    if (bytes[0] === 27 && bytes[1] === 91) { // ESC [ sequence (arrow keys)
      if (bytes[2] === 65) { // Up arrow
        if (this.historyIndex > 0) {
          this.historyIndex--;
          this.currentInput = this.history[this.historyIndex];
          this.cursorPos = this.currentInput.length;
        }
        this.renderInput();
        return null;
      } else if (bytes[2] === 66) { // Down arrow
        if (this.historyIndex < this.history.length) {
          this.historyIndex++;
          this.currentInput = this.historyIndex === this.history.length ? "" : this.history[this.historyIndex];
          this.cursorPos = this.currentInput.length;
        }
        this.renderInput();
        return null;
      } else if (bytes[2] === 67) { // Right arrow
        if (this.cursorPos < this.currentInput.length) {
          this.cursorPos++;
          this.renderInput();
        }
        return null;
      } else if (bytes[2] === 68) { // Left arrow
        if (this.cursorPos > 0) {
          this.cursorPos--;
          this.renderInput();
        }
        return null;
      } else if (bytes[2] === 51 && bytes[3] === 126) { // Delete key
        if (this.cursorPos < this.currentInput.length) {
          this.currentInput = this.currentInput.substring(0, this.cursorPos) +
            this.currentInput.substring(this.cursorPos + 1);
          this.renderInput();
        }
        return null;
      }
    } else if (bytes[0] === 127 || bytes[0] === 8) { // Backspace
      if (this.cursorPos > 0) {
        this.currentInput = this.currentInput.substring(0, this.cursorPos - 1) +
          this.currentInput.substring(this.cursorPos);
        this.cursorPos--;
        this.renderInput();
      }
      return null;
    } else if (bytes[0] === 13) { // Enter
      Deno.stdout.writeSync(new TextEncoder().encode("\n"));
      const input = this.currentInput;
      this.currentInput = "";
      this.cursorPos = 0;
      return input;
    } else if (bytes[0] === 3) { // Ctrl+C
      this.handleInterrupt();
      Deno.stdout.writeSync(new TextEncoder().encode("\n"));
      this.currentInput = "";
      this.cursorPos = 0;
      this.renderInput();
      return null;
    } else if (bytes[0] === 4) { // Ctrl+D (EOF)
      if (this.currentInput === "") {
        return "exit"; // Treat as exit command if line is empty
      }
      return null;
    } else if (bytes[0] >= 32 && bytes[0] < 127) { // Printable characters
      const char = new TextDecoder().decode(buffer.slice(0, 1));
      this.currentInput = this.currentInput.substring(0, this.cursorPos) +
        char +
        this.currentInput.substring(this.cursorPos);
      this.cursorPos++;
      this.renderInput();
      return null;
    }

    return null;
  }

  /**
   * Read a line of input with history support
   */
  private async readLineWithHistory(): Promise<string> {
    // Wait for any in-progress prompts to complete before accepting new input
    if (this.promptInProgress) {
      info("Waiting for current prompt to complete...");
      while (this.promptInProgress) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Set terminal to raw mode
    Deno.stdin.setRaw(true);

    try {
      this.currentInput = "";
      this.cursorPos = 0;
      this.renderInput();

      const buffer = new Uint8Array(8);

      while (true) {
        const n = await Deno.stdin.read(buffer);
        if (n === null) break; // EOF

        const result = await this.processKeypress(buffer.slice(0, n));
        if (result !== null) {
          return result;
        }
      }

      return "exit"; // Return exit if we reach EOF
    } finally {
      // Reset terminal to cooked mode
      Deno.stdin.setRaw(false);
    }
  }

  /**
   * Start the CLI REPL loop
   */
  public async start(): Promise<void> {
    // Set up Ctrl+C handler
    Deno.addSignalListener("SIGINT", this.handleInterrupt);

    console.log(`🤖 H3 Multi-Agent CLI - Using ${this.primaryAgent.name} as primary agent`);
    console.log(`Type '/help' for commands, '/agents' to list available agents, or 'exit' to end session`);

    let continueLoop = true;

    while (continueLoop) {
      const input = await this.readLineWithHistory();
      continueLoop = await this.handleUserInput(input);
    }

    // Save context before exiting
    await this.saveAllContexts();

    // Clean up signal handler
    Deno.removeSignalListener("SIGINT", this.handleInterrupt);
    console.log("Goodbye! 👋");
  }
}

// Parse command line arguments
const args = parse(Deno.args, {
  string: ["name", "model"],
  default: { name: undefined, model: DEFAULT_MODEL },
  alias: { n: "name", m: "model" },
});

// Start the CLI
const cli = new AgentCLI(args.name, args.model);
await cli.initialize();
await cli.start();
