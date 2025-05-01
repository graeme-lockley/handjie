import { Tool, ToolFunctionSpec } from "./types.ts";
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

  functionMap = {
    read: this.read.bind(this),
    write: this.write.bind(this),
    delete: this.delete.bind(this),
    createDirectory: this.createDirectory.bind(this),
    deleteDirectory: this.deleteDirectory.bind(this),
    listFiles: this.listFiles.bind(this),
  };

  async read(filePath: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Reading file: ${filePath}`);
      const data = await Deno.readTextFile(filePath);
      return data;
    } catch (err) {
      infoPrefix("Tool:filesystem", `Error reading file: ${err.message}`);
      return `Error reading file: ${err.message}`;
    }
  }

  async write(filePath: string, content: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Writing to file: ${filePath}`);
      await Deno.writeTextFile(filePath, content);
      return `Successfully wrote to file: ${filePath}`;
    } catch (err) {
      infoPrefix("Tool:filesystem", `Error writing to file: ${err.message}`);
      return `Error writing to file: ${err.message}`;
    }
  }

  async delete(filePath: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Deleting file: ${filePath}`);
      await Deno.remove(filePath);
      return `Successfully deleted file: ${filePath}`;
    } catch (err) {
      infoPrefix("Tool:filesystem", `Error deleting file: ${err.message}`);
      return `Error deleting file: ${err.message}`;
    }
  }

  async createDirectory(dirPath: string): Promise<string> {
    try {
      infoPrefix("Tool:filesystem", `Creating directory: ${dirPath}`);
      await Deno.mkdir(dirPath, { recursive: true });
      return `Successfully created directory: ${dirPath}`;
    } catch (err) {
      infoPrefix("Tool:filesystem", `Error creating directory: ${err.message}`);
      return `Error creating directory: ${err.message}`;
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
    } catch (err) {
      infoPrefix("Tool:filesystem", `Error deleting directory: ${err.message}`);
      return `Error deleting directory: ${err.message}`;
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
    } catch (err) {
      infoPrefix("Tool:filesystem", `Error listing files: ${err.message}`);
      return `Error listing files: ${err.message}`;
    }
  }
}

export const filesystem = new FileSystemTool();
