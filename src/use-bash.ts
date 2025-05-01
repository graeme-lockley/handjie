#!/usr/bin/env deno run --allow-all

import { Agent } from "./agent/index.ts";

const bashAgent = new Agent("Fred", "claude-3.5-sonnet");
await bashAgent.prompt(`My project home is ${Deno.cwd()}.  Can you look at all the files in my project and tell me how many typescript files there are?`);
