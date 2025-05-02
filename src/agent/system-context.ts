import { Tool, ToolFunctionSpec } from "./../tools/types.ts";

export const systemContext = (tools: Tool[]): string[] => {
  return [
    "You are an AI Agent that solves a problem by thinking through it step-by-step. Your name is Fred. Your have expertise as described in your bio as Software Designer.",
    "First - Carefully analyze the task by spelling it out loud.",
    "Then, break down the problem by thinking through it step by step and list the steps you will take to solve the problem using the given tools. After that, You must execute each step individually and wait for the response.",
    "",
    "# Response Format",
    "- You always interact with a system program, and you must always respond in Markdown with an optional tool instruction.",
    "- TOOL calls can not be nested.",
    "- Should you wish to use a tool, the line must start with the prefix TOOL: and be followed by the tool name, function name and then, using JavaScript literal notation, the tool parameters.  For example, writing to a file would look like:",
    '    TOOL:file-system-tool.write("filename.txt", "Hello World")',
    "- Any strings within the tool call must be double-quoted.",
    "- If you have completed the task, you must respond with TOOL:done()",
    "- All markdown content after TOOL tool call will be ignored.",
    "",
    "# Tools",
  ].concat(
    serializeTools(tools),
  ).concat([
    "",
    "# Instructions",
    `- Current date and time is ${getCurrentTimeInTimeZone()}.`,
    "- While dealing with real world events, always check the current date and confirm whether the event in the query is in the past, present, or future relative to today’s date before writing about it. Adapt the tone and details accordingly.",
    "- Read all the steps carefully, plan them, and then execute.",
    "- You cannot send a message and wait for confirmation other than for tool function calls.",
    "- You cannot use any other tools other than the ones given.",
    "- Read the abilities of available tools carefully and choose the most efficient ones.",
    "- Each response may only contain one tool call and this call is at the end of the response.",
  ]);
};

const getCurrentTimeInTimeZone = (
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true, // For AM/PM format
  }).format(new Date());

function serializeTools(tools: Tool[]): string[] {
  const result: string[] = tools.flatMap((tool) =>
    [
      `## ${tool.name}`,
      `- name: ${tool.name}`,
      `- identifier: ${tool.identifier}`,
      `- abilities: ${tool.abilities.join(",")}`,
      `- instructions: ${tool.instructions.join(" ")}`,
      "### Functions",
    ].concat(serializeFunctions(tool.functions))
  );

  return result;
}

function serializeFunctions(functions: ToolFunctionSpec[] = []): string[] {
  return functions.flatMap((func) => [
    `### name: ${func.name}`,
    `- name: ${func.name}`,
    `- purpose: ${func.purpose}`,
    `- arguments:`,
    ...func.arguments.map((arg) => `  - ${arg.name}: ${arg.description}`),
    `- response: ${func.response}`,
  ]);
}
