#!/usr/bin/env deno run --allow-all

import { Agent } from "./agent/index.ts";

/**
 * WebAgent - Specialized agent for web operations
 */
class CodeReview extends Agent {
  constructor(modelName: string = "claude-3.5-sonnet") {
    super("Fred", modelName);
  }

  /**
   * Provides the initial prompt for the web agent
   */
  protected getInitialPrompt(): string {
    return `My project home is ${Deno.cwd()}/..\nPlease refactor ./src/agent/index.ts by replacing the method "getInitialPrompt" when a single "prompt" method.  Update all of the use-*.ts files to use this.`;
  }
}

// Create and run the web agent
const webAgent = new CodeReview();
await webAgent.run();
