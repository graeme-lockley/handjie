#!/usr/bin/env deno run --allow-all

import { Agent } from "./agent/index.ts";
import { tools } from "./tools/index.ts";

/**
 * WebAgent - Specialized agent for web operations
 */
class WebAgent extends Agent {
  constructor(modelName: string = "qwen2.5-coder:14b") {
    super(modelName, tools);
  }

  /**
   * Provides the initial prompt for the web agent
   */
  protected getInitialPrompt(): string {
    return `My project home is ${Deno.cwd()}.  Please look at www.news24.com, pull out the top 5 headlines and save them into headlines.md.`;
  }
}

// Create and run the web agent
const webAgent = new WebAgent();
await webAgent.run();
