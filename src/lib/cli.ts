import chalk from "npm:chalk";

// Type declaration for chalk function
type ChalkFunction = (text: string) => string;

// Fix DEBUG environment variable access
const DEBUG = true || Deno.env.get("DEBUG") === "true";

export function debugging(): boolean {
  return DEBUG;
}

function toString(value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return String(value);
    }
  }

  return String(value);
}

/**
 * Helper function to format arguments with specified color
 */
function formatArgs(args: any[], color: ChalkFunction): string[] {
  return args.map((arg) => {
    if (arg === null || arg === undefined) {
      return color("");
    }
    return color(String(arg));
  });
}

export function debug(...args: any[]) {
  if (DEBUG) {
    console.log(...formatArgs(args, chalk.gray));
  }
}

export function debugPrefix(prefix: string, message: any) {
  if (DEBUG) {
    toString(message).split("\n").forEach((line) => {
      console.log(chalk.gray(prefix), line);
    });
  }
}

export function info(...args: any[]) {
  console.log(...formatArgs(args, chalk.gray));
}

export function infoPrefix(prefix: string, ...args: any[]) {
  console.log(chalk.blue(prefix), ...formatArgs(args, chalk.gray));
}

export function response(name: string, ...args: any[]) {
  args.forEach((arg) => {
    const message = toString(arg);
    message.split("\n").forEach((line) => {
      console.log(chalk.green(name), line);
    });
  });
}
