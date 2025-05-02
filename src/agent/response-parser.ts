import { debugPrefix } from "../lib/cli.ts";

export type ResponseMessage = {
  done: boolean;
  content: string;
  function_calls?: FunctionCall[];
};

export type FunctionCall = {
  tool: string;
  correlationId: string;
  function: string;
  args: string[];
};

/**
 * ResponseParser class for parsing model responses in various formats
 * into a standardized JSON structure
 */
export class ResponseParser {
  private readonly rawResponse: string;

  /**
   * Create a new ResponseParser instance
   * @param rawResponse The raw response string from the model
   */
  constructor(rawResponse: string) {
    this.rawResponse = rawResponse;
  }

  /**
   * Parse the raw response into a standardized JSON object
   * @returns The parsed content as a ResponseMessage object
   */
  public parse(): ResponseMessage {
    const scanner = new Scanner(this.rawResponse);
    let content = "";
    const functionCalls: FunctionCall[] = [];
    let isDone = false;

    while (!scanner.eof()) {
      const lineStart = scanner.position;

      // Check if the current position has a TOOL: prefix
      if (scanner.hasPrefix("TOOL:")) {
        const toolStart = scanner.position;
        scanner.position += 5; // Skip "TOOL:"

        scanner.skipWhitespace();

        // Extract the full tool identifier which might include correlationId
        const fullToolIdentifier = scanner.nextUntil(["(", " ", ".", "\n"]);

        if (fullToolIdentifier === "done") {
          isDone = true;
          // Add the content before this done signal
          content += this.rawResponse.substring(lineStart, toolStart);

          // Format the content to ensure proper spacing before task completed message
          if (!content.endsWith("\n\n")) {
            if (content.endsWith("\n")) {
              content += "\n"; // Add one more newline to create a blank line
            } else {
              content += "\n\n"; // Add two newlines if content doesn't end with any
            }
          }

          // Add a human-readable description
          content += "[Task completed]";

          // Skip to the next line
          while (!scanner.eof() && scanner.peek() !== "\n") {
            scanner.next();
          }
          if (!scanner.eof()) {
            scanner.next(); // Skip the newline
          }
        } else {
          // Check if the tool identifier contains a correlationId (format: correlationId:toolName)
          let toolName = fullToolIdentifier;
          let correlationId = "default";

          const parts = fullToolIdentifier.split(":");
          if (parts.length === 2) {
            // Extract correlationId and toolName
            correlationId = parts[0];
            toolName = parts[1];
          }

          scanner.skipWhitespace();
          if (scanner.peek() === ".") {
            scanner.next(); // Skip the dot
            scanner.skipWhitespace();
            const functionName = scanner.nextUntil(["(", " ", "\n"]);
            scanner.skipWhitespace();
            const args = parseArguments(scanner);

            // Skip to the next line
            let textAfterToolCall = "";
            while (!scanner.eof() && scanner.peek() !== "\n") {
              textAfterToolCall += scanner.next();
            }

            // Add the content before this tool call
            content += this.rawResponse.substring(lineStart, toolStart);

            // Format the content to ensure proper spacing before tool call
            if (!content.endsWith("\n\n")) {
              if (content.endsWith("\n")) {
                content += "\n"; // Add one more newline to create a blank line
              } else {
                content += "\n\n"; // Add two newlines if content doesn't end with any
              }
            }

            // Create a readable description of the tool call
            const parsedArgs = args.map((arg) => {
              try {
                // We want to display escaped quotes with double quotes instead of backslashes
                return arg.replace(/\\"/g, '""');
              } catch {
                // If something goes wrong, return the raw string
                return arg;
              }
            });
            const argsString = args.join(", ");
            content += `[Using ${toolName}.${functionName}(${argsString})]`;

            // Add any text that was on the same line after the tool call
            if (textAfterToolCall.trim().length > 0) {
              // If there's text on the same line as the tool call,
              // ensure we have a double newline for proper spacing
              content += "\n\n" + textAfterToolCall;
            }

            // If we're not at EOF and we just finished processing a tool call,
            // ensure we properly format the text that follows
            if (!scanner.eof()) {
              scanner.next(); // Skip the newline

              // Check if there's another newline - this would be a blank line after the tool call
              const hasBlankLineAfterTool = !scanner.eof() && scanner.peek() === "\n";

              // If there's text following the tool call (either immediately or after a blank line),
              // ensure there's proper spacing
              if (!scanner.eof()) {
                if (hasBlankLineAfterTool) {
                  // There's already a blank line in the source, preserve it
                  scanner.next(); // Skip the second newline
                  content += "\n\n"; // Add the blank line to the output
                } else if (!scanner.eof() && scanner.peek() !== "\n") {
                  // No blank line in source but there's text, add proper spacing
                  if (!content.endsWith("\n")) {
                    content += "\n\n";
                  } else if (!content.endsWith("\n\n")) {
                    content += "\n";
                  }
                }
              }
            }

            // Add this function call to our collection
            functionCalls.push({
              tool: toolName,
              correlationId,
              function: functionName,
              args: parsedArgs,
            });
          } else {
            // If there's no function call after the tool name, just add it to content
            content += this.rawResponse.substring(lineStart, scanner.position);
            // Continue to the next line
            while (!scanner.eof() && scanner.peek() !== "\n") {
              scanner.next();
            }
            if (!scanner.eof()) {
              scanner.next(); // Skip the newline
            }
          }
        }
      } else {
        // Handle regular text lines (non-tool calls)
        const lineEnd = scanner.findEndOfLine();
        content += this.rawResponse.substring(lineStart, lineEnd);

        // Directly move the scanner position to lineEnd instead of resetting it
        scanner.position = lineEnd;

        if (!scanner.eof()) {
          content += scanner.next(); // Add the newline character to the content
        }
      }
    }

    return {
      done: isDone,
      content: content,
      ...(functionCalls.length > 0 ? { function_calls: functionCalls } : {}),
    };
  }
}

class Scanner {
  private readonly input: string;
  public position: number;

