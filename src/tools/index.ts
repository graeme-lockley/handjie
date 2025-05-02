import { bash } from "./bash.ts";
import { command } from "./command.ts";
import { filesystem } from "./filesystem.ts";
import { web } from "./web.ts";
import { Tool } from "./types.ts";

export { Tool, type ToolFunctionArg, type ToolFunctionSpec } from "./types.ts";

export const tools: Tool[] = [
  bash,
  command,
  filesystem,
  web,
];
