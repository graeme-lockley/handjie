import { FunctionMap, Tool, ToolFunctionSpec } from "./types.ts";
import { infoPrefix } from "./../lib/cli.ts";

class FileSystemTool extends Tool {
  name = "file system tool";
  identifier = "file-system-tool";
  abilities = [
    "You can read a given file from disk",
    "You can write a given file to disk",
    "You can delete a given file from disk",
    "You can create a directory",
    "You can delete a directory",
    "You can list files in a directory",
  ];
  instructions = [
    "Read using read function",
    "Write using write function",
    "Delete using delete function",
    "Create directory using createDirectory function",
    "Delete directory using deleteDirectory function",
    "List files in a directory using listFiles function",
  ];

  functions: ToolFunctionSpec[] = [
    {
      name: "read",
      purpose: "Read a file from disk",
      arguments: [
        {
          name: "filePath",
          description: "Path to the file to read",
          dataType: "string",
        },
      ],
      response: "File contents as a string or error message",
    },
    {
      name: "write",
      purpose: "Write content to a file on disk",
      arguments: [
        {
          name: "filePath",
          description: "Path to the file to write",
          dataType: "string",
        },
        {
          name: "content",
          description: "Content to write to the file",
          dataType: "string",
        },
      ],
      response: "Success message or error message",
    },
    {
      name: "delete",
      purpose: "Delete a file from disk",
      arguments: [
        {
          name: "filePath",
          description: "Path to the file to delete",
          dataType: "string",
        },
      ],
      response: "Success message or error message",
    },
    {
      name: "createDirectory",
      purpose: "Create a directory",
      arguments: [
        {
          name: "dirPath",
          description: "Path to the directory to create",
          dataType: "string",
        },
      ],
      response: "Success message or error message",
    },
    {
      name: "deleteDirectory",
      purpose: "Delete a directory",
      arguments: [
        {
          name: "dirPath",
          description: "Path to the directory to delete",
          dataType: "string",
        },
        {
          name: "recursive",
          description: "Whether to recursively delete subdirectories and files",
          dataType: "boolean",
        },
      ],
      response: "Success message or error message",
    },
    {
      name: "listFiles",
      purpose: "List files in a directory",
      arguments: [
        {
          name: "dirPath",
          description: "Path to the directory to list",
          dataType: "string",
        },
      ],
      response: "Array of file names or error message",
    },
  ];

  functionMap: FunctionMap = {
    read: async (...args: unknown[]): Promise<string> => {
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: File path must be a string";
      }
      const filePath = args[0] as string;
      return await this.read(filePath);
    },

    write: async (...args: unknown[]): Promise<string> => {
      if (args.length < 2 || typeof args[0] !== "string" || typeof args[1] !== "string") {
        return "Error: File path and content must be strings";
      }
      const filePath = args[0] as string;
      const content = args[1] as string;
      return await this.write(filePath, content);
    },

    delete: async (...args: unknown[]): Promise<string> => {
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: File path must be a string";
      }
      const filePath = args[0] as string;
      return await this.delete(filePath);
    },

    createDirectory: async (...args: unknown[]): Promise<string> => {
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: Directory path must be a string";
      }
      const dirPath = args[0] as string;
      return await this.createDirectory(dirPath);
    },

    deleteDirectory: async (...args: unknown[]): Promise<string> => {
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: Directory path must be a string";
      }
      const dirPath = args[0] as string;
      const recursive = args.length > 1 && typeof args[1] === "boolean" && args[1] === true;
      return await this.deleteDirectory(dirPath, recursive);
    },

    listFiles: async (...args: unknown[]): Promise<string> => {
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: Directory path must be a string";
      }
      const dirPath = args[0] as string;
      return await this.listFiles(dirPath);
    },
  };

  async read(filePath: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Reading file: ${filePath}`);
      const data = await Deno.readTextFile(filePath);
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:filesystem", `Error reading file: ${errorMessage}`);
      return `Error reading file: ${errorMessage}`;
    }
  }

  async write(filePath: string, content: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Writing to file: ${filePath}`);
      await Deno.writeTextFile(filePath, content);
      return `Successfully wrote to file: ${filePath}`;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:filesystem", `Error writing to file: ${errorMessage}`);
      return `Error writing to file: ${errorMessage}`;
    }
  }

  async delete(filePath: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Deleting file: ${filePath}`);
      await Deno.remove(filePath);
      return `Successfully deleted file: ${filePath}`;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:filesystem", `Error deleting file: ${errorMessage}`);
      return `Error deleting file: ${errorMessage}`;
    }
  }

  async createDirectory(dirPath: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Creating directory: ${dirPath}`);
      await Deno.mkdir(dirPath, { recursive: true });
      return `Successfully created directory: ${dirPath}`;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:filesystem", `Error creating directory: ${errorMessage}`);
      return `Error creating directory: ${errorMessage}`;
    }
  }

  async deleteDirectory(dirPath: string, recursive = false): Promise<string> {
    try {
      infoPrefix(
        "Tool:filesystem",
        `Deleting directory: ${dirPath}, recursive: ${recursive}`,
      );
      await Deno.remove(dirPath, { recursive });
      return `Successfully deleted directory: ${dirPath}`;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:filesystem", `Error deleting directory: ${errorMessage}`);
      return `Error deleting directory: ${errorMessage}`;
    }
  }

  async listFiles(dirPath: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Listing files in directory: ${dirPath}`);
      const files: string[] = [];

      for await (const entry of Deno.readDir(dirPath)) {
        const entryType = entry.isDirectory ? "directory" : "file";
        files.push(`${entry.name} (${entryType})`);
      }

      return JSON.stringify(files);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:filesystem", `Error listing files: ${errorMessage}`);
      return `Error listing files: ${errorMessage}`;
    }
  }
}

export const filesystem = new FileSystemTool();
