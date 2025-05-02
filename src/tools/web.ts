import { FunctionMap, Tool, ToolFunctionSpec } from "./types.ts";
import { infoPrefix } from "./../lib/cli.ts";

class WebTool extends Tool {
  name = "web tool";
  identifier = "web-tool";
  abilities = [
    "Can make HTTP and HTTPS REST calls with different methods (GET, POST, PUT, DELETE, PATCH)",
    "Can fetch web pages as HTML",
    "Can fetch web pages as Markdown",
  ];
  instructions = [
    "Use restCall function to make REST API calls",
    "Use fetchHtml function to get HTML content from a web page",
    "Use fetchMarkdown function to get Markdown content from a web page",
  ];

  functions: ToolFunctionSpec[] = [
    {
      name: "restCall",
      purpose: "Make an HTTP or HTTPS REST call with a specified method",
      arguments: [
        {
          name: "url",
          description: "URL to make the request to",
          dataType: "string",
        },
        {
          name: "method",
          description: "HTTP method (GET, POST, PUT, DELETE, PATCH)",
          dataType: "string",
        },
        {
          name: "headers",
          description: "Optional headers to include with the request as a JSON string",
          dataType: "string",
        },
        {
          name: "body",
          description: "Optional body for the request as a JSON string",
          dataType: "string",
        },
      ],
      response: "Response from the server or error message",
    },
    {
      name: "fetchHtml",
      purpose: "Fetch a web page and return its HTML content",
      arguments: [
        {
          name: "url",
          description: "URL of the web page to fetch",
          dataType: "string",
        },
      ],
      response: "HTML content of the web page or error message",
    },
    {
      name: "fetchMarkdown",
      purpose: "Fetch a web page and convert its content to Markdown",
      arguments: [
        {
          name: "url",
          description: "URL of the web page to fetch",
          dataType: "string",
        },
      ],
      response: "Markdown content converted from the web page or error message",
    },
  ];

  functionMap: FunctionMap = {
    restCall: async (...args: unknown[]): Promise<string> => {
      if (args.length < 2 || typeof args[0] !== "string" || typeof args[1] !== "string") {
        return "Error: URL and method must be strings";
      }
      const url = args[0] as string;
      const method = args[1] as string;
      const headers = args.length > 2 && typeof args[2] === "string" ? args[2] : "{}";
      const body = args.length > 3 && typeof args[3] === "string" ? args[3] : "";

      return this.restCall(url, method, headers, body);
    },

    fetchHtml: async (...args: unknown[]): Promise<string> => {
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: URL must be a string";
      }
      const url = args[0] as string;

      return this.fetchHtml(url);
    },

    fetchMarkdown: async (...args: unknown[]): Promise<string> => {
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: URL must be a string";
      }
      const url = args[0] as string;

      return this.fetchMarkdown(url);
    },

    search: async (...args: unknown[]): Promise<string> => {
      if (args.length === 0 || typeof args[0] !== "string") {
        return "Error: Query must be a string";
      }
      const query = args[0] as string;
      const numResults = args.length > 1 && typeof args[1] === "number" ? args[1] : 5;

      return this.search(query, numResults);
    },
  };

  async restCall(
    url: string,
    method: string,
    headers: string = "{}",
    body: string = "",
  ): Promise<string> {
    try {
      infoPrefix("Tool:web", `Making ${method} request to: ${url}`);

      // Parse headers if provided
      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = JSON.parse(headers);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        return `Error parsing headers: ${errorMessage}`;
      }

      // Create request options
      const options: RequestInit = {
        method: method.toUpperCase(),
        headers: parsedHeaders,
      };

      // Add body for non-GET requests if provided
      if (method.toUpperCase() !== "GET" && body) {
        options.body = body;
      }

      // Make the request
      const response = await fetch(url, options);

      // Get response content type
      const contentType = response.headers.get("content-type") || "";

      // Parse response based on content type
      let responseData: string;
      if (contentType.includes("application/json")) {
        const jsonData = await response.json();
        responseData = JSON.stringify(jsonData, null, 2);
      } else {
        responseData = await response.text();
      }

      // Return response with status code
      return `Status: ${response.status} ${response.statusText}\n\n${responseData}`;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:web", `Error making request: ${errorMessage}`);
      return `Error making request: ${errorMessage}`;
    }
  }

  async fetchHtml(url: string): Promise<string> {
    try {
      infoPrefix("Tool:web", `Fetching HTML from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        return `Error fetching HTML: ${response.status} ${response.statusText}`;
      }

      const html = await response.text();
      return html;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:web", `Error fetching HTML: ${errorMessage}`);
      return `Error fetching HTML: ${errorMessage}`;
    }
  }

  async fetchMarkdown(url: string): Promise<string> {
    try {
      infoPrefix("Tool:web", `Fetching and converting to Markdown: ${url}`);

      // First fetch the HTML
      const response = await fetch(url);
      if (!response.ok) {
        return `Error fetching page: ${response.status} ${response.statusText}`;
      }

      const html = await response.text();

      // Basic HTML to Markdown conversion
      // This is a simple implementation - for production, consider using a proper HTML-to-Markdown library
      const markdown = html
        // Strip scripts, styles, and other non-content elements
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
        // Convert headings
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
        .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n")
        .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n")
        .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n")
        // Convert paragraphs
        .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
        // Convert bold and italic
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
        .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
        .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
        .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
        // Convert links
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
        // Convert lists
        .replace(
          /<ul[^>]*>(.*?)<\/ul>/gis,
          function (_match: string, content: string) {
            return content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
          },
        )
        .replace(
          /<ol[^>]*>(.*?)<\/ol>/gis,
          function (_match: string, content: string) {
            let index = 1;
            return content.replace(
              /<li[^>]*>(.*?)<\/li>/gi,
              function (_match: string, item: string) {
                return `${index++}. ${item}\n`;
              },
            );
          },
        )
        // Convert code blocks
        .replace(
          /<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis,
          "```\n$1\n```\n\n",
        )
        .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
        // Convert horizontal rules
        .replace(/<hr[^>]*>/gi, "\n---\n\n")
        // Remove remaining HTML tags
        .replace(/<[^>]*>/g, "")
        // Decode HTML entities
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Fix up multiple newlines
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .trim();

      return markdown;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      infoPrefix("Tool:web", `Error converting to Markdown: ${errorMessage}`);
      return `Error converting to Markdown: ${errorMessage}`;
    }
  }

  search(query: string, numResults: number = 5): string {
    try {
      return "Search functionality not implemented yet.";
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return `Error searching: ${errorMessage}`;
    }
  }
}

export const web = new WebTool();
