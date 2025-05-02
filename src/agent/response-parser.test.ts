// Tests for response-parser.ts
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { ResponseMessage, ResponseParser } from "./response-parser.ts";
import { assert } from "node:console";

Deno.test("ResponseParser - basic content without function call", () => {
  const rawResponse = "This is a simple text response without any tool calls.";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: rawResponse,
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - with function call", () => {
  const rawResponse = 'I\'ll search for that information.\n\nTOOL:test-correlation-id:search.execute("query term")';
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(result.content, 'I\'ll search for that information.\n\n[Using search.execute("query term")]');
  assertEquals(result.function_calls?.length, 1);
  assertEquals(result.function_calls?.[0].tool, "search");
  assertEquals(result.function_calls?.[0].correlationId, "test-correlation-id");
  assertEquals(result.function_calls?.[0].function, "execute");
  assertEquals(result.function_calls?.[0].arguments, ['"query term"']);
});

Deno.test("ResponseParser - done signal", () => {
  const rawResponse = "Here is the final answer to your question.\n\nTOOL:done";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, true);
  assertEquals(result.content, "Here is the final answer to your question.\n\n[Task completed]");
  assertEquals(result.function_calls, undefined);
});

Deno.test("ResponseParser - multiple function arguments", () => {
  const rawResponse = "Let me calculate that for you.\n\nTOOL:test-correlation-id:calculator.add(5, 10, 15)";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(result.content, "Let me calculate that for you.\n\n[Using calculator.add(5, 10, 15)]");
  assertEquals(result.function_calls?.length, 1);
  assertEquals(result.function_calls?.[0].tool, "calculator");
  assertEquals(result.function_calls?.[0].correlationId, "test-correlation-id");
  assertEquals(result.function_calls?.[0].function, "add");
  assertEquals(result.function_calls?.[0].arguments, ["5", "10", "15"]);
});

Deno.test("ResponseParser - quoted string arguments", () => {
  const rawResponse = "Let me run that command.\n\nTOOL:test-correlation-id:bash.execute(\"echo 'Hello World'\")";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(result.content, "Let me run that command.\n\n[Using bash.execute(\"echo 'Hello World'\")]");
  assertEquals(result.function_calls?.length, 1);
  assertEquals(result.function_calls?.[0].tool, "bash");
  assertEquals(result.function_calls?.[0].correlationId, "test-correlation-id");
  assertEquals(result.function_calls?.[0].function, "execute");
  assertEquals(result.function_calls?.[0].arguments, [`"echo 'Hello World'"`]);
});

Deno.test("ResponseParser - backtick string arguments", () => {
  const rawResponse = "Let me run this command with backticks.\n\nTOOL:test-correlation-id:command.run(`ls -la`)";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(result.content, "Let me run this command with backticks.\n\n[Using command.run(`ls -la`)]");
  assertEquals(result.function_calls?.length, 1);
  assertEquals(result.function_calls?.[0].tool, "command");
  assertEquals(result.function_calls?.[0].correlationId, "test-correlation-id");
  assertEquals(result.function_calls?.[0].function, "run");
  assertEquals(result.function_calls?.[0].arguments, ["`ls -la`"]);
});

Deno.test("ResponseParser - empty arguments", () => {
  const rawResponse = "Let me list all files.\n\nTOOL:test-correlation-id:filesystem.listFiles()";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(result.content, "Let me list all files.\n\n[Using filesystem.listFiles()]");
  assertEquals(result.function_calls?.length, 1);
  assertEquals(result.function_calls?.[0].tool, "filesystem");
  assertEquals(result.function_calls?.[0].correlationId, "test-correlation-id");
  assertEquals(result.function_calls?.[0].function, "listFiles");
  assertEquals(result.function_calls?.[0].arguments, []);
});

Deno.test("ResponseParser - escaped quotes in arguments", () => {
  const rawResponse = 'Let me search for escaped quotes.\n\nTOOL:test-correlation-id:web.search("\\"escaped quotes\\"")\nSome more text.';
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(result.content, 'Let me search for escaped quotes.\n\n[Using web.search("\\"escaped quotes\\"")]\n\nSome more text.');
  assertEquals(result.function_calls?.length, 1);
  assertEquals(result.function_calls?.[0].tool, "web");
  assertEquals(result.function_calls?.[0].correlationId, "test-correlation-id");
  assertEquals(result.function_calls?.[0].function, "search");
  assertEquals(result.function_calls?.[0].arguments, ['"""escaped quotes"""']);
});

