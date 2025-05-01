import { assertEquals, assertThrows } from "https://deno.land/std/testing/asserts.ts";
import { ResponseParser } from "../agent/response-parser.ts";

// Test data for different response formats
const directJsonResponse =
  '{"response": {"message": "This is a direct JSON response"}, "use_tool": {"identifier": "test-tool", "function_name": "test", "args": [1, 2]}}';
const markdownJsonResponse = '```json\n{"response": {"message": "This is JSON in a markdown block"}, "task_completed": true}\n```';
const plainTextResponse = "This is a plain text response without any JSON structure";
const mixedResponse =
  'Some text before the JSON\n```json\n{"use_tool": {"identifier": "calculator", "function_name": "add", "args": [5, 3]}}\n```\nSome text after';
const invalidJsonInMarkdown = '```json\n{"response": {"message": "This has invalid JSON, "task_completed": true}\n```';

// Unit tests for ResponseParser
Deno.test("ResponseParser - Direct JSON parsing", () => {
  const parser = new ResponseParser(directJsonResponse);
  const result = parser.parse();

  assertEquals(result.response.message, "This is a direct JSON response");
  assertEquals(result.use_tool.identifier, "test-tool");
  assertEquals(result.use_tool.function_name, "test");
  assertEquals(result.use_tool.args, [1, 2]);
});

Deno.test("ResponseParser - Extract JSON from markdown", () => {
  const parser = new ResponseParser(markdownJsonResponse);
  const result = parser.parse();

  assertEquals(result.response.message, "This is JSON in a markdown block");
  assertEquals(result.task_completed, true);
});

Deno.test("ResponseParser - Plain text fallback", () => {
  const parser = new ResponseParser(plainTextResponse);
  const result = parser.parse();

  assertEquals(
    result.response.message,
    "This is a plain text response without any JSON structure",
  );
});

Deno.test("ResponseParser - Mixed content with JSON in markdown", () => {
  const parser = new ResponseParser(mixedResponse);
  const result = parser.parse();

  assertEquals(result.response.message, "Some text before the JSON");
  assertEquals(result.use_tool.identifier, "calculator");
  assertEquals(result.use_tool.function_name, "add");
  assertEquals(result.use_tool.args, [5, 3]);
});

Deno.test("ResponseParser - Mixed text and JSON in markdown", () => {
  const content = `I'll help you count the number of TypeScript files in your project directory. I'll break this down into steps:
 
1. Use the file system tool to list all files in the project directory
2. Count the files with .ts or .tsx extensions

{
  "task_completed": false,
  "response": {
    "type": "string",
    "message": "Listing files in the project directory"
  },
  "use_tool": {
    "identifier": "file-system-tool",
    "function_name": "listFiles",
    "args": ["/Users/graemel/Projects/h3/src"]
  }
}`;

  const parser = new ResponseParser(content);
  const result = parser.parse();

  assertEquals(
    result.response.message,
    `I'll help you count the number of TypeScript files in your project directory. I'll break this down into steps:
 
1. Use the file system tool to list all files in the project directory
2. Count the files with .ts or .tsx extensions

Listing files in the project directory`,
  );
  assertEquals(result.use_tool.identifier, "file-system-tool");
  assertEquals(result.use_tool.function_name, "listFiles");
  assertEquals(result.use_tool.args, ["/Users/graemel/Projects/h3/src"]);
});

Deno.test("ResponseParser - Mixed test from deepseek.ai", () => {
  const content = `<think>
Okay, so Fred has successfully executed the bash command to echo "Hello World!" and received a response indicating success with the output as expected.
</think>

{
  "task_completed": true,
  "response": {
    "type": "JSON",
    "message": "'Hello World!'"
  }
}`;

  const parser = new ResponseParser(content);
  const result = parser.parse();
  assertEquals(
    result.response.message,
    `<think>
Okay, so Fred has successfully executed the bash command to echo "Hello World!" and received a response indicating success with the output as expected.
</think>

Hello World!`,
  );
});

Deno.test("ResponseParser - Invalid JSON in markdown throws error", () => {
  const parser = new ResponseParser(invalidJsonInMarkdown);

  assertThrows(() => parser.parse());
});

Deno.test("ResponseParser - isTaskCompleted returns correct value", () => {
  const parser1 = new ResponseParser(markdownJsonResponse);
  assertEquals(parser1.isTaskCompleted(), true);

  const parser2 = new ResponseParser(directJsonResponse);
  assertEquals(parser2.isTaskCompleted(), false);
});

Deno.test("ResponseParser - getResponseMessage returns message or null", () => {
  const parser1 = new ResponseParser(directJsonResponse);
  assertEquals(parser1.getResponseMessage(), "This is a direct JSON response");

  const parser2 = new ResponseParser('{"no_response": true}');
  assertEquals(parser2.getResponseMessage(), null);
});

Deno.test("ResponseParser - getToolUsage returns tool info or null", () => {
  const parser1 = new ResponseParser(directJsonResponse);
  const toolUsage = parser1.getToolUsage();

  assertEquals(toolUsage?.identifier, "test-tool");
  assertEquals(toolUsage?.function_name, "test");
  assertEquals(toolUsage?.args, [1, 2]);

  const parser2 = new ResponseParser(
    '{"response": {"message": "No tool usage here"}}',
  );
  assertEquals(parser2.getToolUsage(), null);
});
