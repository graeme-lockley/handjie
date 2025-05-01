import { Tool, ToolFunctionSpec } from "./types.ts";
import { infoPrefix } from "./../lib/cli.ts";

/**
 * Helper function to execute shell commands using a bash shell
 */
async function execCommand(
  command: string,
  options: { timeout?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { timeout = 50000 } = options;

  // Create a properly managed timeout promise with cleanup
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("ETIMEDOUT")), timeout);
  });

  try {
    // Create and run the command in a bash shell
    // This enables shell features like pipes, environment variables, and tilde expansion
    const process = new Deno.Command("bash", {
      args: ["-c", command],
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

class Bash extends Tool {
  name = "bash executor tool";
  identifier = "bash-executor-tool";
  abilities = ["Can execute a command in bash and return the response"];
  instructions = [
    "Execute the bash command using execute function",
  ];

  functions: ToolFunctionSpec[] = [
    {
      name: "execute",
      purpose: "Execute a bash command in terminal",
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

  functionMap = {
    execute: this.execute.bind(this),
  };

  async execute(command: string) {
    try {
      // Execute command and wait for completion
      infoPrefix("Tool:bash", command);
      const { stdout, stderr } = await execCommand(command, { timeout: 50000 });

      // If there's stderr output but the command didn't fail, you might want to include it
      if (stderr) {
        infoPrefix("Tool:bash", `stderr: ${stderr}`);
        return `${stdout}\nSTDERR: ${stderr}`;
      }

      return stdout;
    } catch (error: any) {
      infoPrefix("Tool:bash", `error: ${error}`);
      // Handle any errors that occurred during execution
      if (error.code === "ETIMEDOUT") {
        return "Command timed out. Maybe because it needed an input from you, which is impossible as per your first instruction. Remember - interactive prompts are not supported. You must find alternative ways to run the command or use a different command!";
      }
      return "Command execution failed: " + error.message;
    }
  }
}

export const bash = new Bash();
