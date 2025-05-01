#!/usr/bin/env deno run --allow-all

import { Agent } from "./agent/index.ts";

const webAgent = new Agent("Fred", "claude-3.5-sonnet");
await webAgent.prompt(
  `My project home is ${Deno.cwd()}/..\nPlease look at the code contained in src/agent/index.ts and review the code base. I would like to know whether there are any design or logical issues.`,
);
