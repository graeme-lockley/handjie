#!/usr/bin/env deno run --allow-all

import LLM from "./model/index.ts";
import { tools } from "./tools/index.ts";
import { systemContext } from "./agent/system-context.ts";
import { debugPrefix, info } from "./lib/cli.ts";

async function main() {
  // const model = LLM.newModel("claude-3.5-sonnet")!;
  // const model = LLM.newModel("llama3.1:latest")!;
  const model = LLM.newModel("qwen2.5-coder:14b")!;

  model.systemMessage(
    systemContext(tools).join("\n"),
  );

  let answer = await model.generateResponse(
    `My project home is ${Deno.cwd()}.  Please look at www.news24.com, pull out the top 5 headlines and save them into headlines.md.`,
    // "Please list all the files in my project home ~/Projects/h3 and include when they were last updated.",
  );

  while (true) {
    debugPrefix(model.getModelName(), answer);

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
      debugPrefix(model.getModelName(), `Error parsing JSON: ${e}`);
      debugPrefix(model.getModelName(), answer);

      answer = await model.generateResponse(
        `Error parsing JSON: ${e.message}. Please provide a valid JSON response.`,
      );
    }
  }
}

main();
