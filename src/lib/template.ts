import doT from "npm:dot";
import { dirname, fromFileUrl, join, resolve } from "https://deno.land/std/path/mod.ts";

/**
 * Get the path to the templates directory relative to this file
 * This makes template loading work regardless of the current working directory
 */
function getTemplatesDir(): string {
  // Get the directory where the current module (template.ts) is located
  const currentModuleUrl = import.meta.url;
  const currentModulePath = fromFileUrl(currentModuleUrl);
  const currentModuleDir = dirname(currentModulePath);

  // Templates are located at /src/templates relative to the lib directory
  // Go up one level from lib to src, then into templates
  return resolve(currentModuleDir, "..", "templates");
}

/**
 * Loads and renders a doT.js template with the provided data
 *
 * @param templateName - The name of the template file (without the .dot extension)
 * @param templateData - The data to render the template with
 * @param templateDir - Optional directory path for the template (defaults to src/templates relative to this file)
 * @returns The rendered template as a string
 */
export function renderTemplate(
  templateName: string,
  templateData: Record<string, unknown>,
  templateDir?: string,
): string {
  // Determine the template directory - use provided directory or calculate based on this file's location
  const templatesPath = templateDir || getTemplatesDir();
  const templatePath = join(templatesPath, `${templateName}.dot`);

  // Read the template file content
  const templateContent = Deno.readTextFileSync(templatePath);

  // Configure doT.js
  doT.templateSettings.strip = false;

  // Compile the template
  const templateFn = doT.template(templateContent);

  // Render the template with data
  return templateFn(templateData);
}
