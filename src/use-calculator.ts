#!/usr/bin/env deno run --allow-net --allow-env

import { Agent } from "./agent/index.ts";

const calculatorAgent = new Agent("Fred", "claude-3.5-sonnet");
await calculatorAgent.prompt(
  "What is the day of the month and can you add 42 to it?  For example, if the date is December 6th, 2023, the answer should be 8 after adding 2 days.",
);
