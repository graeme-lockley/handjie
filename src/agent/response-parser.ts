import { debugPrefix } from "../lib/cli.ts";

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

    while (!scanner.eof()) {
      scanner.skipWhitespace();
      if (scanner.hasPrefix("TOOL:")) {
        const toolStart = scanner.position;
        scanner.position += 5; // Skip "TOOL:"

        scanner.skipWhitespace();

        // Extract the full tool identifier which might include correlationId
        const fullToolIdentifier = scanner.nextUntil(["(", " ", ".", "\n"]);

        if (fullToolIdentifier === "done") {
          return {
            done: true,
            content: this.rawResponse.substring(0, toolStart),
          };
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

            return {
              done: false,
              content: this.rawResponse.substring(0, toolStart),
              function_call: {
                tool: toolName,
                correlationId,
                function: functionName,
                arguments: args.map((arg) => eval(arg)),
              },
            };
          }
        }
      } else {
        while (!scanner.eof() && scanner.peek() !== "\n") {
          scanner.next();
        }
        scanner.next(); // Skip the newline
      }
    }

    return {
      done: false,
      content: this.rawResponse,
    };
  }
}

export type ResponseMessage = {
  done: boolean;
  content: string;
  function_call?: FunctionCall;
};

/**
 * Type definitions for function calls
 */
export interface FunctionCall {
  tool: string;
  correlationId: string;
  function: string;
  arguments: unknown[];
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

function generateCorrelationId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
