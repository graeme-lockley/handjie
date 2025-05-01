// Tests for response-parser.ts
import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { ResponseMessage, ResponseParser } from "./response-parser.ts";

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
  const rawResponse = 'I\'ll search for that information.\n\nTOOL:search.execute("query term")';
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: "I'll search for that information.\n\n",
    function_call: {
      tool: "search",
      function: "execute",
      arguments: ["query term"],
    },
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - done signal", () => {
  const rawResponse = "Here is the final answer to your question.\n\nTOOL:done";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: true,
    content: "Here is the final answer to your question.\n\n",
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - multiple function arguments", () => {
  const rawResponse = "Let me calculate that for you.\n\nTOOL:calculator.add(5, 10, 15)";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: "Let me calculate that for you.\n\n",
    function_call: {
      tool: "calculator",
      function: "add",
      arguments: [5, 10, 15],
    },
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - quoted string arguments", () => {
  const rawResponse = "Let me run that command.\n\nTOOL:bash.execute(\"echo 'Hello World'\")";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: "Let me run that command.\n\n",
    function_call: {
      tool: "bash",
      function: "execute",
      arguments: ["echo 'Hello World'"],
    },
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - backtick string arguments", () => {
  const rawResponse = "Let me run this command with backticks.\n\nTOOL:command.run(`ls -la`)";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: "Let me run this command with backticks.\n\n",
    function_call: {
      tool: "command",
      function: "run",
      arguments: ["ls -la"],
    },
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - empty arguments", () => {
  const rawResponse = "Let me list all files.\n\nTOOL:filesystem.listFiles()";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: "Let me list all files.\n\n",
    function_call: {
      tool: "filesystem",
      function: "listFiles",
      arguments: [],
    },
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - escaped quotes in arguments", () => {
  const rawResponse = 'Let me search for escaped quotes.\n\nTOOL:web.search("\\"escaped quotes\\"")\nSome more text.';
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: "Let me search for escaped quotes.\n\n",
    function_call: {
      tool: "web",
      function: "search",
      arguments: ['"escaped quotes"'],
    },
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - multiple newlines before tool call", () => {
  const rawResponse = 'Let me help you.\n\n\n\nTOOL:help.show("commands")';
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: "Let me help you.\n\n\n\n",
    function_call: {
      tool: "help",
      function: "show",
      arguments: ["commands"],
    },
  };

  assertEquals(result, expected);
});

Deno.test("ResponseParser - no tool call, just text", () => {
  const rawResponse =
    "I'll solve this step by step:\n1. The day of the month is 1\n2. I'll add 42 to 1 using the calculator\n\nTOOL:calculator-tool.calculate(1 + 42)\n\nThe result is 43.";
  const parser = new ResponseParser(rawResponse);
  const result = parser.parse();

  const expected: ResponseMessage = {
    done: false,
    content: "I'll solve this step by step:\n1. The day of the month is 1\n2. I'll add 42 to 1 using the calculator\n\n",
    function_call: {
      tool: "calculator-tool",
      function: "calculate",
      arguments: [43],
    },
  };

  assertEquals(result, expected);
});
