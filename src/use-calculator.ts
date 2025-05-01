#!/usr/bin/env deno run --allow-net --allow-env

import LLM from "./model/index.ts";
import { tools } from "./tools/index.ts";
import { systemContext } from "./agent/system-context.ts";
import { debugPrefix, info } from "./lib/cli.ts";

const DEBUG = true;

async function main() {
  const model = LLM.newModel("claude-3.5-sonnet")!;

  model.systemMessage(
    systemContext(tools).join("\n"),
  );

  let answer = await model.generateResponse(
    "What is the day of the month and can you add 42 to it?  For example, if the date is December 6th, 2023, the answer should be 8 after adding 2 days.",
  );

  while (true) {
    if (DEBUG) {
      answer.split("\n").forEach((line) => {
        debugPrefix(model.getModelName(), line);
      });
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
            try {
              const toolResult = await tool.functionMap[functionName](...args);
              answer = await model.generateResponse(
                `Tool result: ${toolResult}`,
              );
            } catch (e) {
              answer = await model.generateResponse(`Function error: ${e}.`);
            }
          } else {
            answer = await model.generateResponse(
              `Function ${functionName} not found in tool ${tool.name}`,
            );
          }
        } else {
          answer = await model.generateResponse(
            `Tool with identifier ${jsonAnswer.use_tool.identifier} not found`,
          );
        }
      } else if (jsonAnswer.task_completed) {
        info("Task completed.");
        break;
      } else if (typeof jsonAnswer !== "object") {
        console.log(jsonAnswer);
        answer = await model.generateResponse("Please continue.");
      } else {
        console.log(answer);
        answer = await model.generateResponse("Please continue.");
      }
    } catch (e) {
      if (DEBUG) {
        console.error("Error parsing JSON:", e);
      }
      answer = await model.generateResponse(
        `Error parsing JSON: ${e.message}. Please provide a valid JSON response.`,
      );
    }
  }
}

main();
