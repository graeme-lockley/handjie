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
   * @param modelName Optional model name for debugging purposes
   * @returns The parsed JSON object
   * @throws Error if the response cannot be parsed into valid JSON
   */
  public parse(modelName?: string): any {
    try {
      // First try direct JSON parsing (most common case)
      return JSON.parse(this.rawResponse);
    } catch (e) {
      // If direct parsing fails, try to extract JSON from markdown code blocks
      const extractedJsonResult = this.extractJsonFromMarkdown();
      if (extractedJsonResult && extractedJsonResult.jsonContent) {
        try {
          const parsedJson = JSON.parse(extractedJsonResult.jsonContent);
          
          // Add the text before and after the JSON block to the response if not already present
          if (extractedJsonResult.textBefore && !parsedJson.response) {
            parsedJson.response = { 
              message: extractedJsonResult.textBefore.trim() 
            };
          } else if (extractedJsonResult.textBefore && parsedJson.response && !parsedJson.response.message) {
            parsedJson.response.message = extractedJsonResult.textBefore.trim();
          } else if (extractedJsonResult.textBefore && parsedJson.response && parsedJson.response.message) {
            parsedJson.response.message = extractedJsonResult.textBefore.trim() + "\n" + parsedJson.response.message;
          }
          
          return parsedJson;
        } catch (innerError) {
          if (modelName) {
            debugPrefix(modelName, `Failed to parse extracted JSON content: ${innerError}`);
          }
          throw new Error(`Invalid JSON in code block: ${String(innerError)}`);
        }
      }
      
      // If it's a plain text response that's not JSON, wrap it in a response object
      return {
        response: {
          message: this.rawResponse
        }
      };
    }
  }
  
  /**
   * Extract JSON content from markdown code blocks (```json ... ```)
   * @returns Object containing the extracted JSON string and text before/after the block, or null if no valid JSON code block found
   */
  private extractJsonFromMarkdown(): { jsonContent: string; textBefore: string; textAfter: string } | null {
    // Try to find content inside ```json blocks
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const match = this.rawResponse.match(jsonBlockRegex);
    
    if (match && match[1]) {
      const fullMatch = match[0]; // The entire matched code block including the backticks
      const jsonContent = match[1].trim();
      
      // Find the index of the code block
      const blockStartIndex = this.rawResponse.indexOf(fullMatch);
      const blockEndIndex = blockStartIndex + fullMatch.length;
      
      // Extract text before and after the code block
      const textBefore = this.rawResponse.substring(0, blockStartIndex);
      const textAfter = this.rawResponse.substring(blockEndIndex);
      
      return { jsonContent, textBefore, textAfter };
    }
    
    return null;
  }
  
  /**
   * Check if the response indicates task completion
   * @returns true if the task is completed, false otherwise
   */
  public isTaskCompleted(): boolean {
    try {
      const parsed = this.parse();
      return Boolean(parsed.task_completed);
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Extract message content from the response if available
   * @returns Message string or null if no message found
   */
  public getResponseMessage(): string | null {
    try {
      const parsed = this.parse();
      return parsed?.response?.message || null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Extract tool usage information from the response
   * @returns Tool usage object or null if no tool usage found
   */
  public getToolUsage(): {
    identifier: string;
    function_name: string;
    args: any[];
  } | null {
    try {
      const parsed = this.parse();
      if (
        parsed.use_tool?.identifier != undefined &&
        parsed.use_tool.identifier !== ""
      ) {
        return {
          identifier: parsed.use_tool.identifier,
          function_name: parsed.use_tool.function_name,
          args: parsed.use_tool.args
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}