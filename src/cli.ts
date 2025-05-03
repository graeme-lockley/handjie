#!/usr/bin/env deno run --allow-all

import { Agent } from "./agent/index.ts";
import { info } from "./lib/cli.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";

// Command-line interface for the agent
class AgentCLI {
  private agent: Agent;
  private history: string[] = [];
  private historyIndex = 0;
  private historyFile: string;
  private contextFile: string;
  private currentAbortController: AbortController | null = null;
  private readonly MAX_HISTORY = 1000;
  private currentInput = "";
  private cursorPos = 0;

  constructor(agentName: string, modelName: string) {
    this.agent = new Agent(
      agentName,
      "Software Engineering",
      ["TypeScript developer", "Software tester", "DevOps engineer", "Test Driven Development", "Deno"],
      modelName,
    );
    const configDir = `${Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "."}/.h3`;

    // Create config directory if it doesn't exist
    try {
      Deno.mkdirSync(configDir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.AlreadyExists)) {
        if (e instanceof Error) {
          console.error(`Error creating config directory: ${e.message}`);
        } else {
          console.error("Error creating config directory:", e);
        }
      }
    }

    this.historyFile = `${configDir}/history`;
    this.contextFile = `${configDir}/context.json`;
    this.loadHistory();
    this.loadContext();
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
  private async loadContext(): Promise<void> {
    await this.agent.loadContext(this.contextFile);
  }

  /**
   * Save agent context to file
   */
  private async saveContext(): Promise<void> {
    await this.agent.saveContext(this.contextFile);
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

    if (trimmedInput === "/clear") {
      this.agent.clearContext();
      return true;
    }

    if (trimmedInput === "/help") {
      info("Available commands:");
      info("  /clear - Clear the agent's conversation context");
      info("  /help  - Show this help message");
      info("  exit   - Exit the application");
      info("  quit   - Exit the application");
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
      await this.saveContext();
      return false; // Exit the REPL loop
    }

    // Process special commands
    if (input.startsWith("/")) {
      if (this.processSpecialCommands(input)) {
        return true; // Continue the REPL loop after handling special command
      }
    }

    await this.saveToHistory(input);

    // Create a new AbortController for this prompt
    this.currentAbortController = new AbortController();

    // Store the original generateResponse method
    const originalGenerateResponse = this.agent["generateResponse"].bind(this.agent);

    try {
      // Patch the agent's generateResponse method to be abortable
      this.agent["generateResponse"] = async (prompt: string) => {
        if (this.currentAbortController?.signal.aborted) {
          throw new Error("Operation aborted");
        }
        return await originalGenerateResponse(prompt);
      };

      // Process the prompt
      await this.agent.prompt(input);
    } catch (e) {
      if (e instanceof Error && e.message === "Operation aborted") {
        info("Operation aborted by user");
      } else {
        console.error("Error processing prompt:", e);
      }
    } finally {
      // Always restore the original method, regardless of success or failure
      this.agent["generateResponse"] = originalGenerateResponse;
      this.currentAbortController = null;
    }

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
    Deno.stdout.writeSync(new TextEncoder().encode("> " + this.currentInput));
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

    console.log(`🤖 H3 Agent CLI - Type '/help' for commands or 'exit' to end session`);

    let continueLoop = true;

    while (continueLoop) {
      const input = await this.readLineWithHistory();
      continueLoop = await this.handleUserInput(input);
    }

    // Save context before exiting
    await this.saveContext();

    // Clean up signal handler
    Deno.removeSignalListener("SIGINT", this.handleInterrupt);
    console.log("Goodbye! 👋");
  }
}

// Parse command line arguments
const args = parse(Deno.args, {
  string: ["name", "model"],
  default: { name: "Assistant", model: "claude-3.5-sonnet" },
  alias: { n: "name", m: "model" },
});

// Start the CLI
const cli = new AgentCLI(args.name, args.model);
await cli.start();
