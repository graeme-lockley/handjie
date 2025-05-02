import chalk from "npm:chalk";

// Type declaration for chalk function
type ChalkFunction = (text: string) => string;

// Fix DEBUG environment variable access
const DEBUG = true || Deno.env.get("DEBUG") === "true";

export function debugging(): boolean {
  return DEBUG;
}

function toString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_e) {
      return String(value);
    }
  }

  return String(value);
}

/**
 * Helper function to format arguments with specified color
 */
function formatArgs(args: unknown[], color: ChalkFunction): string[] {
  return args.map((arg) => {
    if (arg === null || arg === undefined) {
      return color("");
    }
    return color(String(arg));
  });
}

export function debug(...args: unknown[]) {
  if (DEBUG) {
    console.log(...formatArgs(args, chalk.gray));
  }
}

export function debugPrefix(prefix: string, message: unknown) {
  if (DEBUG) {
    toString(message).split("\n").forEach((line) => {
      console.log(chalk.gray(prefix), line);
    });
  }
}

export function info(...args: unknown[]) {
  console.log(...formatArgs(args, chalk.gray));
}

export function infoPrefix(prefix: string, ...args: unknown[]) {
  console.log(chalk.blue(prefix), ...formatArgs(args, chalk.gray));
}

/**
 * Simple Markdown renderer for terminal output
 * @param markdown The markdown text to render
 * @returns Formatted text for terminal display
 */
function renderMarkdown(markdown: string): string[] {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let inList = false;

  // Helper function to apply inline formatting to text
  const formatInline = (text: string): string => {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, (_, content) => chalk.bold(content));
    text = text.replace(/__(.+?)__/g, (_, content) => chalk.bold(content));

    // Italic
    text = text.replace(/\*([^*]+)\*/g, (_, content) => chalk.italic(content));
    text = text.replace(/_([^_]+)_/g, (_, content) => chalk.italic(content));

    // Code span
    text = text.replace(/`([^`]+)`/g, (_, content) => chalk.gray(content));

    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => chalk.blue.underline(text) + chalk.gray(` (${url})`));

    return text;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      if (inCodeBlock) {
        // Start of code block
        const language = line.trim().substring(3);
        result.push(chalk.gray(`╭─ Code${language ? ` (${language})` : ""} ${"─".repeat(50)}`));
      } else {
        // End of code block
        result.push(chalk.gray(`╰${"─".repeat(60)}`));
      }
      continue;
    }

    if (inCodeBlock) {
      // Inside code block
      result.push(chalk.gray(`│ ${line}`));
      continue;
    }

    // Headers
    if (line.startsWith("# ")) {
      result.push(chalk.bold.yellow(line.substring(2).toUpperCase()));
      continue;
    }
    if (line.startsWith("## ")) {
      result.push(chalk.bold.yellow(line.substring(3)));
      continue;
    }
    if (line.startsWith("### ")) {
      result.push(chalk.yellow(line.substring(4)));
      continue;
    }

    // Lists
    if (line.match(/^\s*[-*]\s/)) {
      const indent = line.search(/[-*]/);
      const bullet = "•";
      const text = line.replace(/^\s*[-*]\s/, "");
      // Format the list item with a proper bullet and indentation
      // Apply inline formatting to the text portion
      result.push(" ".repeat(indent) + chalk.cyan(bullet) + " " + formatInline(text));
      inList = true;
      continue;
    }
    if (line.match(/^\s*\d+\.\s/)) {
      const indent = line.search(/\d/);
      const num = line.match(/^\s*(\d+)\.\s/)?.[1] || "";
      const text = line.replace(/^\s*\d+\.\s/, "");
      // Format the numbered list item
      // Apply inline formatting to the text portion
      result.push(" ".repeat(indent) + chalk.cyan(num + ".") + " " + formatInline(text));
      inList = true;
      continue;
    }
    if (inList && line.trim() === "") {
      inList = false;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      // Apply inline formatting to blockquote content
      result.push(chalk.gray.italic(`┃ ${formatInline(line.substring(2))}`));
      continue;
    }

    // Horizontal rule
    if (line.match(/^[\-*_]{3,}$/)) {
      result.push(chalk.gray("─".repeat(60)));
      continue;
    }

    // Apply inline formatting to regular text
    result.push(formatInline(line));
  }

  return result;
}

export function response(name: string, ...args: unknown[]) {
  args.forEach((arg) => {
    const message = toString(arg);

    // Render the markdown
    const renderedLines = renderMarkdown(message);

    // Print agent name once
    console.log(chalk.green(name));

    // Print all rendered lines
    renderedLines.forEach((line) => {
      console.log(line);
    });
  });
}
