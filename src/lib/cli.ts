import chalk from "npm:chalk";

const DEBUG = false || Deno.env.DEBUG === "true";

export function debugging(): boolean {
  return DEBUG;
}

/**
 * Helper function to format arguments with specified color
 */
function formatArgs(args: any[], color: chalk.ChalkFunction): any[] {
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

export function debugPrefix(prefix: string, ...args: any[]) {
  if (DEBUG) {
    console.log(chalk.gray(prefix), ...formatArgs(args, chalk.gray));
  }
}

export function info(...args: any[]) {
  console.log(...formatArgs(args, chalk.gray));
}

export function infoPrefix(prefix: string, ...args: any[]) {
  console.log(chalk.blue(prefix), ...formatArgs(args, chalk.gray));
}
