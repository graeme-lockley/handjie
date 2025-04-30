#!/usr/bin/env deno run --allow-net

import LLM from "./model/index.ts";
import { tools } from "./tools/index.ts";
import { systemContext } from "./agent/system-context.ts";

const DEBUG = true;

async function main() {
  const model = LLM.newModel("llama3.1:latest")!;

  console.log(`Connecting to Ollama ${model.getModelName()}...`);

  model.systemMessage(
    systemContext(tools).join("\n"),
  );

  let answer = await model.generateResponse(
    "What is the day of the month and can you add 2 to it?  For example, if the date is December 6th, 2023, the answer should be 8 after adding 2 days.",
  );

  while (true) {
    if (DEBUG) {
      console.log(`\n--- Answer from ${model.getModelName()} ---`);
      console.log(answer);
      console.log("---------------------------");
    }

    try {
      const jsonAnswer = JSON.parse(answer);
      if (jsonAnswer?.response?.message != undefined) {
        console.log(jsonAnswer.response.message);
      }

      if (
        jsonAnswer.use_tool?.identifier != undefined &&
        jsonAnswer.use_tool.identifier !== ""
      ) {
        const tool = tools.find((t) =>
          t.identifier === jsonAnswer.use_tool.identifier
        );
        if (tool) {
          const functionName = jsonAnswer.use_tool.function_name;
          const args = jsonAnswer.use_tool.args;

          if (tool.functionMap[functionName]) {
            const toolResult = await tool.functionMap[functionName](...args);
            answer = await model.generateResponse(`Tool result: ${toolResult}`);
          } else {
            console.error(
              `Function ${functionName} not found in tool ${tool.name}`,
            );
            break;
          }
        } else {
          console.error(
            `Tool with identifier ${jsonAnswer.use_tool.identifier} not found`,
          );
          break;
        }
      } else if (jsonAnswer.task_completed) {
        console.log("Task completed.");
        break;
      } else if (typeof jsonAnswer !== "object") {
        console.log(jsonAnswer);
        break;
      } else {
        console.log(answer);
        break;
      }
    } catch (e) {
      if (DEBUG) {
        console.error("Error parsing JSON:", e);
      }
      console.log(answer);
      break;
    }
  }
}

main();
