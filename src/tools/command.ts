import { FunctionMap, Tool, ToolFunctionSpec } from "./types.ts";
import { infoPrefix } from "./../lib/cli.ts";

/**
 * Helper function to execute shell commands using Deno.Command
 */
async function execCommand(
  command: string,
  options: { timeout?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = 50000 } = options;

  // Split the command string into command and arguments
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  // Create a properly managed timeout promise with cleanup
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("ETIMEDOUT")), timeout);
  });

  try {
    // Create and run the command
    const process = new Deno.Command(cmd, {
      args: args,
      stdout: "piped",
      stderr: "piped",
    });

    const executePromise = process.output();
    const result = await Promise.race([executePromise, timeoutPromise]);

    // Clear the timeout to prevent memory leaks and allow program termination
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    const decoder = new TextDecoder();
    const stdout = decoder.decode(result.stdout);
    const stderr = decoder.decode(result.stderr);

    return { stdout, stderr };
  } catch (error: unknown) {
    // Clear the timeout on error as well
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }

    if (error instanceof Error && error.message === "ETIMEDOUT") {
      throw { code: "ETIMEDOUT", message: "Command execution timed out" };
    }
    throw error;
  }
}

class Command extends Tool {
  name = "command executor tool";
  identifier = "command-executor-tool";
  abilities = [
    "Can execute a command without using a shell and return the response",
  ];
  instructions = [
    "Execute the command using execute function",
  ];

  functions: ToolFunctionSpec[] = [
    {
      name: "execute",
      purpose: "Execute a command in terminal",
      arguments: [
        {
          name: "command",
          description: "Command to be executed",
          dataType: "string",
        },
      ],
      response: "The output of executed command",
    },
  ];

  functionMap: FunctionMap = {
    execute: async (...args: unknown[]): Promise<string> => {
      // Validate and convert arguments
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: Command must be a string";
      }
      const command = args[0] as string;

      // Call the actual implementation
      return await this.execute(command);
    },
  };

  async execute(command: string): Promise<string> {
    try {
      // Execute command and wait for completion
      infoPrefix("Tool:command", command);
      const { stdout, stderr } = await execCommand(command, { timeout: 50000 });

      // If there's stderr output but the command didn't fail, you might want to include it
      if (stderr) {
        infoPrefix("Tool:command", `stderr: ${stderr}`);
        return `${stdout}\nSTDERR: ${stderr}`;
      }

      return stdout;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      infoPrefix("Tool:command", `error: ${errorMessage}`);
      // Handle any errors that occurred during execution
      if (error instanceof Error && error.message === "ETIMEDOUT") {
        return "Command timed out. Maybe because it needed an input from you, which is impossible as per your first instruction. Remember - interactive prompts are not supported. You must find alternative ways to run the command or use a different command!";
      }
      return "Command execution failed: " + errorMessage;
    }
  }
}

export const command = new Command();
