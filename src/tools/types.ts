export type ToolFunctionArg = {
  name: string;
  description: string;
  dataType: string;
};

export type ToolFunctionSpec = {
  name: string;
  purpose: string;
  arguments: ToolFunctionArg[];
  response: string;
};

export abstract class Tool {
  abstract name: string;
  abstract identifier: string;
  abstract abilities: string[];
  abstract instructions: string[];
  abstract functions: ToolFunctionSpec[];

  abstract functionMap: FunctionMap;
}

export type FunctionMap = { [key: string]: (...args: unknown[]) => Promise<string> | string };
