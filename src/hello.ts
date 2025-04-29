#!/usr/bin/env deno run --allow-net

import LLM from "./model/index.ts";

async function main() {
  const model = LLM.newModel("llama3.1:latest")!;

  console.log(`Connecting to Ollama ${model.getModelName()}...`);

  model.systemMessage(
    "You are a helpful assistant that provides concise, accurate information.",
  );
  const answer = await model.generateResponse(
    "Where does 'hello world' come from?",
  );

  console.log(`\n--- Answer from ${model.getModelName()} ---`);
  console.log(answer);
  console.log("---------------------------");

  const followUpAnswer = await model.generateResponse(
    "When was 'hello world' first used in programming?",
  );

  console.log("\n--- Follow-up Answer ---");
  console.log(followUpAnswer);
  console.log("----------------------");
}

main();
