#!/usr/bin/env deno run --allow-all

import { Agent } from "./agent/index.ts";

const webAgent = new Agent("Fred", "llama3.1:latest");
await webAgent.prompt(`My project home is ${Deno.cwd()}.  Please look at www.news24.com, pull out the top 5 headlines and save them into headlines.md.`);
