#!/usr/bin/env deno run --allow-all

import { Agent } from "./agent/index.ts";

/**
 * BashAgent - Specialized agent for bash operations
 */
class BashAgent extends Agent {
  constructor(modelName: string = "claude-3.5-sonnet") {
    super("Fred", modelName);
  }

  /**
   * Provides the initial prompt for the bash agent
   */
  protected getInitialPrompt(): string {
    return `My project home is ${Deno.cwd()}.  Can you look at all the files in my project and tell me how many typescript files there are?`;
  }
}

// Create and run the bash agent
const bashAgent = new BashAgent();
await bashAgent.run();