  constructor(input: string) {
    this.input = input;
    this.position = 0;
  }

  public next(): string {
    if (this.position >= this.input.length) {
      return "";
    }
    return this.input[this.position++];
  }

  public hasPrefix(prefix: string): boolean {
    return this.input.startsWith(prefix, this.position);
  }

  public nextUntil(delimiters: string[]): string {
    let result = "";
    while (!this.eof()) {
      const char = this.next();
      if (delimiters.includes(char)) {
        this.position--; // Unconsume the delimiter
        break;
      }
      result += char;
    }
    return result;
  }

  public peek(): string {
    if (this.position >= this.input.length) {
      return "";
    }
    return this.input[this.position];
  }

  public eof(): boolean {
    return this.position >= this.input.length;
  }

  public skipWhitespace(): void {
    while (!this.eof() && this.peek().charCodeAt(0) <= 32) {
      this.position++;
    }
  }

  public slice(start: number, end: number): string {
    return this.input.slice(start, end);
  }

  public match(expected: string): void {
    if (this.peek() !== expected) {
      debugPrefix("Error", `Expected '${expected}' but found '${this.peek()}'`);
      return;
    }
    this.position++;
  }

  public findEndOfLine(): number {
    while (!this.eof() && this.peek() !== "\n") {
      this.position++;
    }
    return this.position; // Return current position without resetting
  }
}

function parseArguments(scanner: Scanner): string[] {
  const args = [];

  scanner.skipWhitespace();
  scanner.match("(");
  scanner.skipWhitespace();
  if (scanner.peek() === ")") {
    scanner.next(); // Skip the ')'
    return [];
  }

  let argStart = scanner.position;
  let depth = 0;
  while (true) {
    scanner.skipWhitespace();
    if (scanner.eof()) {
      debugPrefix("Error", "Unexpected end of input while parsing arguments");
      return [];
    } else if (scanner.peek() === ")") {
      if (depth === 0) {
        args.push(scanner.slice(argStart, scanner.position));
        scanner.next(); // Skip the closing )
        break;
      } else {
        depth--;
        scanner.next(); // Skip the ')'
      }
    } else if (scanner.peek() === "(") {
      depth++;
      scanner.next();
    } else if (scanner.peek() === "," && depth === 0) {
      args.push(scanner.slice(argStart, scanner.position));
      scanner.next(); // Skip the ','
      scanner.skipWhitespace();
      argStart = scanner.position;
    } else if (scanner.peek() === '"') {
      scanner.next(); // Skip the opening quote

      while (!scanner.eof()) {
        const char = scanner.next();
        if (char === '"') {
          break; // End of argument
        }
        if (char === "\\") {
          scanner.next(); // Skip the escape character
        }
      }
    } else if (scanner.peek() === "`") {
      scanner.next(); // Skip the opening quote

      while (!scanner.eof()) {
        const char = scanner.next();
        if (char === "`") {
          break; // End of argument
        }
        if (char === "\\") {
          scanner.next(); // Skip the escape character
        }
      }
    } else if (scanner.peek() === "'") {
      scanner.next(); // Skip the opening quote
      while (!scanner.eof()) {
        const char = scanner.next();
        if (char === "'") {
          break; // End of argument
        }
        if (char === "\\") {
          scanner.next(); // Skip the escape character
        }
      }
    } else {
      scanner.next(); // Skip the character
    }
  }

  return args;
}
