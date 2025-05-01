import { bash } from "./bash.ts";
import { calculator } from "./calculator.ts";
import { command } from "./command.ts";
import { filesystem } from "./filesystem.ts";
import { web } from "./web.ts";

export { Tool, type ToolFunctionArg, type ToolFunctionSpec } from "./types.ts";

export const tools = [
  bash,
  calculator,
  command,
  filesystem,
  web,
];