Deno.test("ResponseParser - multiple newlines before tool call", () => {
  const rawResponse = 'Let me help you.\n\n\n\nTOOL:test-correlation-id:help.show("commands")';
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(result.function_calls?.length, 1);
  assertEquals(result.function_calls?.[0].tool, "help");
  assertEquals(result.function_calls?.[0].correlationId, "test-correlation-id");
  assertEquals(result.function_calls?.[0].function, "show");
  assertEquals(result.function_calls?.[0].arguments, ['"commands"']);
});

Deno.test("ResponseParser - no tool call, just text", () => {
  const rawResponse =
    "I'll solve this step by step:\n1. The day of the month is 1\n2. I'll add 42 to 1 using the calculator\n\nTOOL:test-correlation-id:calculator-tool.calculate(1 + 42)\n\nThe result is 43.";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(
    result.content,
    "I'll solve this step by step:\n1. The day of the month is 1\n2. I'll add 42 to 1 using the calculator\n\n[Using calculator-tool.calculate(1 + 42)]\n\nThe result is 43.",
  );
  assertEquals(result.function_calls?.length, 1);
  assertEquals(result.function_calls?.[0].tool, "calculator-tool");
  assertEquals(result.function_calls?.[0].correlationId, "test-correlation-id");
  assertEquals(result.function_calls?.[0].function, "calculate");
  assertEquals(result.function_calls?.[0].arguments, ["1 + 42"]);
});

Deno.test("ResponseParser - multiple tool calls", () => {
  const rawResponse = `I'll perform multiple operations:

First, let me check the files in the current directory.
TOOL:id-1:filesystem.listFiles(".")

Now let me create a new file.
TOOL:id-2:filesystem.write("example.txt", "Hello World")

Finally, let me read the file content.
TOOL:id-3:filesystem.read("example.txt")

All done!`;

  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, false);
  assertEquals(result.function_calls?.length, 3);

  // Check first function call
  assertEquals(result.function_calls?.[0].tool, "filesystem");
  assertEquals(result.function_calls?.[0].correlationId, "id-1");
  assertEquals(result.function_calls?.[0].function, "listFiles");
  assertEquals(result.function_calls?.[0].arguments, ['"."']);

  // Check second function call
  assertEquals(result.function_calls?.[1].tool, "filesystem");
  assertEquals(result.function_calls?.[1].correlationId, "id-2");
  assertEquals(result.function_calls?.[1].function, "write");
  assertEquals(result.function_calls?.[1].arguments, ['"example.txt"', '"Hello World"']);

  // Check third function call
  assertEquals(result.function_calls?.[2].tool, "filesystem");
  assertEquals(result.function_calls?.[2].correlationId, "id-3");
  assertEquals(result.function_calls?.[2].function, "read");
  assertEquals(result.function_calls?.[2].arguments, ['"example.txt"']);
});

Deno.test("ResponseParser - tool calls with done signal", () => {
  const rawResponse = `Let me help with these tasks:

First, I'll run a command.
TOOL:id-1:command.execute("echo Hello")

Now I'll get the current date.
TOOL:id-2:bash.execute("date")

TOOL:done`;

  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  // Verify the properties we care about
  assertEquals(result.done, true);
  assertEquals(result.function_calls?.length, 2);

  // Check first function call
  assertEquals(result.function_calls?.[0].tool, "command");
  assertEquals(result.function_calls?.[0].correlationId, "id-1");
  assertEquals(result.function_calls?.[0].function, "execute");
  assertEquals(result.function_calls?.[0].arguments, ['"echo Hello"']);

  // Check second function call
  assertEquals(result.function_calls?.[1].tool, "bash");
  assertEquals(result.function_calls?.[1].correlationId, "id-2");
  assertEquals(result.function_calls?.[1].function, "execute");
  assertEquals(result.function_calls?.[1].arguments, ['"date"']);
});
