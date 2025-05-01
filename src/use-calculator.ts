#!/usr/bin/env deno run --allow-net --allow-env

import { Agent } from "./agent/index.ts";
import { tools } from "./tools/index.ts";

/**
 * CalculatorAgent - Specialized agent for calculation operations
 */
class CalculatorAgent extends Agent {
  constructor(modelName: string = "claude-3.5-sonnet") {
    super(modelName, tools);
  }

  /**
   * Provides the initial prompt for the calculator agent
   */
  protected getInitialPrompt(): string {
    return "What is the day of the month and can you add 42 to it?  For example, if the date is December 6th, 2023, the answer should be 8 after adding 2 days.";
  }
}

// Create and run the calculator agent
const calculatorAgent = new CalculatorAgent();
await calculatorAgent.run();
